from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        session_id: str,
        actor: str,
        event_type: str,
        action: str,
        result: str,
        order_id: Optional[str] = None,
        input_data: Optional[Dict[str, Any]] = None,
        output_data: Optional[Dict[str, Any]] = None,
        policy_result: Optional[str] = None,
        provider_event_id: Optional[str] = None,
    ) -> AuditEvent:
        event = AuditEvent(
            session_id=session_id,
            actor=actor,
            event_type=event_type,
            action=action,
            result=result,
            order_id=order_id,
            input_data=input_data,
            output_data=output_data,
            policy_result=policy_result,
            provider_event_id=provider_event_id
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events_for_session(db: Session, session_id: str):
        return db.query(AuditEvent).filter(AuditEvent.session_id == session_id).order_by(AuditEvent.timestamp.desc()).all()

audit_service = AuditService()
