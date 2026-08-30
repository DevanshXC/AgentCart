import os
import sys
sys.path.append(os.path.abspath('backend'))

# Load environment manually to ensure we pick up the latest .env
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.services.payment import payment_service

try:
    rzp_order = payment_service.create_order(amount_in_rupees=64999, currency="INR", receipt="test_123")
    print("Success:", rzp_order)
except Exception as e:
    import traceback
    traceback.print_exc()
