import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class OrderStatus(str, enum.Enum):
    CREATED = "CREATED"
    AUTHORIZATION_REQUIRED = "AUTHORIZATION_REQUIRED"
    AUTHORIZED = "AUTHORIZED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    UNKNOWN = "UNKNOWN"
    RECOVERY_REQUIRED = "RECOVERY_REQUIRED"


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, index=True, nullable=False)
    status = Column(String, nullable=False, default=OrderStatus.CREATED)
    amount = Column(Integer, nullable=False)  # in Rupees
    currency = Column(String, nullable=False, default="INR")
    
    # Razorpay fields
    provider_order_id = Column(String, nullable=True, unique=True, index=True)
    provider_payment_id = Column(String, nullable=True, unique=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    price_snapshot = Column(Integer, nullable=False)  # authoritative price in Rupees

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
