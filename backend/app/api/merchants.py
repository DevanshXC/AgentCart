from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.merchant import Merchant
from app.schemas.merchant import MerchantResponse

router = APIRouter(prefix="/api", tags=["merchants"])


@router.get("/merchant", response_model=MerchantResponse)
def get_merchant(db: Session = Depends(get_db)):
    """Return the demo merchant."""
    merchant = db.query(Merchant).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="No merchant found")
    return merchant
