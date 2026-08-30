from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.policy import CommercePolicy
from app.schemas.policy import PolicyResponse

router = APIRouter(prefix="/api", tags=["policies"])


@router.get("/policy", response_model=PolicyResponse)
def get_policy(db: Session = Depends(get_db)):
    """Return the active commerce policy for the demo merchant."""
    policy = db.query(CommercePolicy).filter(CommercePolicy.active == True).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")
    return policy
