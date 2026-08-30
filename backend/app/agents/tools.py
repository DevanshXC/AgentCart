import json
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String
from app.models.product import Product
from app.models.policy import CommercePolicy
from app.schemas.product import ProductResponse
from app.services.catalog import search_products as catalog_search_products

def search_products(db: Session, query: str = None, category: str = None, min_price: int = None, max_price: int = None, in_stock: bool = None) -> dict:
    products = catalog_search_products(db, query=query, category=category, min_price=min_price, max_price=max_price, in_stock=in_stock)
    return {"products": [ProductResponse.model_validate(p).model_dump(mode="json") for p in products]}

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
