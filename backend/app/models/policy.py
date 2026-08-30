import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class CommercePolicy(Base):
    __tablename__ = "commerce_policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    max_order_amount = Column(Integer, nullable=False)
    max_discount_percent = Column(Integer, nullable=False)
    require_confirmation_above = Column(Integer, nullable=False)
    allowed_currency = Column(String(3), nullable=False, default="INR")
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    merchant = relationship("Merchant", back_populates="policies")
