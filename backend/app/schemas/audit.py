from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    timestamp: datetime
    session_id: str
    order_id: Optional[str] = None
    actor: str
    event_type: str
    action: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    policy_result: Optional[str] = None
    result: str
    provider_event_id: Optional[str] = None

    class Config:
        from_attributes = True
