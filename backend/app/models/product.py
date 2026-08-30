from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)  # slug, e.g. "lenovo-loq-15"
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    sku = Column(String(50), nullable=False, unique=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)  # integer rupees
    currency = Column(String(3), nullable=False, default="INR")
    inventory = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    attributes = Column(JSON, nullable=True)  # e.g. {"ram": "16GB", "storage": "512GB SSD"}
    image_url = Column(Text, nullable=True)
    hero_image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    merchant = relationship("Merchant", back_populates="products")
