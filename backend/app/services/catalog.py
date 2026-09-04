from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String
from typing import Optional

from app.models.product import Product


# Deterministic, closed-set category alias resolution. This must never grow
# into fuzzy/similarity matching — unknown values simply pass through
# unchanged (lowercased/stripped), so existing exact-match behavior for
# already-valid category strings is untouched.
CATEGORY_ALIASES: dict[str, str] = {
    "smart home": "smart-home",
    "smarthome": "smart-home",
    "headphones": "audio",
    "headphone": "audio",
    "earbuds": "audio",
    "earbud": "audio",
    "phone": "smartphone",
    "phones": "smartphone",
    "mobile": "smartphone",
    "notebook": "laptop",
    "laptops": "laptop",
    "display": "monitor",
    "monitors": "monitor",
    "watch": "smartwatch",
    "smartwatches": "smartwatch",
    "console": "gaming",
    "controller": "gaming",
    "controllers": "gaming",
    "cameras": "camera",
    "accessories": "accessory",
}


def normalize_category(raw: str) -> str:
    """
    Resolve a category alias to its canonical catalog value. Applied only at
    the category-filter boundary in search_products(), so it protects every
    caller (the AI agent's tool and the plain HTTP search endpoint alike)
    without touching how categories are stored or displayed.
    """
    key = raw.strip().lower()
    return CATEGORY_ALIASES.get(key, key)


def _keyword_haystack(product: Product) -> str:
    return " ".join(filter(None, [
        product.name,
        product.description,
        product.category,
        str(product.attributes) if product.attributes else "",
    ])).lower()


def search_products(
    db: Session,
    *,
    query: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    in_stock: Optional[bool] = None,
) -> list[Product]:
    """
    Deterministic product search with keyword matching and filters.
    No LLM involved — this is called by the AI agent as a tool.
    """
    base_filters = [Product.active == True]

    # Category filter — normalized through the closed alias table above.
    if category:
        base_filters.append(Product.category == normalize_category(category))

    # Price range filters
    if min_price is not None:
        base_filters.append(Product.price >= min_price)
    if max_price is not None:
        base_filters.append(Product.price <= max_price)

    # Inventory filter
    if in_stock is True:
        base_filters.append(Product.inventory > 0)
    elif in_stock is False:
        base_filters.append(Product.inventory == 0)

    # Keyword matching across name, description, category, and attributes
    terms: list[str] = query.lower().split() if query else []
    keyword_conditions = []
    for term in terms:
        pattern = f"%{term}%"
        keyword_conditions.append(or_(
            Product.name.ilike(pattern),
            Product.description.ilike(pattern),
            Product.category.ilike(pattern),
            # Search within JSONB attributes by casting to text
            cast(Product.attributes, String).ilike(pattern),
        ))

    if not keyword_conditions:
        return db.query(Product).filter(and_(*base_filters)).order_by(Product.price.asc()).all()

    # Precise pass: every term must match somewhere (existing behavior,
    # unchanged for anything that already works today).
    and_query = db.query(Product).filter(and_(*base_filters, and_(*keyword_conditions)))
    results = and_query.order_by(Product.price.asc()).all()
    if results or len(keyword_conditions) <= 1:
        return results

    # Zero-result fallback, only for multi-keyword queries: a valid product
    # matching some of the terms beats returning nothing. Ranked by how many
    # terms actually matched (plain Python counting — no scoring model, no
    # embeddings), price as the tiebreaker.
    or_query = db.query(Product).filter(and_(*base_filters, or_(*keyword_conditions)))
    fallback_results = or_query.all()

    def match_count(product: Product) -> int:
        haystack = _keyword_haystack(product)
        return sum(1 for term in terms if term in haystack)

    fallback_results.sort(key=lambda p: (-match_count(p), p.price))
    return fallback_results
