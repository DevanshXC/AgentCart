from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PolicyResponse(BaseModel):
    id: str
    merchant_id: str
    max_order_amount: int
    max_discount_percent: int
    require_confirmation_above: int
    allowed_currency: str
    active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
