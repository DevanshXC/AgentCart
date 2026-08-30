from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String
from typing import Optional

from app.models.product import Product


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
    No LLM involved — this will be called by the AI agent as a tool later.
    """
    filters = [Product.active == True]

    # Category filter
    if category:
        filters.append(Product.category == category.lower())

    # Price range filters
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)

    # Inventory filter
    if in_stock is True:
        filters.append(Product.inventory > 0)
    elif in_stock is False:
        filters.append(Product.inventory == 0)

    # Keyword matching across name, description, category
    if query:
        terms = query.lower().split()
        keyword_conditions = []
        for term in terms:
            pattern = f"%{term}%"
            term_match = or_(
                Product.name.ilike(pattern),
                Product.description.ilike(pattern),
                Product.category.ilike(pattern),
                # Search within JSONB attributes by casting to text
                cast(Product.attributes, String).ilike(pattern),
            )
            keyword_conditions.append(term_match)
        # All terms must match somewhere (AND logic for multi-word queries)
        if keyword_conditions:
            filters.append(and_(*keyword_conditions))

    return db.query(Product).filter(and_(*filters)).order_by(Product.price.asc()).all()
