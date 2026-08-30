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
from app.agents.tools import search_products, get_product, check_inventory, get_policy, compare_products
from app.agents.ollama_client import LLMProvider

# In-memory SQLite for tests
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})

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
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    merchant = Merchant(id=MERCHANT_ID, name="AgentCart Demo Merchant", currency="INR")
    db.add(merchant)
    db.flush()
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
        ),
        Product(
            id="acer-nitro-v15",
            merchant_id=MERCHANT_ID,
            sku="LAP-003",
            name="Acer Nitro V 15",
            description="Great for gaming.",
            category="laptop",
            price=69990,
            currency="INR",
            inventory=5,
            active=True,
            attributes={"ram": "8GB", "storage": "512GB SSD", "gpu": "RTX 4060"},
        )
    ]
    db.add_all(products)
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

class TestAgentTools:
    def test_search_products_tool(self):
        db = TestSessionLocal()
        result = search_products(db, query="laptop")
        assert "products" in result
        assert len(result["products"]) == 2
        db.close()

    def test_get_product_tool(self):
        db = TestSessionLocal()
        result = get_product(db, product_id="lenovo-loq-15")
        assert "error" not in result
        assert result["name"] == "Lenovo LOQ 15"
        assert result["price"] == 64999
        db.close()

    def test_check_inventory_tool(self):
        db = TestSessionLocal()
        result = check_inventory(db, product_id="lenovo-loq-15")
        assert result["inventory"] == 12
        assert result["in_stock"] is True
        db.close()

    def test_get_policy_tool(self):
        db = TestSessionLocal()
        result = get_policy(db)
        assert result["max_order_amount"] == 70000
        db.close()

    def test_compare_products_tool(self):
        db = TestSessionLocal()
        result = compare_products(db, product_ids=["lenovo-loq-15", "acer-nitro-v15"])
        assert "comparisons" in result
        assert len(result["comparisons"]) == 2
        db.close()

# Mock Provider for Agent API testing
class MockLLMProvider(LLMProvider):
    def __init__(self, healthy=True, responses=None):
        self.healthy = healthy
        self.responses = responses or []
        self.call_count = 0

    async def chat(self, messages, model):
        if self.call_count < len(self.responses):
            res = self.responses[self.call_count]
            self.call_count += 1
            return res
        return '{"type": "response", "message": "Fallback", "intent": {}, "product_ids": []}'

    async def health(self):
        return self.healthy

    async def list_models(self):
        return ["qwen2.5:7b"]

def override_provider_healthy():
    return MockLLMProvider(healthy=True)

def override_provider_unhealthy():
    return MockLLMProvider(healthy=False)

def override_provider_flow():
    # Simulate: 1 tool call then final response
    responses = [
        '{"tool": "search_products", "args": {"query": "laptop"}}',
        '{"type": "response", "message": "I found these.", "intent": {"category": "laptop", "requirements": []}, "recommended_product_id": "lenovo-loq-15", "product_ids": ["lenovo-loq-15"], "match_reasons": ["Good fit"]}'
    ]
    return MockLLMProvider(healthy=True, responses=responses)

class TestAgentAPI:
    def test_agent_health_endpoint(self):
        # We need to patch the provider creation in the router
        from app.api import agent
        agent.OllamaProvider = lambda **kwargs: override_provider_healthy()
        response = client.get("/api/agent/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_agent_ollama_unavailable(self):
        from app.api import agent
        agent.OllamaProvider = lambda **kwargs: override_provider_unhealthy()
        response = client.get("/api/agent/health")
        assert response.status_code == 503

        response = client.post("/api/agent/chat", json={"message": "hi"})
        assert response.status_code == 503

    def test_agent_chat_endpoint(self):
        from app.api import agent
        agent.OllamaProvider = lambda **kwargs: override_provider_flow()
        response = client.post("/api/agent/chat", json={"message": "Find a laptop"})
        assert response.status_code == 200
        data = response.json()
        
        # Test safety/trust boundary
        assert data["recommended_product_id"] == "lenovo-loq-15"
        assert len(data["products"]) == 1
        assert data["products"][0]["price"] == 64999 # From DB
        assert "payment" not in data["message"].lower()

