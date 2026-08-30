from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.policy import CommercePolicy
from app.schemas.order import OrderCreateRequest
from app.services.payment import payment_service


class OrderService:
    @staticmethod
    def preview_order(db: Session, request: OrderCreateRequest) -> Tuple[Order, str]:
        """
        Creates an order preview (quote) without hitting Razorpay.
        Validates inventory and policy.
        """
        policy = db.query(CommercePolicy).filter(CommercePolicy.active == True).first()
        if not policy:
            raise HTTPException(status_code=500, detail="No active commerce policy found")
            
        total_amount = 0
        order_items = []
        
        # We need a placeholder order to hold items
        order = Order(
            session_id=request.session_id,
            status=OrderStatus.CREATED,
            amount=0,
            currency="INR"
        )
        db.add(order)
        db.flush()
        
        for item in request.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            
            if not product.active:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} is not active")
                
            if product.inventory < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient inventory for {item.product_id}")
                
            line_total = product.price * item.quantity
            total_amount += line_total
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                price_snapshot=product.price
            )
            order_items.append(order_item)
            db.add(order_item)
            
        if total_amount > policy.max_order_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Order total {total_amount} exceeds policy maximum of {policy.max_order_amount}"
            )
            
        order.amount = total_amount
        order.status = OrderStatus.AUTHORIZATION_REQUIRED
        
        db.commit()
        db.refresh(order)
        
        policy_result = "PASSED"
        
        return order, policy_result

    @staticmethod
    def authorize_order(db: Session, order_id: str) -> Order:
        """
        Confirms user authorization, atomically checks inventory, decrements it, and creates Razorpay order.
        Idempotent: if provider_order_id exists, it returns immediately.
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if order.status not in [OrderStatus.AUTHORIZATION_REQUIRED, OrderStatus.AUTHORIZED, OrderStatus.PAYMENT_PENDING]:
            raise HTTPException(status_code=400, detail=f"Invalid order status for authorization: {order.status}")
            
        # Financial Idempotency
        if order.provider_order_id:
            # We already generated a Razorpay order. Safe to return it.
            return order

        # Atomic inventory re-check and decrement
        # In a real heavy-concurrency environment, you might use FOR UPDATE or specific UPDATE WHERE inventory >= qty.
        # SQLAlchemy with postgres allows us to do a row-level lock.
        
        for item in order.items:
            # Lock the product row
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product or product.inventory < item.quantity:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Inventory race: {item.product_id} is no longer available.")
            
            # Decrement
            product.inventory -= item.quantity
            
        # Create Razorpay order
        try:
            rzp_order = payment_service.create_order(
                amount_in_rupees=order.amount,
                currency=order.currency,
                receipt=order.id
            )
            order.provider_order_id = rzp_order.get("id")
            order.status = OrderStatus.PAYMENT_PENDING
            db.commit()
            db.refresh(order)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Payment provider error: {str(e)}")
            
        return order

order_service = OrderService()
