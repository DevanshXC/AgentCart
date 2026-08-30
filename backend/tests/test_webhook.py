import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, Base
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
import pytest

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

@patch("app.services.payment.PaymentService.verify_webhook_signature")
def test_webhook_invalid_signature(mock_verify):
    mock_verify.return_value = False
    
    response = client.post(
        "/api/payments/webhook", 
        json={"event": "order.paid"},
        headers={"x-razorpay-signature": "bad_sig"}
    )
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid webhook signature"

@patch("app.services.payment.PaymentService.verify_webhook_signature")
def test_webhook_duplicate_idempotency(mock_verify, db_session):
    mock_verify.return_value = True
    
    from app.models.order import Order
    
    # Create a dummy order
    dummy_order = Order(session_id="test_sess", amount=100, provider_order_id="existing_order")
    db_session.add(dummy_order)
    db_session.commit()
    
    # Send webhook with a specific event ID
    payload = {
        "event": "order.paid",
        "payload": {"payment": {"entity": {"order_id": "existing_order", "id": "pay_123"}}}
    }
    
    response1 = client.post(
        "/api/payments/webhook",
        json=payload,
        headers={
            "x-razorpay-signature": "good_sig",
            "x-razorpay-event-id": "evt_12345"
        }
    )
    assert response1.status_code == 200
    assert response1.json()["status"] == "ok"
    
    # Send it again
    response2 = client.post(
        "/api/payments/webhook", 
        json=payload,
        headers={
            "x-razorpay-signature": "good_sig",
            "x-razorpay-event-id": "evt_12345"
        }
    )
    assert response2.status_code == 200
    assert response2.json()["message"] == "Duplicate event ignored"
