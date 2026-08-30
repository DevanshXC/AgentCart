import pytest
from app.services.payment import PaymentService

def test_rupees_to_paise():
    svc = PaymentService()
    assert svc.rupees_to_paise(100) == 10000
    assert svc.rupees_to_paise(69990) == 6999000
    assert svc.rupees_to_paise(0) == 0

def test_verify_checkout_signature_invalid():
    svc = PaymentService()
    # Assuming invalid signature format or mismatch
    is_valid = svc.verify_checkout_signature(
        razorpay_order_id="order_xxx",
        razorpay_payment_id="pay_xxx",
        signature="invalid_signature"
    )
    assert is_valid is False

def test_verify_webhook_signature_invalid():
    svc = PaymentService()
    # It relies on settings.razorpay_webhook_secret which might not be set or set to dummy in tests
    # But invalid should fail regardless
    is_valid = svc.verify_webhook_signature(
        raw_body=b'{"event":"order.paid"}',
        signature="invalid_hmac"
    )
    assert is_valid is False
