import requests
import json
import uuid

base_url = "http://127.0.0.1:8000"

def test_order():
    session_id = str(uuid.uuid4())
    
    # 1. Preview order
    preview_payload = {
        "items": [{"product_id": "lenovo-loq-15", "quantity": 1}],
        "session_id": session_id
    }
    
    print("Sending preview request...")
    res = requests.post(f"{base_url}/api/orders/preview", json=preview_payload)
    if not res.ok:
        print("Preview failed:", res.text)
        return
        
    preview_data = res.json()
    order_id = preview_data['id']
    print("Preview successful, order ID:", order_id)
    
    # 2. Authorize order
    print("Sending authorize request...")
    auth_res = requests.post(f"{base_url}/api/orders/{order_id}/authorize")
    if not auth_res.ok:
        print("Authorize failed:", auth_res.text)
        return
        
    auth_data = auth_res.json()
    print("Authorize response JSON:")
    print(json.dumps(auth_data, indent=2))
    
if __name__ == "__main__":
    test_order()
