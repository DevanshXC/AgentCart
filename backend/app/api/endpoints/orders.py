from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.order import OrderCreateRequest, OrderPreviewResponse, OrderResponse
from app.services.order import order_service
from app.services.audit import audit_service
from app.models.order import Order

router = APIRouter()

@router.post("/preview", response_model=OrderPreviewResponse)
def preview_order(request: OrderCreateRequest, db: Session = Depends(get_db)):
    """
    Creates an order preview (quote) without generating a Razorpay order.
    """
    order, policy_result = order_service.preview_order(db, request)
    
    audit_service.log_event(
        db=db,
        session_id=request.session_id,
        actor="USER",
        event_type="ORDER_PREVIEW",
        action="CREATE_PREVIEW",
        result="SUCCESS",
        order_id=order.id,
        input_data={"items": [item.dict() for item in request.items]},
        policy_result=policy_result
    )
    
    return order

@router.get("/latest", response_model=OrderResponse)
def get_latest_order(db: Session = Depends(get_db)):
    """
    Retrieves the most recent order (by creation time).
    Useful for the Activity/Audit Trail UI.
    """
    order = db.query(Order).order_by(Order.created_at.desc()).first()
    if not order:
        raise HTTPException(status_code=404, detail="No orders found")
    return order

@router.post("/{order_id}/authorize", response_model=OrderResponse)
def authorize_order(order_id: str, db: Session = Depends(get_db)):
    """
    Authorizes an order, checks inventory, and creates a Razorpay order.
    Idempotent.
    """
    try:
        order = order_service.authorize_order(db, order_id)
        audit_service.log_event(
            db=db,
            session_id=order.session_id,
            actor="USER",
            event_type="ORDER_AUTHORIZE",
            action="CREATE_RAZORPAY_ORDER",
            result="SUCCESS",
            order_id=order.id
        )
        return order
    except HTTPException as e:
        # Also log failure if we can find the order
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            audit_service.log_event(
                db=db,
                session_id=order.session_id,
                actor="SYSTEM",
                event_type="ORDER_AUTHORIZE",
                action="CREATE_RAZORPAY_ORDER",
                result="FAILURE",
                order_id=order.id,
                output_data={"error": e.detail}
            )
        raise e

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)):
    """
    Retrieves an order by ID.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
