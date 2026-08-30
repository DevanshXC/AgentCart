import razorpay
client = razorpay.Client(auth=("rzp_test_xxxxxx", "secret_xxxxxx"))
try:
    client.order.create(data={"amount": 100, "currency": "INR", "receipt": "test"})
except Exception as e:
    import traceback
    traceback.print_exc()
