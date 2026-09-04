"""
Tests for the recommendation reliability guardrails:
- category alias normalization
- explicit-user-price extraction / enforcement
- AND -> OR search fallback
- product-ID grounding (no hallucinated recommendations)

Uses the same in-memory-SQLite + FastAPI TestClient pattern as the other
backend tests (see test_agent.py), self-contained in this file.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.policy import CommercePolicy
from app.services.catalog import search_products as catalog_search, normalize_category
from app.agents.tools import (
    search_products as tool_search_products,
    MAX_PRODUCTS_TO_LLM,
    _rank_by_requirement_relevance,
    _requirement_relevance_score,
    _detect_requirements,
)
from app.agents.orchestrator import (
    AgentOrchestrator,
    extract_user_price_ceiling,
    NO_MATCH_MESSAGE,
)
from app.agents.ollama_client import LLMProvider
from app.agents import orchestrator as orchestrator_module

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

MERCHANT_ID = "test-merchant-guardrails"


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    merchant = Merchant(id=MERCHANT_ID, name="AgentCart Demo Merchant", currency="INR")
    db.add(merchant)
    db.flush()
    products = [
        Product(
            id="lenovo-loq-15", merchant_id=MERCHANT_ID, sku="LAP-001", name="Lenovo LOQ 15",
            description="Powerhouse for coding and gaming.", category="laptop",
            price=64999, currency="INR", inventory=12, active=True,
            attributes={"ram": "16GB", "gpu": "RTX 4050"},
        ),
        Product(
            id="acer-nitro-v15", merchant_id=MERCHANT_ID, sku="LAP-003", name="Acer Nitro V 15",
            description="Great for gaming.", category="laptop",
            price=69990, currency="INR", inventory=5, active=True,
            attributes={"ram": "8GB", "gpu": "RTX 4060"},
        ),
        # Six more laptops (8 total) so a plain "laptop" search exceeds the
        # 5-product tool-output cap, with predictable price-ascending order.
        # Priced ABOVE the two pre-existing laptops so lenovo-loq-15 /
        # acer-nitro-v15 stay within the top-5 cap and every prior test that
        # depends on them being a returned/grounded candidate is unaffected.
        Product(
            id="test-laptop-a", merchant_id=MERCHANT_ID, sku="LAP-TEST-A", name="Test Laptop A",
            description="Budget laptop for everyday use.", category="laptop",
            price=75000, currency="INR", inventory=10, active=True, attributes={"ram": "8GB"},
        ),
        Product(
            id="test-laptop-b", merchant_id=MERCHANT_ID, sku="LAP-TEST-B", name="Test Laptop B",
            description="Budget laptop for everyday use.", category="laptop",
            price=80000, currency="INR", inventory=10, active=True, attributes={"ram": "8GB"},
        ),
        Product(
            id="test-laptop-c", merchant_id=MERCHANT_ID, sku="LAP-TEST-C", name="Test Laptop C",
            description="Mid-range laptop for everyday use.", category="laptop",
            price=85000, currency="INR", inventory=10, active=True, attributes={"ram": "16GB"},
        ),
        Product(
            id="test-laptop-d", merchant_id=MERCHANT_ID, sku="LAP-TEST-D", name="Test Laptop D",
            description="Mid-range laptop for everyday use.", category="laptop",
            price=90000, currency="INR", inventory=10, active=True, attributes={"ram": "16GB"},
        ),
        Product(
            id="test-laptop-e", merchant_id=MERCHANT_ID, sku="LAP-TEST-E", name="Test Laptop E",
            description="Mid-range laptop for everyday use.", category="laptop",
            price=95000, currency="INR", inventory=10, active=True, attributes={"ram": "16GB"},
        ),
        Product(
            id="test-laptop-f", merchant_id=MERCHANT_ID, sku="LAP-TEST-F", name="Test Laptop F",
            description="Premium laptop for everyday use.", category="laptop",
            price=100000, currency="INR", inventory=10, active=True, attributes={"ram": "32GB"},
        ),
        Product(
            id="test-headphones", merchant_id=MERCHANT_ID, sku="AUD-TEST-001", name="Test Over-Ear Headphones",
            description="Comfortable for travel.", category="audio",
            price=5000, currency="INR", inventory=10, active=True, attributes={},
        ),
        Product(
            id="test-smart-plug", merchant_id=MERCHANT_ID, sku="SHM-TEST-001", name="Test Smart Plug",
            description="Wi-Fi smart plug for home automation.", category="smart-home",
            price=899, currency="INR", inventory=20, active=True, attributes={},
        ),
        Product(
            id="test-phone", merchant_id=MERCHANT_ID, sku="PHN-TEST-001", name="Test Phone",
            description="Reliable everyday smartphone.", category="smartphone",
            price=20000, currency="INR", inventory=10, active=True, attributes={},
        ),
        Product(
            id="test-runner-watch", merchant_id=MERCHANT_ID, sku="SWT-TEST-001", name="Test Runner Watch",
            description="Great for running enthusiasts with GPS tracking.", category="smartwatch",
            price=15000, currency="INR", inventory=5, active=True, attributes={},
        ),
        Product(
            id="test-swim-watch", merchant_id=MERCHANT_ID, sku="SWT-TEST-002", name="Test Aqua Watch",
            description="Waterproof design, great for swimming laps.", category="smartwatch",
            price=8000, currency="INR", inventory=5, active=True, attributes={},
        ),
    ]
    # Smartphone fixtures for requirement-aware ranking tests. Descriptions
    # are deliberately neutral (no vocabulary-term leakage) except where a
    # product is meant to carry a signal -- see TestRequirementAwareRanking.
    requirement_ranking_products = [
        Product(
            id="test-phone-cheap-a", merchant_id=MERCHANT_ID, sku="PHN-TEST-A", name="Test Phone Cheap A",
            description="Entry-level smartphone.", category="smartphone",
            price=5000, currency="INR", inventory=10, active=True, attributes={"chipset": "Basic"},
        ),
        Product(
            id="test-phone-cheap-b", merchant_id=MERCHANT_ID, sku="PHN-TEST-B", name="Test Phone Cheap B",
            description="Entry-level smartphone.", category="smartphone",
            price=6000, currency="INR", inventory=10, active=True, attributes={"chipset": "Basic"},
        ),
        Product(
            id="test-phone-cheap-c", merchant_id=MERCHANT_ID, sku="PHN-TEST-C", name="Test Phone Cheap C",
            description="Entry-level smartphone.", category="smartphone",
            price=7000, currency="INR", inventory=10, active=True, attributes={"chipset": "Basic"},
        ),
        Product(
            id="test-phone-cheap-d", merchant_id=MERCHANT_ID, sku="PHN-TEST-D", name="Test Phone Cheap D",
            description="Entry-level smartphone.", category="smartphone",
            price=8000, currency="INR", inventory=10, active=True, attributes={"chipset": "Basic"},
        ),
        Product(
            id="test-phone-cheap-e", merchant_id=MERCHANT_ID, sku="PHN-TEST-E", name="Test Phone Cheap E",
            description="Entry-level smartphone.", category="smartphone",
            price=9000, currency="INR", inventory=10, active=True, attributes={"chipset": "Basic"},
        ),
        Product(
            id="test-phone-strong-camera", merchant_id=MERCHANT_ID, sku="PHN-TEST-F", name="Test Phone Strong Camera",
            description="Camera-focused smartphone with exceptional photo quality.", category="smartphone",
            price=50000, currency="INR", inventory=10, active=True,
            attributes={"camera": "200MP OIS Leica photography"},
        ),
        Product(
            id="test-phone-key-only-camera", merchant_id=MERCHANT_ID, sku="PHN-TEST-G", name="Test Phone Unspecified Sensor",
            description="Reliable everyday smartphone for calls and messaging.", category="smartphone",
            price=12000, currency="INR", inventory=10, active=True,
            attributes={"camera": "N/A", "battery": "5000mAh"},
        ),
        Product(
            id="test-phone-strong-performance", merchant_id=MERCHANT_ID, sku="PHN-TEST-H", name="Test Phone Strong Performance",
            description="High-performance smartphone built for speed.", category="smartphone",
            price=45000, currency="INR", inventory=10, active=True,
            attributes={"chipset": "Snapdragon 8 Gen 3 flagship processor"},
        ),
        Product(
            id="test-phone-strong-battery", merchant_id=MERCHANT_ID, sku="PHN-TEST-I", name="Test Phone Strong Battery",
            description="Smartphone built for all-day battery life.", category="smartphone",
            price=22000, currency="INR", inventory=10, active=True,
            attributes={"battery": "7000mAh long-lasting battery life"},
        ),
        Product(
            id="test-phone-gaming", merchant_id=MERCHANT_ID, sku="PHN-TEST-J", name="Test Phone Gaming",
            description="Smartphone tuned for mobile gaming.", category="smartphone",
            price=28000, currency="INR", inventory=10, active=True,
            attributes={"gpu": "Adreno 750 gaming GPU high refresh rate"},
        ),
        Product(
            id="test-phone-gaming-and-battery", merchant_id=MERCHANT_ID, sku="PHN-TEST-K", name="Test Phone Gaming And Battery",
            description="Gaming smartphone with a large battery for long sessions.", category="smartphone",
            price=35000, currency="INR", inventory=10, active=True,
            attributes={"gpu": "Adreno 750 gaming GPU", "battery": "7000mAh long-lasting battery life"},
        ),
    ]
    db.add_all(requirement_ranking_products)
    db.add_all(products)
    policy = CommercePolicy(
        merchant_id=MERCHANT_ID, max_order_amount=200000, max_discount_percent=10,
        require_confirmation_above=25000, allowed_currency="INR", active=True,
    )
    db.add(policy)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


# ─── A. Category alias normalization ────────────────────────────────────

class TestCategoryNormalization:
    @pytest.mark.parametrize("raw,expected", [
        ("smart home", "smart-home"),
        ("smarthome", "smart-home"),
        ("headphones", "audio"),
        ("headphone", "audio"),
        ("earbuds", "audio"),
        ("earbud", "audio"),
        ("phone", "smartphone"),
        ("phones", "smartphone"),
        ("mobile", "smartphone"),
        ("notebook", "laptop"),
        ("laptops", "laptop"),
        ("display", "monitor"),
        ("monitors", "monitor"),
        ("watch", "smartwatch"),
        ("smartwatches", "smartwatch"),
        ("console", "gaming"),
        ("controller", "gaming"),
        ("controllers", "gaming"),
        ("cameras", "camera"),
        ("accessories", "accessory"),
        ("SMART HOME", "smart-home"),  # case-insensitive
        ("laptop", "laptop"),  # already-valid values pass through unchanged
        ("some-unmapped-category", "some-unmapped-category"),  # unknown -> unchanged, not guessed
    ])
    def test_alias_resolution(self, raw, expected):
        assert normalize_category(raw) == expected

    def test_smart_home_alias_returns_smart_home_products(self):
        db = TestSessionLocal()
        results = catalog_search(db, category="smart home")
        assert len(results) == 1
        assert results[0].id == "test-smart-plug"
        db.close()

    def test_headphones_alias_returns_audio_products(self):
        db = TestSessionLocal()
        results = catalog_search(db, category="headphones")
        assert any(p.id == "test-headphones" for p in results)
        db.close()

    def test_earbuds_alias_returns_audio_products(self):
        db = TestSessionLocal()
        results = catalog_search(db, category="earbuds")
        assert any(p.id == "test-headphones" for p in results)
        db.close()

    def test_phones_alias_returns_smartphone_products(self):
        db = TestSessionLocal()
        results = catalog_search(db, category="phones")
        assert any(p.id == "test-phone" for p in results)
        db.close()

    def test_notebook_alias_returns_laptop_products(self):
        db = TestSessionLocal()
        results = catalog_search(db, category="notebook")
        assert len(results) == 8
        db.close()


# ─── B & C. Explicit user price extraction ───────────────────────────────

class TestPriceExtraction:
    @pytest.mark.parametrize("message,expected", [
        ("Gaming laptop under ₹70,000", 70000),
        ("Something under 10000", 10000),
        ("Show me options under 10k", 10000),
        ("laptops below 70000", 70000),
        ("within ₹70,000 please", 70000),
        ("less than ₹70,000", 70000),
        ("₹70,000 max", 70000),
        ("budget is 70k", 70000),
    ])
    def test_explicit_price_recognized(self, message, expected):
        assert extract_user_price_ceiling(message) == expected

    @pytest.mark.parametrize("message", [
        "best smartwatch for running",
        "compact camera for travel vlogging",
        "comfortable headphones for long flights",
        "gaming controller",
    ])
    def test_no_price_returns_none(self, message):
        assert extract_user_price_ceiling(message) is None


# ─── D. AND -> OR search fallback ────────────────────────────────────────

class TestSearchFallback:
    def test_fixture_premise_no_product_contains_both_terms(self):
        """Confirms *why* the AND path fails here: no seeded smartwatch's
        text contains both "running" and "swimming" literally — this is
        the exact real-world case the fallback exists for."""
        db = TestSessionLocal()
        watches = db.query(Product).filter(Product.category == "smartwatch").all()
        db.close()
        for watch in watches:
            haystack = f"{watch.name} {watch.description}".lower()
            assert not ("running" in haystack and "swimming" in haystack)

    def test_or_fallback_returns_valid_candidates(self):
        db = TestSessionLocal()
        results = catalog_search(db, query="running swimming", category="smartwatch")
        db.close()
        result_ids = {p.id for p in results}
        assert "test-runner-watch" in result_ids or "test-swim-watch" in result_ids
        assert len(results) > 0

    def test_existing_single_keyword_search_unchanged(self):
        db = TestSessionLocal()
        results = catalog_search(db, query="gaming")
        db.close()
        assert len(results) >= 1

    def test_existing_precise_multiword_search_unchanged(self):
        db = TestSessionLocal()
        # Both terms actually co-occur in a real product's text already —
        # the AND path should still be the one satisfying this, unchanged.
        results = catalog_search(db, query="waterproof swimming")
        db.close()
        assert any(p.id == "test-swim-watch" for p in results)


# ─── D2. LLM-facing tool-result product cap (context-overload fix) ───────

class TestToolResultCap:
    def test_internal_search_can_exceed_cap(self):
        """A. Catalog retrieval itself is untouched -- it still returns
        every match (8 laptops), not just the capped top N."""
        db = TestSessionLocal()
        results = catalog_search(db, category="laptop")
        db.close()
        assert len(results) == 8
        assert len(results) > MAX_PRODUCTS_TO_LLM

    def test_tool_output_capped_at_five(self):
        """B. The tool-output boundary caps what the LLM actually sees."""
        db = TestSessionLocal()
        result = tool_search_products(db, category="laptop")
        db.close()
        assert MAX_PRODUCTS_TO_LLM == 5
        assert len(result["products"]) == 5

    def test_tool_output_order_matches_uncapped_search_order(self):
        """C. The cap takes the first N in existing ranked order -- no new
        scoring is introduced. Prices are ascending (64999..100000), so the
        capped set must be exactly the 5 cheapest, in that order."""
        db = TestSessionLocal()
        uncapped = catalog_search(db, category="laptop")
        result = tool_search_products(db, category="laptop")
        db.close()
        expected_ids = [p.id for p in uncapped[:MAX_PRODUCTS_TO_LLM]]
        actual_ids = [p["id"] for p in result["products"]]
        assert actual_ids == expected_ids
        assert actual_ids == ["lenovo-loq-15", "acer-nitro-v15", "test-laptop-a", "test-laptop-b", "test-laptop-c"]

    def test_tool_output_ids_are_real_products(self):
        """D. Every ID handed to the LLM corresponds to a real, active
        product actually present in the database -- capping must not
        introduce or substitute synthetic/placeholder entries."""
        db = TestSessionLocal()
        result = tool_search_products(db, category="laptop")
        real_ids = {p.id for p in db.query(Product).filter(Product.active == True).all()}
        db.close()
        returned_ids = [p["id"] for p in result["products"]]
        assert len(returned_ids) == len(set(returned_ids))  # no duplicates
        for pid in returned_ids:
            assert pid in real_ids

    def test_zero_results_remain_zero_after_cap(self):
        """Capping a search with no matches must still yield an empty list,
        not an error or a padded result."""
        db = TestSessionLocal()
        result = tool_search_products(db, category="laptop", query="nonexistent-keyword-xyz")
        db.close()
        assert result["products"] == []


# ─── H. No-match behavior is preserved end-to-end ─────────────────────────

class TestNoMatchBehaviorUnchanged:
    def test_zero_search_results_yields_honest_no_match(self):
        from app.api import agent
        responses = [
            '{"tool": "search_products", "args": {"query": "nonexistent-keyword-xyz", "category": "laptop"}}',
            '{"type": "response", "message": "No matches.", "intent": {}, '
            '"recommended_product_id": null, "product_ids": [], "match_reasons": []}'
        ]
        agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
        response = client.post("/api/agent/chat", json={"message": "find something that does not exist"})
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_product_id"] is None
        assert data["product_ids"] == []
        assert data["message"] == NO_MATCH_MESSAGE


# ─── D3. Requirement-aware candidate ranking (pre-cap relevance layer) ────

class TestRequirementAwareRanking:
    def _ranked_ids(self, db, query, category="smartphone"):
        result = tool_search_products(db, category=category, query=query)
        return [p["id"] for p in result["products"]]

    def test_camera_requirement_ranks_strong_camera_above_weak(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best camera phone")
        db.close()
        assert ids.index("test-phone-strong-camera") < ids.index("test-phone-cheap-a")

    def test_performance_requirement_ranks_strong_chipset_above_weak(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best performance phone")
        db.close()
        assert ids.index("test-phone-strong-performance") < ids.index("test-phone-cheap-a")

    def test_battery_requirement_ranks_strong_battery_appropriately(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best battery phone")
        db.close()
        assert ids.index("test-phone-strong-battery") < ids.index("test-phone-cheap-a")

    def test_gaming_requirement_ranks_gaming_product_above_generic(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best gaming phone")
        db.close()
        assert ids.index("test-phone-gaming") < ids.index("test-phone-cheap-a")

    def test_no_recognized_requirement_preserves_existing_price_ranking(self):
        """A query with no recognized requirement term must not reorder
        the existing (price-based) catalog ranking at all."""
        db = TestSessionLocal()
        unranked = catalog_search(db, category="smartphone")
        db.close()
        assert _detect_requirements("phone for my college roommate") == []
        assert _rank_by_requirement_relevance(unranked, "phone for my college roommate") == unranked

    def test_attribute_key_alone_does_not_earn_a_relevance_boost(self):
        """A product with a 'camera' key but a non-descriptive value ("N/A")
        must score 0 for the camera requirement -- only real value content
        counts, never key presence."""
        db = TestSessionLocal()
        key_only = db.query(Product).filter(Product.id == "test-phone-key-only-camera").first()
        strong = db.query(Product).filter(Product.id == "test-phone-strong-camera").first()
        db.close()
        assert _requirement_relevance_score(key_only, ["camera"]) == 0
        assert _requirement_relevance_score(strong, ["camera"]) > 0

    def test_multi_requirement_query_sums_multiple_signals(self):
        db = TestSessionLocal()
        assert set(_detect_requirements("gaming phone with great battery")) == {"gaming", "battery"}
        ids = self._ranked_ids(db, "gaming phone with great battery")
        db.close()
        # Strong in both gaming AND battery must outrank strong-in-gaming-only.
        assert ids.index("test-phone-gaming-and-battery") < ids.index("test-phone-gaming")

    def test_top_five_are_highest_relevance_not_five_cheapest(self):
        """The priciest candidate (₹50,000) must survive the cap when it's
        the only one relevant to the stated requirement, displacing a
        cheaper-but-irrelevant candidate that pure price-ascending capping
        would have kept instead."""
        db = TestSessionLocal()
        result = tool_search_products(db, category="smartphone", query="best camera phone")
        db.close()
        ids = [p["id"] for p in result["products"]]
        assert len(ids) == MAX_PRODUCTS_TO_LLM
        assert ids == [
            "test-phone-strong-camera",
            "test-phone-cheap-a", "test-phone-cheap-b", "test-phone-cheap-c", "test-phone-cheap-d",
        ]


# ─── E. Product-ID grounding ──────────────────────────────────────────────

class TestProductIdGrounding:
    def test_validate_recommendation_passes_through_grounded_id(self):
        rec_id, product_ids = AgentOrchestrator._validate_recommendation(
            "lenovo-loq-15", ["lenovo-loq-15", "acer-nitro-v15"],
            {"lenovo-loq-15", "acer-nitro-v15"},
        )
        assert rec_id == "lenovo-loq-15"
        assert product_ids == ["lenovo-loq-15", "acer-nitro-v15"]

    def test_validate_recommendation_promotes_valid_candidate(self):
        rec_id, product_ids = AgentOrchestrator._validate_recommendation(
            "fake-hallucinated-id", ["fake-hallucinated-id", "lenovo-loq-15"],
            {"lenovo-loq-15"},
        )
        assert rec_id == "lenovo-loq-15"
        assert product_ids == ["lenovo-loq-15"]

    def test_validate_recommendation_returns_none_when_nothing_grounded(self):
        rec_id, product_ids = AgentOrchestrator._validate_recommendation(
            "fake-1", ["fake-1", "fake-2"], {"lenovo-loq-15"},
        )
        assert rec_id is None
        assert product_ids == []


# Mock provider + monkeypatch-spy pattern (mirrors test_agent.py)
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


class TestGroundingIntegration:
    def test_hallucinated_recommendation_is_promoted_to_real_candidate(self):
        from app.api import agent
        responses = [
            '{"tool": "search_products", "args": {"query": "laptop", "category": "laptop"}}',
            '{"type": "response", "message": "Found one.", "intent": {"category": "laptop", "requirements": []}, '
            '"recommended_product_id": "totally-fake-laptop-id", "product_ids": ["totally-fake-laptop-id", "lenovo-loq-15"], '
            '"match_reasons": ["Good fit"]}'
        ]
        agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
        response = client.post("/api/agent/chat", json={"message": "Find me a laptop"})
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_product_id"] == "lenovo-loq-15"
        assert "totally-fake-laptop-id" not in data["product_ids"]

    def test_fully_hallucinated_response_returns_honest_no_match(self):
        from app.api import agent
        responses = [
            '{"tool": "search_products", "args": {"query": "laptop", "category": "laptop"}}',
            '{"type": "response", "message": "Found a great match!", "intent": {}, '
            '"recommended_product_id": "fake-1", "product_ids": ["fake-1", "fake-2"], "match_reasons": ["nice"]}'
        ]
        agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
        response = client.post("/api/agent/chat", json={"message": "Find me a laptop"})
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_product_id"] is None
        assert data["product_ids"] == []
        assert data["message"] == NO_MATCH_MESSAGE
        assert data["match_reasons"] == []

    def test_grounded_recommendation_passes_through(self):
        from app.api import agent
        responses = [
            '{"tool": "search_products", "args": {"query": "laptop"}}',
            '{"type": "response", "message": "I found these.", "intent": {"category": "laptop", "requirements": []}, '
            '"recommended_product_id": "lenovo-loq-15", "product_ids": ["lenovo-loq-15"], "match_reasons": ["Good fit"]}'
        ]
        agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
        response = client.post("/api/agent/chat", json={"message": "Find me a laptop"})
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_product_id"] == "lenovo-loq-15"
        assert len(data["products"]) == 1


class TestPriceEnforcementIntegration:
    def test_llm_invented_price_ceiling_is_ignored(self):
        """User gave no price; the LLM's tool call must not be allowed to
        impose one of its own on the actual search."""
        from app.api import agent

        captured_args = {}
        original_search = orchestrator_module.TOOL_REGISTRY["search_products"]

        def spy_search_products(db, **kwargs):
            captured_args.update(kwargs)
            return original_search(db, **kwargs)

        orchestrator_module.TOOL_REGISTRY["search_products"] = spy_search_products
        try:
            responses = [
                '{"tool": "search_products", "args": {"query": "laptop", "max_price": 50000}}',
                '{"type": "response", "message": "ok", "intent": {}, '
                '"recommended_product_id": "lenovo-loq-15", "product_ids": ["lenovo-loq-15"], "match_reasons": []}'
            ]
            agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
            response = client.post("/api/agent/chat", json={"message": "best laptop for work"})
            assert response.status_code == 200
            assert captured_args.get("max_price") is None
        finally:
            orchestrator_module.TOOL_REGISTRY["search_products"] = original_search

    def test_user_explicit_price_is_used(self):
        from app.api import agent

        captured_args = {}
        original_search = orchestrator_module.TOOL_REGISTRY["search_products"]

        def spy_search_products(db, **kwargs):
            captured_args.update(kwargs)
            return original_search(db, **kwargs)

        orchestrator_module.TOOL_REGISTRY["search_products"] = spy_search_products
        try:
            responses = [
                '{"tool": "search_products", "args": {"query": "laptop"}}',
                '{"type": "response", "message": "ok", "intent": {}, '
                '"recommended_product_id": "lenovo-loq-15", "product_ids": ["lenovo-loq-15"], "match_reasons": []}'
            ]
            agent.OllamaProvider = lambda **kwargs: MockLLMProvider(healthy=True, responses=responses)
            response = client.post("/api/agent/chat", json={"message": "gaming laptop under ₹70,000"})
            assert response.status_code == 200
            assert captured_args.get("max_price") == 70000
        finally:
            orchestrator_module.TOOL_REGISTRY["search_products"] = original_search
