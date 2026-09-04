import json
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


def _requirement_relevance_score(product: Product, active_requirements: list[str]) -> int:
    if not active_requirements:
        return 0
    haystack = _attribute_value_haystack(product)
    return sum(
        1
        for req in active_requirements
        for term in REQUIREMENT_VOCABULARY[req]
        if term in haystack
    )


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
