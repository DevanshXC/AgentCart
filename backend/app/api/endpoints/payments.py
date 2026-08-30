import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.payment import PaymentVerifyRequest, PaymentVerifyResponse, ReconcileRequest, ReconcileResponse
from app.services.payment import payment_service
from app.services.audit import audit_service
from app.models.order import Order, OrderStatus
from app.models.audit import AuditEvent

router = APIRouter()

@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(req: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies the Razorpay Checkout signature.
    """
    order = db.query(Order).filter(Order.provider_order_id == req.razorpay_order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    is_valid = payment_service.verify_checkout_signature(
        req.razorpay_order_id,
        req.razorpay_payment_id,
        req.razorpay_signature
    )
    
    if not is_valid:
        audit_service.log_event(
            db=db,
            session_id=order.session_id,
            actor="SYSTEM",
            event_type="PAYMENT_VERIFY",
            action="CHECKOUT_SIGNATURE_VERIFY",
            result="FAILURE",
            order_id=order.id
        )
        raise HTTPException(status_code=400, detail="Invalid payment signature")
        
    # Valid signature. We can optimistically mark as PAID, or just wait for Webhook.
    # Let's mark as PAID if it's currently PENDING.
    if order.status in [OrderStatus.PAYMENT_PENDING, OrderStatus.UNKNOWN, OrderStatus.RECOVERY_REQUIRED]:
        order.status = OrderStatus.PAID
        order.provider_payment_id = req.razorpay_payment_id
        db.commit()
        
    audit_service.log_event(
        db=db,
        session_id=order.session_id,
        actor="SYSTEM",
        event_type="PAYMENT_VERIFY",
        action="CHECKOUT_SIGNATURE_VERIFY",
        result="SUCCESS",
        order_id=order.id
    )
    
    return PaymentVerifyResponse(status="success", order_id=order.id, message="Payment verified")

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles Razorpay webhooks authoritatively.
    Requires raw request body for HMAC verification.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    
    # 1. Verify signature using raw body
    if not payment_service.verify_webhook_signature(raw_body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
    # 2. Parse JSON
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    event_id = request.headers.get("x-razorpay-event-id", payload.get("id", ""))
    event_type = payload.get("event")
    
    # 3. Idempotency check
    existing_audit = db.query(AuditEvent).filter(AuditEvent.provider_event_id == event_id).first()
    if existing_audit:
        return {"status": "ok", "message": "Duplicate event ignored"}

    # Find order
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    provider_order_id = payment_entity.get("order_id")
    
    order = db.query(Order).filter(Order.provider_order_id == provider_order_id).first()
    if not order:
        # We don't have this order. Ignore gracefully.
        return {"status": "ok", "message": "Order not found"}
        
    # 4. State transitions (Out-of-order safe)
    if event_type == "order.paid" or event_type == "payment.captured":
        if order.status != OrderStatus.PAID:
            order.status = OrderStatus.PAID
            order.provider_payment_id = payment_entity.get("id")
            
    elif event_type == "payment.failed":
        if order.status != OrderStatus.PAID:
            order.status = OrderStatus.PAYMENT_FAILED

    db.commit()
    
    audit_service.log_event(
        db=db,
        session_id=order.session_id,
        actor="RAZORPAY",
        event_type="WEBHOOK_RECEIVED",
        action=event_type,
        result="SUCCESS",
        order_id=order.id,
        input_data={"event": event_type, "payment_id": payment_entity.get("id")},
        provider_event_id=event_id
    )

    return {"status": "ok"}

@router.post("/reconcile", response_model=ReconcileResponse)
def reconcile_payment(req: ReconcileRequest, db: Session = Depends(get_db)):
    """
    Reconciles an UNKNOWN/RECOVERY_REQUIRED state by checking Razorpay directly.
    """
    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if not order.provider_order_id:
        raise HTTPException(status_code=400, detail="Order has no provider ID to reconcile")
        
    previous_state = order.status
    
    try:
        rzp_order = payment_service.fetch_order(order.provider_order_id)
        rzp_status = rzp_order.get("status")
        
        # Mappings
        if rzp_status == "paid":
            order.status = OrderStatus.PAID
        elif rzp_status in ["created", "attempted"]:
            order.status = OrderStatus.PAYMENT_PENDING
        else:
            order.status = OrderStatus.PAYMENT_FAILED
            
        db.commit()
        
        audit_service.log_event(
            db=db,
            session_id=order.session_id,
            actor="SYSTEM",
            event_type="RECOVERY_COMPLETED",
            action="RECONCILE_ORDER",
            result="SUCCESS",
            order_id=order.id,
            input_data={"rzp_status": rzp_status},
            output_data={"previous_state": previous_state, "new_state": order.status}
        )
        
        return ReconcileResponse(
            status="success", 
            order_id=order.id, 
            previous_state=previous_state, 
            new_state=order.status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconciliation failed: {str(e)}")
