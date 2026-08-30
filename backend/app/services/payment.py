import hmac
import hashlib
import razorpay
from typing import Dict, Any, Optional
from app.config import get_settings

settings = get_settings()

class PaymentService:
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
        )

    def rupees_to_paise(self, amount_in_rupees: int) -> int:
        """Converts integer Rupees to integer Paise (subunits) for Razorpay."""
        return amount_in_rupees * 100

    def create_order(self, amount_in_rupees: int, currency: str = "INR", receipt: str = None) -> Dict[str, Any]:
        """Creates an order in Razorpay using the SDK."""
        amount_in_paise = self.rupees_to_paise(amount_in_rupees)
        
        data = {
            "amount": amount_in_paise,
            "currency": currency,
            "receipt": receipt
        }
        return self.client.order.create(data=data)
    def fetch_order(self, provider_order_id: str) -> Dict[str, Any]:
        """Fetches the state of a Razorpay order directly from the provider."""
        return self.client.order.fetch(provider_order_id)
        
    def verify_checkout_signature(self, razorpay_order_id: str, razorpay_payment_id: str, signature: str) -> bool:
        """Verifies the signature returned by Razorpay Checkout."""
        try:
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': signature
            }
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        """Verifies the HMAC-SHA256 webhook signature against the raw body."""
        secret = settings.razorpay_webhook_secret
        if not secret:
            return False
            
        try:
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception:
            return False

payment_service = PaymentService()
