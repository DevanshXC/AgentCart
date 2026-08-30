import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON

from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    session_id = Column(String, index=True, nullable=False)
    order_id = Column(String, nullable=True, index=True)
    
    actor = Column(String, nullable=False)  # SYSTEM, USER, LLM, RAZORPAY
    event_type = Column(String, nullable=False) 
    action = Column(String, nullable=False)
    
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    
    policy_result = Column(String, nullable=True)
    result = Column(String, nullable=False)  # SUCCESS, FAILURE, ERROR
    
    provider_event_id = Column(String, nullable=True, unique=True, index=True)  # e.g., x-razorpay-event-id
