import json
import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String
from app.models.product import Product
from app.models.policy import CommercePolicy
from app.schemas.product import ProductResponse
from app.services.catalog import search_products as catalog_search_products

# Feeding every matched product into the LLM's context (e.g. 15 full
# products, ~10-13KB) reliably causes the second Ollama turn to time out or
# produce malformed/hallucinated output. Catalog retrieval/ranking above is
# untouched; only the slice handed to the LLM is capped, preserving order.
MAX_PRODUCTS_TO_LLM = 5

# Small, deterministic, closed vocabulary mapping a user requirement to the
# terms that indicate a candidate actually satisfies it. Used both to detect
# whether a search query names a recognized requirement, and to score how
# strongly each candidate's own text supports it. Intentionally not
# exhaustive or NLP-driven -- unrecognized requirements simply fall back to
# the existing ranking (see _rank_by_requirement_relevance below).
REQUIREMENT_VOCABULARY: dict[str, list[str]] = {
    "camera": [
        "camera", "megapixel", "mp", "ois", "optical", "leica", "hasselblad",
        "computational photography", "photography", "zoom", "lens",
    ],
    "performance": [
        "performance", "processor", "chipset", "cpu", "gpu", "snapdragon",
        "dimensity", "tensor", "core", "ryzen", "intel", "flagship",
    ],
    "gaming": [
        "gaming", "gpu", "rtx", "gtx", "refresh rate", "fps",
    ],
    "battery": [
        "battery", "battery life", "mah",
    ],
    "display": [
        "display", "screen", "oled", "amoled", "resolution", "refresh rate",
    ],
    "audio": [
        "headphones", "earbuds", "anc", "noise cancellation", "microphone", "bass",
    ],
    "portability": [
        "lightweight", "portable", "weight", "thin", "compact", "slim",
    ],
}


def _detect_requirements(query: str) -> list[str]:
    """Which recognized requirements (if any) does the search query name?"""
    if not query:
        return []
    q = query.lower()
    return [req for req, terms in REQUIREMENT_VOCABULARY.items() if any(t in q for t in terms)]


def _attribute_value_haystack(product: Product) -> str:
    """
    Text to score requirement relevance against: name, description, and the
    VALUES of the attributes dict -- deliberately never the attribute KEYS.
    Scoring against key names (e.g. every product having a "camera" key,
    regardless of how good that camera actually is) is exactly the false
    positive this layer exists to avoid.
    """
    parts = [product.name or "", product.description or ""]
    if product.attributes:
        parts.extend(str(v) for v in product.attributes.values())
    return " ".join(parts).lower()


# ── Requirement-specific scoring helpers ─────────────────────────────────
#
# Each scorer receives the lowercased attribute-value haystack (and optionally
# the raw attributes dict) and returns a float score.  Higher = better match
# for the stated requirement.  Scores are summed across active requirements
# for multi-requirement queries; price is the tiebreaker only.
#
# All logic is deterministic -- regex + lookup tables, no ML/embeddings.

_MP_PATTERN = re.compile(r"(\d+)\s*mp", re.IGNORECASE)
_MAH_PATTERN = re.compile(r"(\d+)\s*mah", re.IGNORECASE)
_HZ_PATTERN = re.compile(r"(\d+)\s*hz", re.IGNORECASE)
_WATT_PATTERN = re.compile(r"(\d+)\s*w", re.IGNORECASE)
_HOURS_PATTERN = re.compile(r"(\d+)\s*hour", re.IGNORECASE)
_RAM_GB_PATTERN = re.compile(r"(\d+)\s*gb", re.IGNORECASE)


def _score_camera(haystack: str) -> float:
    """Score camera quality from attribute values.

    Components (additive):
    - megapixel count:  min(10.0, mp / 10)  (Capped at 10 to prevent 200MP from overpowering OIS/Telephoto)
    - OIS:              +5
    - telephoto:        +4
    - optical zoom:     +4  (or +2 for generic 'zoom' mention)
    - ultrawide:        +2
    - periscope:        +5
    - computational photography / AI: +3
    - Leica/Hasselblad/Zeiss brand tuning: +6
    - triple/quad camera system: +3 / +4
    """
    score = 0.0

    mp_match = _MP_PATTERN.search(haystack)
    if mp_match:
        # Cap MP contribution at 10.0 so massive numbers (like 200MP) don't dominate real features
        score += min(10.0, int(mp_match.group(1)) / 10.0)

    if "ois" in haystack:
        score += 5.0
    if "telephoto" in haystack:
        score += 4.0
    if ("optical zoom" in haystack or "optical" in haystack) and "0x optical" not in haystack:
        score += 4.0
    elif "zoom" in haystack and "0x optical" not in haystack:
        score += 2.0
    if "ultrawide" in haystack:
        score += 2.0
    if "periscope" in haystack:
        score += 5.0
    if "computational photography" in haystack or "computational" in haystack:
        score += 3.0
    if " ai " in haystack or "ai-" in haystack or haystack.startswith("ai "):
        score += 1.0
    if "leica" in haystack:
        score += 6.0
    if "hasselblad" in haystack:
        score += 6.0
    if "zeiss" in haystack:
        score += 6.0
    if "quad" in haystack:
        score += 4.0
    elif "triple" in haystack:
        score += 3.0
    elif "dual" in haystack:
        score += 1.0

    return score


# Known processor tiers — higher value = stronger processor.
_PROCESSOR_TIERS: dict[str, float] = {
    # Flagship mobile
    "snapdragon 8 gen 3": 20, "snapdragon 8 gen 2": 18, "snapdragon 8 gen 1": 16,
    "snapdragon 888": 14, "dimensity 9300": 20, "dimensity 9200": 18,
    "a17 pro": 20, "a17": 19, "a16 bionic": 17, "a16": 17,
    "a15 bionic": 15, "a15": 15,
    "google tensor g3": 16, "tensor g3": 16, "tensor g2": 14,
    # Apple silicon (laptop/desktop)
    "apple m3 pro": 22, "m3 pro": 22, "apple m3": 20, "m3": 18,
    "apple m2": 17, "m2": 15, "apple m1": 14, "m1": 12,
    # Upper mid-range mobile
    "snapdragon 7 gen 3": 11, "snapdragon 7s gen 2": 10,
    "dimensity 8300": 12, "dimensity 8200": 11,
    "exynos 2400": 15, "exynos 2200": 13,
    # Mid-range mobile
    "exynos 1480": 9, "exynos 1330": 7, "dimensity 6300": 6,
    # Laptop — Intel H/HX (high-perf) series
    "i9-13900": 22, "i7-13700h": 19, "i7-13650hx": 19, "i7-13620h": 17,
    "i5-13500h": 15, "i5-1235u": 12, "i5-1335u": 12,
    "i7-1355u": 14, "i7-1255u": 13, "i3-1215u": 8, "i3-1315u": 8,
    # Laptop — AMD
    "ryzen 9": 22, "ryzen 7 7840hs": 19, "ryzen 7 7640hs": 17,
    "ryzen 7": 17, "ryzen 5 7640hs": 15, "ryzen 5": 14, "ryzen 3": 10,
}

# Known GPU tiers — higher = more powerful dedicated graphics.
_GPU_TIERS: dict[str, float] = {
    "rtx 4090": 30, "rtx 4080": 27, "rtx 4070": 24,
    "rtx 4060": 20, "rtx 4050": 17,
    "rtx 3080": 22, "rtx 3070": 19, "rtx 3060": 16, "rtx 3050": 13,
    "gtx 1660": 11, "gtx 1650": 9, "gtx 1050": 7,
    "adreno 750": 14, "adreno 740": 12, "adreno 730": 10,
    "mali-g720": 10, "mali-g710": 9,
    "14-core gpu": 16, "10-core gpu": 13, "8-core gpu": 10,  # Apple
    "iris xe": 4, "intel iris xe": 4, "intel uhd": 2,
    "integrated": 1,
}


def _lookup_tier(haystack: str, tier_table: dict[str, float]) -> float:
    """Find the highest-scoring tier match in the haystack."""
    best = 0.0
    for name, value in tier_table.items():
        if name in haystack and value > best:
            best = value
    return best


def _parse_ram_gb(haystack: str) -> float:
    """Extract RAM in GB from attribute text."""
    match = _RAM_GB_PATTERN.search(haystack)
    if match:
        val = int(match.group(1))
        # Sanity: RAM values for phones/laptops are typically 2-128GB.
        if val <= 256:
            return float(val)
    return 0.0


def _score_performance(haystack: str, attrs: dict) -> float:
    """Score performance from processor tier, GPU tier, and RAM.

    Components:
    - Processor tier:  lookup against _PROCESSOR_TIERS
    - GPU tier:        lookup against _GPU_TIERS  (scaled ×0.5)
    - RAM:             GB value (8GB → 8)
    """
    # Build a focused haystack from performance-relevant attributes.
    perf_parts = [haystack]
    for key in ("chipset", "processor", "cpu", "gpu", "ram"):
        if key in attrs:
            perf_parts.append(str(attrs[key]).lower())
    perf_haystack = " ".join(perf_parts)

    proc_score = _lookup_tier(perf_haystack, _PROCESSOR_TIERS)
    gpu_score = _lookup_tier(perf_haystack, _GPU_TIERS) * 0.5
    ram_score = _parse_ram_gb(perf_haystack)
    return proc_score + gpu_score + ram_score


def _score_gaming(haystack: str, attrs: dict) -> float:
    """Score gaming suitability from GPU tier, refresh rate, and keywords.

    Components:
    - GPU tier:        lookup against _GPU_TIERS  (primary signal)
    - Refresh rate:    Hz / 10  (144Hz → 14.4, 60Hz → 6)
    - Processor tier:  scaled ×0.3
    - 'gaming' keyword in description/name: +5
    """
    gaming_parts = [haystack]
    for key in ("gpu", "processor", "chipset", "display", "refresh_rate"):
        if key in attrs:
            gaming_parts.append(str(attrs[key]).lower())
    gaming_haystack = " ".join(gaming_parts)

    score = _lookup_tier(gaming_haystack, _GPU_TIERS)
    hz_match = _HZ_PATTERN.search(gaming_haystack)
    if hz_match:
        score += int(hz_match.group(1)) / 10.0
    score += _lookup_tier(gaming_haystack, _PROCESSOR_TIERS) * 0.3
    if "gaming" in gaming_haystack:
        score += 5.0
    return score


def _score_battery(haystack: str, attrs: dict) -> float:
    """Score battery from capacity, stated life, and fast-charging.

    Components:
    - mAh capacity:    mAh / 500  (7000mAh → 14, 3349mAh → 6.7)
    - Battery life hours: hours  (18h → 18)
    - Fast charging:   +3 for any mention; +wattage/20 if parseable
    """
    batt_parts = [haystack]
    for key in ("battery", "battery_life", "charging"):
        if key in attrs:
            batt_parts.append(str(attrs[key]).lower())
    batt_haystack = " ".join(batt_parts)

    score = 0.0
    mah_match = _MAH_PATTERN.search(batt_haystack)
    if mah_match:
        score += int(mah_match.group(1)) / 500.0

    hours_match = _HOURS_PATTERN.search(batt_haystack)
    if hours_match:
        score += int(hours_match.group(1))

    if "fast charg" in batt_haystack:
        score += 3.0
        watt_match = _WATT_PATTERN.search(batt_haystack)
        if watt_match:
            score += int(watt_match.group(1)) / 20.0

    return score


def _score_display(haystack: str, attrs: dict) -> float:
    """Score display quality from panel tech, refresh rate, resolution, HDR.

    Components:
    - OLED/AMOLED:     +10
    - LTPO:            +3
    - Refresh rate:    Hz / 10  (120Hz → 12)
    - Resolution tier: 4K → +15, QHD/2K → +10, FHD → +5
    - HDR:             +4  (HDR400/10/etc. all count)
    - Retina / XDR:    +8
    - ProMotion:       +5
    """
    disp_parts = [haystack]
    for key in ("display", "panel", "resolution", "refresh_rate", "hdr", "screen"):
        if key in attrs:
            disp_parts.append(str(attrs[key]).lower())
    disp_haystack = " ".join(disp_parts)

    score = 0.0
    if "oled" in disp_haystack or "amoled" in disp_haystack:
        score += 10.0
    if "ltpo" in disp_haystack:
        score += 3.0

    hz_match = _HZ_PATTERN.search(disp_haystack)
    if hz_match:
        score += int(hz_match.group(1)) / 10.0

    if "4k" in disp_haystack or "3840" in disp_haystack or "2160" in disp_haystack:
        score += 15.0
    elif "qhd" in disp_haystack or "2k" in disp_haystack or "1440" in disp_haystack or "3.5k" in disp_haystack:
        score += 10.0
    elif "fhd" in disp_haystack or "1080" in disp_haystack:
        score += 5.0

    if "hdr" in disp_haystack:
        score += 4.0
    if "retina" in disp_haystack or "xdr" in disp_haystack:
        score += 8.0
    if "promotion" in disp_haystack:
        score += 5.0

    return score


# Dispatcher table:  requirement name → scorer function.
# Scorers not listed here fall back to the legacy keyword-count method.
_REQUIREMENT_SCORERS: dict[str, callable] = {
    "camera": lambda h, a: _score_camera(h),
    "performance": _score_performance,
    "gaming": _score_gaming,
    "battery": _score_battery,
    "display": _score_display,
}


def _keyword_count_fallback(haystack: str, requirement: str) -> float:
    """Legacy keyword-count scoring for requirements without a dedicated
    scorer (e.g. audio, portability).  Counts how many vocabulary terms
    appear in the haystack — the original behaviour preserved as-is."""
    return float(sum(1 for term in REQUIREMENT_VOCABULARY[requirement] if term in haystack))


def _requirement_relevance_score(product: Product, active_requirements: list[str]) -> float:
    """Score a product against one or more active requirements.

    For requirements with a dedicated scorer (camera, performance, gaming,
    battery, display), the scorer parses actual attribute values and returns
    a quality-based score.  For others, the original keyword-count fallback
    is used.  Scores are summed across all active requirements.
    """
    if not active_requirements:
        return 0.0
    haystack = _attribute_value_haystack(product)
    attrs = product.attributes or {}
    total = 0.0
    for req in active_requirements:
        scorer = _REQUIREMENT_SCORERS.get(req)
        if scorer:
            total += scorer(haystack, attrs)
        else:
            total += _keyword_count_fallback(haystack, req)
    return total


def _rank_by_requirement_relevance(products: list[Product], query: Optional[str]) -> list[Product]:
    """
    Re-rank an already-filtered candidate list by how strongly each
    product's own attribute values support the requirement(s) named in the
    query, price as the tiebreaker only. If the query names no recognized
    requirement, the input order (existing catalog ranking) is returned
    unchanged -- this layer never invents a preference.
    """
    active_requirements = _detect_requirements(query or "")
    if not active_requirements:
        return products
    return sorted(
        products,
        key=lambda p: (-_requirement_relevance_score(p, active_requirements), p.price),
    )


def search_products(db: Session, query: str = None, category: str = None, min_price: int = None, max_price: int = None, in_stock: bool = None) -> dict:
    products = catalog_search_products(db, query=query, category=category, min_price=min_price, max_price=max_price, in_stock=in_stock)
    ranked_products = _rank_by_requirement_relevance(products, query)
    top_products = ranked_products[:MAX_PRODUCTS_TO_LLM]
    return {"products": [ProductResponse.model_validate(p).model_dump(mode="json") for p in top_products]}

def get_product(db: Session, product_id: str) -> dict:
    product = db.query(Product).filter(Product.id == product_id, Product.active == True).first()
    if not product:
        return {"error": "Product not found"}
    return ProductResponse.model_validate(product).model_dump(mode="json")

def check_inventory(db: Session, product_id: str) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}
    return {
        "product_id": product.id,
        "inventory": product.inventory,
        "in_stock": product.inventory > 0
    }

def get_policy(db: Session) -> dict:
    policy = db.query(CommercePolicy).filter(CommercePolicy.active == True).first()
    if not policy:
        return {"error": "No active policy"}
    return {
        "max_order_amount": policy.max_order_amount,
        "max_discount_percent": policy.max_discount_percent,
        "require_confirmation_above": policy.require_confirmation_above,
        "allowed_currency": policy.allowed_currency
    }

def compare_products(db: Session, product_ids: list[str]) -> dict:
    products = db.query(Product).filter(Product.id.in_(product_ids), Product.active == True).all()
    results = []
    for p in products:
        results.append({
            "product_id": p.id,
            "name": p.name,
            "price": p.price,
            "inventory": p.inventory,
            "attributes": p.attributes
        })
    return {"comparisons": results}

TOOL_REGISTRY = {
    "search_products": search_products,
    "get_product": get_product,
    "check_inventory": check_inventory,
    "get_policy": get_policy,
    "compare_products": compare_products
}
