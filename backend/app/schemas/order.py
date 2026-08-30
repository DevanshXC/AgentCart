from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.order import OrderStatus


class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = 1


class OrderItemResponse(OrderItemBase):
    id: str
    price_snapshot: int

    class Config:
        from_attributes = True


class OrderCreateRequest(BaseModel):
    items: List[OrderItemBase]
    session_id: str


class OrderPreviewResponse(BaseModel):
    id: str
    session_id: str
    status: OrderStatus
    amount: int
    currency: str
    items: List[OrderItemResponse]
    policy_result: Optional[str] = None
    
    class Config:
        from_attributes = True


class OrderResponse(OrderPreviewResponse):
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
