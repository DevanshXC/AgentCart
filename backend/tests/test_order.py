import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, Base
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderCreateRequest, OrderItemBase
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    from app.models.merchant import Merchant
    from app.models.policy import CommercePolicy
    db = TestSessionLocal()
    if not db.query(Merchant).filter_by(id="test-merchant-001").first():
        db.add(Merchant(id="test-merchant-001", name="AgentCart Demo Merchant", currency="INR"))
        db.add(Product(
            id="lenovo-loq-15", merchant_id="test-merchant-001", sku="LAP-001",
            name="Lenovo LOQ 15", category="laptop", price=64999, currency="INR", inventory=12, active=True
        ))
        db.add(CommercePolicy(
            merchant_id="test-merchant-001", max_order_amount=70000, max_discount_percent=10,
            require_confirmation_above=25000, allowed_currency="INR", active=True
        ))
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@patch("app.services.payment.PaymentService.create_order")
def test_order_preview_and_authorize(mock_create_order, db_session: Session):
    # Setup dummy product if not exists
    # We assume seed.py has run, so 'lenovo-loq-15' should be present
    product = db_session.query(Product).filter(Product.id == "lenovo-loq-15").first()
    if not product:
        pytest.skip("Seed data not present")
        
    initial_inventory = product.inventory
    
    # 1. Preview Order
    response = client.post("/api/orders/preview", json={
        "session_id": "test_session_1",
        "items": [{"product_id": "lenovo-loq-15", "quantity": 1}]
    })
    
    assert response.status_code == 200
    order_data = response.json()
    assert order_data["status"] == "AUTHORIZATION_REQUIRED"
    assert order_data["amount"] == product.price
    order_id = order_data["id"]
    
    # Check inventory hasn't changed
    db_session.refresh(product)
    assert product.inventory == initial_inventory
    
    # 2. Authorize Order
    mock_create_order.return_value = {"id": "order_mocked_123"}
    
    auth_response = client.post(f"/api/orders/{order_id}/authorize")
    assert auth_response.status_code == 200
    auth_data = auth_response.json()
    assert auth_data["status"] == "PAYMENT_PENDING"
    assert auth_data["provider_order_id"] == "order_mocked_123"
    
    # Check inventory is decremented
    db_session.refresh(product)
    assert product.inventory == initial_inventory - 1
    
    # 3. Idempotency test
    # Authorizing again should return the same without hitting Razorpay or inventory
    auth_response_2 = client.post(f"/api/orders/{order_id}/authorize")
    assert auth_response_2.status_code == 200
    assert auth_response_2.json()["provider_order_id"] == "order_mocked_123"
    
    db_session.refresh(product)
    assert product.inventory == initial_inventory - 1  # Still -1
