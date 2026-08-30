from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MerchantResponse(BaseModel):
    id: str
    name: str
    currency: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
