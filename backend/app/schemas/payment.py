from pydantic import BaseModel
from typing import Dict, Any, Optional

class WebhookResponse(BaseModel):
    status: str

class PaymentVerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class PaymentVerifyResponse(BaseModel):
    status: str
    order_id: Optional[str] = None
    message: Optional[str] = None

class ReconcileRequest(BaseModel):
    order_id: str

class ReconcileResponse(BaseModel):
    status: str
    order_id: str
    previous_state: str
    new_state: str
