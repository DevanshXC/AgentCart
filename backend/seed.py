"""
Seed the AgentCart database with demo merchant, products, and commerce policy.

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


MERCHANT_ID = "merchant-demo-001"

PRODUCTS = [
    {
        "id": "lenovo-loq-15",
        "sku": "LAP-001",
        "name": "Lenovo LOQ 15",
        "description": "15.6-inch powerhouse for coding and gaming. Features a high-performance Ryzen 7 processor, dedicated RTX 4050 graphics, and a vibrant 15.6-inch display. (AgentCart Demo Configuration)",
        "category": "laptop",
        "price": 64999,
        "currency": "INR",
        "inventory": 12,
        "attributes": {
            "ram": "16GB",
            "storage": "512GB SSD",
            "gpu": "RTX 4050",
            "processor": "Ryzen 7",
            "display": "15.6 inch",
        },
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuANxibGnRSuO191yXH9KuvHTQckEIdwvtnCj7Ht0OwXLvs98xwSmSGV4GrudmgeRQUwjXCGv0Dcriqm82G3AtcB93yaGwrnbqOprsg13o8sRThRhUYxI-iYNKxauwm5MkZZEa7etqCSY5oRKuBIuqNzpNR9keVBOYPCVwxA0ImGc6I2rWTozkbrCshem7JrgaMP-XO5qcTK3-vrP4P9z9WccUeptDeX9Efs6gXzBPWHAtzuE4lsE8mO",
        "hero_image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBIGkySwKIHKJfjkoZDIhqixJzreSC-72-3ib_OPH0r5CVAy_t4XXMd9HTin7jH6NWXV4TmiE3VVGJFG0lyfisOwzl2FuuiXIlo_2iwSRL2re3DxOSFNHSFakn2Sqq7uXDV0rPZ7aYMbsOIOKlpecydWSciJBm_NUId4vXWJ7eOrW3qXOv7GDCLVy_45Mswhub9pzzSmfj3VtLJQnl3i5iK_lS_M7qyvCajZ9OL8_cveqeezUChsBkO",
    },
    {
        "id": "ideapad-slim-5",
        "sku": "LAP-002",
        "name": "Lenovo IdeaPad Slim 5",
        "description": "Better CPU, but integrated graphics. Less ideal for gaming. Premium build with exceptional keyboard and trackpad for long coding sessions. (AgentCart Demo Configuration)",
        "category": "laptop",
        "price": 68500,
        "currency": "INR",
        "inventory": 8,
        "attributes": {
            "ram": "16GB",
            "storage": "512GB SSD",
            "gpu": "Iris Xe",
            "processor": "Intel Core i7",
            "display": "14 inch",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "acer-nitro-v15",
        "sku": "LAP-003",
        "name": "Acer Nitro V 15",
        "description": "RTX 4060, but only 8GB RAM. Might struggle with heavy coding. Excellent for gaming with high refresh rate display. (AgentCart Demo Configuration)",
        "category": "laptop",
        "price": 69990,
        "currency": "INR",
        "inventory": 5,
        "attributes": {
            "ram": "8GB",
            "storage": "512GB SSD",
            "gpu": "RTX 4060",
            "processor": "Intel Core i5",
            "display": "15.6 inch",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "wireless-mouse",
        "sku": "ACC-001",
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse with Bluetooth 5.0 connectivity, silent clicks, and long battery life.",
        "category": "accessory",
        "price": 1499,
        "currency": "INR",
        "inventory": 45,
        "attributes": {
            "connectivity": "Bluetooth 5.0",
            "battery": "18 months",
            "dpi": "4000",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "mechanical-keyboard",
        "sku": "ACC-002",
        "name": "Mechanical Keyboard",
        "description": "Full-size mechanical keyboard with hot-swappable switches, RGB backlighting, and USB-C connection.",
        "category": "accessory",
        "price": 3499,
        "currency": "INR",
        "inventory": 30,
        "attributes": {
            "switch_type": "Mechanical (Red)",
            "layout": "Full-size",
            "backlight": "RGB",
            "connectivity": "USB-C",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "laptop-stand",
        "sku": "ACC-003",
        "name": "Laptop Stand",
        "description": "Adjustable aluminum laptop stand with ergonomic height settings and cable management.",
        "category": "accessory",
        "price": 2499,
        "currency": "INR",
        "inventory": 25,
        "attributes": {
            "material": "Aluminum",
            "adjustable": "Yes",
            "max_laptop_size": "17 inch",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "usb-c-hub",
        "sku": "ACC-004",
        "name": "USB-C Hub Pro",
        "description": "7-in-1 USB-C hub with HDMI 4K, USB 3.0, SD card reader, and 100W power delivery passthrough.",
        "category": "accessory",
        "price": 3999,
        "currency": "INR",
        "inventory": 20,
        "attributes": {
            "ports": "7-in-1",
            "hdmi": "4K@60Hz",
            "power_delivery": "100W",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "noise-cancelling-headphones",
        "sku": "AUD-001",
        "name": "Noise Cancelling Headphones",
        "description": "Over-ear wireless headphones with active noise cancellation, 30-hour battery, and premium comfort.",
        "category": "audio",
        "price": 7999,
        "currency": "INR",
        "inventory": 15,
        "attributes": {
            "type": "Over-ear",
            "anc": "Active Noise Cancellation",
            "battery": "30 hours",
            "connectivity": "Bluetooth 5.2",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "webcam-hd",
        "sku": "ACC-005",
        "name": "HD Webcam Pro",
        "description": "1080p webcam with auto-focus, built-in microphone, and privacy shutter for remote work.",
        "category": "accessory",
        "price": 4999,
        "currency": "INR",
        "inventory": 18,
        "attributes": {
            "resolution": "1080p",
            "fps": "60",
            "autofocus": "Yes",
            "microphone": "Built-in dual mic",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "monitor-27",
        "sku": "MON-001",
        "name": "UltraWide Monitor 27\"",
        "description": "27-inch QHD IPS monitor with 165Hz refresh rate, HDR400, and USB-C input for seamless laptop connectivity.",
        "category": "monitor",
        "price": 24999,
        "currency": "INR",
        "inventory": 7,
        "attributes": {
            "size": "27 inch",
            "resolution": "2560x1440 QHD",
            "refresh_rate": "165Hz",
            "panel": "IPS",
            "hdr": "HDR400",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "rgb-gaming-mousepad",
        "sku": "ACC-006",
        "name": "RGB Gaming Mousepad",
        "description": "Extended RGB mousepad with 14 lighting modes, micro-textured surface, and non-slip rubber base.",
        "category": "accessory",
        "price": 1299,
        "currency": "INR",
        "inventory": 50,
        "attributes": {
            "size": "800x300mm",
            "lighting": "14 RGB modes",
            "surface": "Micro-textured cloth",
        },
        "image_url": "",
        "hero_image_url": "",
    },
    {
        "id": "portable-ssd-1tb",
        "sku": "STR-001",
        "name": "Portable SSD 1TB",
        "description": "Compact portable SSD with 1050MB/s read speed, USB 3.2 Gen 2, and shock-resistant design.",
        "category": "storage",
        "price": 5999,
        "currency": "INR",
        "inventory": 22,
        "attributes": {
            "capacity": "1TB",
            "read_speed": "1050 MB/s",
            "interface": "USB 3.2 Gen 2",
            "form_factor": "Portable",
        },
        "image_url": "",
        "hero_image_url": "",
    },
]


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

        # Seed products
        for p in PRODUCTS:
            product = Product(
                id=p["id"],
                merchant_id=MERCHANT_ID,
                sku=p["sku"],
                name=p["name"],
                description=p["description"],
                category=p["category"],
                price=p["price"],
                currency=p["currency"],
                inventory=p["inventory"],
                active=True,
                attributes=p.get("attributes"),
                image_url=p.get("image_url", ""),
                hero_image_url=p.get("hero_image_url", ""),
            )
            db.add(product)

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
        print(f"[OK] Seeded {len(PRODUCTS)} products")
        print(f"[OK] Seeded commerce policy (max order: {policy.max_order_amount:,} INR)")
        print("\nDone!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
