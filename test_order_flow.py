import requests
import json

base_url = "http://127.0.0.1:8000/api/orders"

def test():
    # Request 1
    res1 = requests.post(f"{base_url}/preview", json={
        "session_id": "test_session_1",
        "items": [{"product_id": "ideapad-slim-5", "quantity": 1}]
    })
    order1 = res1.json()
    print("Order 1:", order1)
    
    # Request 2
    res2 = requests.post(f"{base_url}/preview", json={
        "session_id": "test_session_1",
        "items": [{"product_id": "ideapad-slim-5", "quantity": 1}]
    })
    order2 = res2.json()
    print("Order 2:", order2)
    
    # Authorize 1
    auth1 = requests.post(f"{base_url}/{order1['id']}/authorize")
    print("Auth 1 status:", auth1.status_code)
    print("Auth 1 response:", auth1.text)
    
    # Authorize 2
    auth2 = requests.post(f"{base_url}/{order2['id']}/authorize")
    print("Auth 2 status:", auth2.status_code)
    print("Auth 2 response:", auth2.text)

test()
