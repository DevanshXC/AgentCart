"""
Backend API tests using FastAPI TestClient with an in-memory SQLite database.
No running PostgreSQL required for tests.
"""
import sys
import os
import pytest

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.policy import CommercePolicy

# In-memory SQLite for tests
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})

# Enable foreign keys for SQLite
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

MERCHANT_ID = "test-merchant-001"


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables and seed test data before each test, teardown after."""
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()

    # Seed test merchant
    merchant = Merchant(id=MERCHANT_ID, name="AgentCart Demo Merchant", currency="INR")
    db.add(merchant)
    db.flush()

    # Seed test products
    products = [
        Product(
            id="lenovo-loq-15",
            merchant_id=MERCHANT_ID,
            sku="LAP-001",
            name="Lenovo LOQ 15",
            description="16-inch powerhouse for coding and gaming.",
            category="laptop",
            price=64999,
            currency="INR",
            inventory=12,
            active=True,
            attributes={"ram": "16GB", "storage": "512GB SSD", "gpu": "RTX 4050", "processor": "Ryzen 7", "display": "16 inch"},
            image_url="https://example.com/dev-pro-16.jpg",
            hero_image_url="https://example.com/dev-pro-16-hero.jpg",
        ),
        Product(
            id="ideapad-slim-5",
            merchant_id=MERCHANT_ID,
            sku="LAP-002",
            name="Lenovo IdeaPad Slim 5",
            description="Better CPU, but integrated graphics.",
            category="laptop",
            price=68500,
            currency="INR",
            inventory=8,
            active=True,
            attributes={"ram": "32GB", "storage": "1TB SSD", "gpu": "Iris Xe"},
        ),
        Product(
            id="acer-nitro-v15",
            merchant_id=MERCHANT_ID,
            sku="LAP-003",
            name="Acer Nitro V 15",
            description="RTX 4060, but only 8GB RAM. Great for gaming.",
            category="laptop",
            price=69990,
            currency="INR",
            inventory=5,
            active=True,
            attributes={"ram": "8GB", "storage": "512GB SSD", "gpu": "RTX 4060"},
        ),
        Product(
            id="wireless-mouse",
            merchant_id=MERCHANT_ID,
            sku="ACC-001",
            name="Wireless Mouse",
            description="Ergonomic wireless mouse.",
            category="accessory",
            price=1499,
            currency="INR",
            inventory=45,
            active=True,
            attributes={"connectivity": "Bluetooth 5.0"},
        ),
        Product(
            id="mechanical-keyboard",
            merchant_id=MERCHANT_ID,
            sku="ACC-002",
            name="Mechanical Keyboard",
            description="Full-size mechanical keyboard.",
            category="accessory",
            price=3499,
            currency="INR",
            inventory=30,
            active=True,
            attributes={"switch_type": "Mechanical (Red)"},
        ),
        Product(
            id="out-of-stock-item",
            merchant_id=MERCHANT_ID,
            sku="OOS-001",
            name="Out Of Stock Gadget",
            description="This item has zero inventory.",
            category="accessory",
            price=999,
            currency="INR",
            inventory=0,
            active=True,
            attributes={},
        ),
    ]
    db.add_all(products)

    # Seed policy
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
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


# ── Health ──────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ── Products ────────────────────────────────────────────────────────

class TestProducts:
    def test_list_products(self):
        response = client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5
        names = [p["name"] for p in data]
        assert "Lenovo LOQ 15" in names

    def test_get_product_by_id(self):
        response = client.get("/api/products/lenovo-loq-15")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Lenovo LOQ 15"
        assert data["price"] == 64999
        assert data["sku"] == "LAP-001"
        assert data["attributes"]["ram"] == "16GB"
        assert data["attributes"]["gpu"] == "RTX 4050"

    def test_get_product_not_found(self):
        response = client.get("/api/products/nonexistent")
        assert response.status_code == 404

    def test_list_products_by_category(self):
        response = client.get("/api/products?category=accessory")
        assert response.status_code == 200
        data = response.json()
        assert all(p["category"] == "accessory" for p in data)

    def test_get_inventory(self):
        response = client.get("/api/products/lenovo-loq-15/inventory")
        assert response.status_code == 200
        data = response.json()
        assert data["product_id"] == "lenovo-loq-15"
        assert data["inventory"] == 12
        assert data["in_stock"] is True

    def test_get_inventory_out_of_stock(self):
        response = client.get("/api/products/out-of-stock-item/inventory")
        assert response.status_code == 200
        data = response.json()
        assert data["inventory"] == 0
        assert data["in_stock"] is False


# ── Search ──────────────────────────────────────────────────────────

class TestSearch:
    def test_search_by_keyword(self):
        response = client.get("/api/products/search?query=laptop")
        assert response.status_code == 200
        data = response.json()
        # All 3 laptops match the category
        laptop_names = [p["name"] for p in data]
        assert "Lenovo LOQ 15" in laptop_names

    def test_search_with_max_price(self):
        response = client.get("/api/products/search?query=laptop&max_price=70000")
        assert response.status_code == 200
        data = response.json()
        assert all(p["price"] <= 70000 for p in data)
        names = [p["name"] for p in data]
        assert "Lenovo LOQ 15" in names

    def test_search_by_category(self):
        response = client.get("/api/products/search?category=accessory")
        assert response.status_code == 200
        data = response.json()
        assert all(p["category"] == "accessory" for p in data)

    def test_search_in_stock_only(self):
        response = client.get("/api/products/search?in_stock=true")
        assert response.status_code == 200
        data = response.json()
        assert all(p["inventory"] > 0 for p in data)
        names = [p["name"] for p in data]
        assert "Out Of Stock Gadget" not in names

    def test_search_empty_results(self):
        response = client.get("/api/products/search?query=nonexistent_xyz_product")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_search_gaming(self):
        response = client.get("/api/products/search?query=gaming")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1


# ── Merchant ────────────────────────────────────────────────────────

class TestMerchant:
    def test_get_merchant(self):
        response = client.get("/api/merchant")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "AgentCart Demo Merchant"
        assert data["currency"] == "INR"


# ── Policy ──────────────────────────────────────────────────────────

class TestPolicy:
    def test_get_policy(self):
        response = client.get("/api/policy")
        assert response.status_code == 200
        data = response.json()
        assert data["max_order_amount"] == 70000
        assert data["max_discount_percent"] == 10
        assert data["require_confirmation_above"] == 25000
        assert data["allowed_currency"] == "INR"
        assert data["active"] is True


# ── Database integrity ──────────────────────────────────────────────

class TestDatabaseIntegrity:
    def test_seeded_products_retrievable(self):
        """Verify all seeded products are accessible via the API."""
        product_ids = [
            "lenovo-loq-15",
            "ideapad-slim-5",
            "acer-nitro-v15",
            "wireless-mouse",
            "mechanical-keyboard",
        ]
        for pid in product_ids:
            response = client.get(f"/api/products/{pid}")
            assert response.status_code == 200, f"Product {pid} not found"

    def test_laptop_prices_authoritative(self):
        """Verify the three main laptops have correct authoritative prices."""
        expected = {
            "lenovo-loq-15": 64999,
            "ideapad-slim-5": 68500,
            "acer-nitro-v15": 69990,
        }
        for pid, expected_price in expected.items():
            response = client.get(f"/api/products/{pid}")
            data = response.json()
            assert data["price"] == expected_price, (
                f"{pid}: expected price {expected_price}, got {data['price']}"
            )
