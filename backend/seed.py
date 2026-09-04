"""
Seed the AgentCart database with demo merchant and commerce policy,
and then import the catalog from the Excel workbook.

Usage:
    python seed.py
"""
import sys
import os

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.policy import CommercePolicy
from scripts.import_catalog import import_catalog_from_excel

MERCHANT_ID = "merchant-demo-001"
EXCEL_CATALOG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "AgentCart_Merchant_Catalog.xlsx")

def seed():
    """Seed the database. Drops existing data and re-seeds."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Clear existing data (in reverse FK order)
        from app.models.order import Order, OrderItem
        db.query(OrderItem).delete()
        db.query(Order).delete()
        db.query(Product).delete()
        db.query(CommercePolicy).delete()
        db.query(Merchant).delete()
        db.commit()

        # Seed merchant
        merchant = Merchant(
            id=MERCHANT_ID,
            name="AgentCart Demo Merchant",
            currency="INR",
        )
        db.add(merchant)
        db.flush()

        # Seed commerce policy
        policy = CommercePolicy(
            merchant_id=MERCHANT_ID,
            max_order_amount=70000,
            max_discount_percent=10,
            require_confirmation_above=25000,
            allowed_currency="INR",
            active=True,
        )
        db.add(policy)
        db.commit()
        
        print(f"[OK] Seeded merchant: {merchant.name}")
        print(f"[OK] Seeded commerce policy (max order: {policy.max_order_amount:,} INR)")
        
        # Import products from Excel
        print(f"\nImporting products from {EXCEL_CATALOG_PATH}...")
        import_catalog_from_excel(db, EXCEL_CATALOG_PATH, MERCHANT_ID)

        print("\nDone!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
