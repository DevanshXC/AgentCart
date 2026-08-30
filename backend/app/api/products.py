from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductResponse, InventoryResponse
from app.services.catalog import search_products

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/products", response_model=list[ProductResponse])
def list_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """List all active products, optionally filtered by category."""
    query = db.query(Product).filter(Product.active == True)
    if category:
        query = query.filter(Product.category == category.lower())
    return query.order_by(Product.price.asc()).all()


@router.get("/products/search", response_model=list[ProductResponse])
def search(
    query: Optional[str] = Query(None, description="Search keywords"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[int] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[int] = Query(None, ge=0, description="Maximum price"),
    in_stock: Optional[bool] = Query(None, description="Filter by stock availability"),
    db: Session = Depends(get_db),
):
    """Search products with keyword matching and filters."""
    return search_products(
        db,
        query=query,
        category=category,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by ID."""
    product = db.query(Product).filter(Product.id == product_id, Product.active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{product_id}/inventory", response_model=InventoryResponse)
def get_inventory(product_id: str, db: Session = Depends(get_db)):
    """Get current inventory for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return InventoryResponse(
        product_id=product.id,
        inventory=product.inventory,
        in_stock=product.inventory > 0,
    )
