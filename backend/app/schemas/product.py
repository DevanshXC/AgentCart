from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class ProductResponse(BaseModel):
    id: str
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    price: int
    currency: str
    inventory: int
    active: bool
    attributes: Optional[dict[str, Any]] = None
    image_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InventoryResponse(BaseModel):
    product_id: str
    inventory: int
    in_stock: bool
