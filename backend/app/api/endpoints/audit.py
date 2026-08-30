from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.audit import AuditEventResponse
from app.services.audit import audit_service

router = APIRouter()

@router.get("/{session_id}", response_model=List[AuditEventResponse])
def get_audit_trail(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the audit trail for a given session.
    """
    events = audit_service.get_events_for_session(db, session_id)
    return events
