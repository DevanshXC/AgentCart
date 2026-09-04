"""
Tests for the requirement-specific scoring system in app.agents.tools.

Validates that the new dedicated scorers (camera, performance, gaming,
battery, display) rank products by actual attribute quality rather than
keyword-count.  Uses the same in-memory-SQLite pattern as other backend tests.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.policy import CommercePolicy
from app.agents.tools import (
    search_products as tool_search_products,
    MAX_PRODUCTS_TO_LLM,
    _requirement_relevance_score,
    _detect_requirements,
    _score_camera,
    _score_performance,
    _score_gaming,
    _score_battery,
    _score_display,
)

SQLALCHEMY_TEST_URL = "sqlite:///./test_ranking.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})


@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

MERCHANT_ID = "test-merchant-ranking"


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    merchant = Merchant(id=MERCHANT_ID, name="Ranking Test Merchant", currency="INR")
    db.add(merchant)
    db.flush()

    # ── Phone fixtures with varying camera strength ──
    phones = [
        Product(
            id="phone-cheap-a", merchant_id=MERCHANT_ID, sku="R-PHN-A",
            name="Budget Phone A", description="Entry-level smartphone.",
            category="smartphone", price=10000, currency="INR", inventory=10,
            active=True, attributes={"camera": "8MP", "battery": "3000mAh", "chipset": "Basic"},
        ),
        Product(
            id="phone-cheap-b", merchant_id=MERCHANT_ID, sku="R-PHN-B",
            name="Budget Phone B", description="Entry-level smartphone.",
            category="smartphone", price=12000, currency="INR", inventory=10,
            active=True, attributes={"camera": "12MP", "battery": "3500mAh", "chipset": "Basic"},
        ),
        Product(
            id="phone-cheap-c", merchant_id=MERCHANT_ID, sku="R-PHN-C",
            name="Budget Phone C", description="Entry-level smartphone.",
            category="smartphone", price=14000, currency="INR", inventory=10,
            active=True, attributes={"camera": "12MP", "battery": "4000mAh", "chipset": "Basic"},
        ),
        Product(
            id="phone-cheap-d", merchant_id=MERCHANT_ID, sku="R-PHN-D",
            name="Budget Phone D", description="Entry-level smartphone.",
            category="smartphone", price=16000, currency="INR", inventory=10,
            active=True, attributes={"camera": "13MP", "battery": "4000mAh", "chipset": "Basic"},
        ),
        Product(
            id="phone-cheap-e", merchant_id=MERCHANT_ID, sku="R-PHN-E",
            name="Budget Phone E", description="Entry-level smartphone.",
            category="smartphone", price=18000, currency="INR", inventory=10,
            active=True, attributes={"camera": "13MP", "battery": "4500mAh", "chipset": "Basic"},
        ),
        # Strong camera — should rank #1 for camera queries despite higher price
        Product(
            id="phone-camera-flagship", merchant_id=MERCHANT_ID, sku="R-PHN-CAM",
            name="Camera Flagship Phone", description="Exceptional photo quality.",
            category="smartphone", price=70000, currency="INR", inventory=5,
            active=True, attributes={
                "camera": "200MP Quad OIS Leica, 5x optical zoom, ultrawide",
                "battery": "4500mAh", "chipset": "Snapdragon 8 Gen 3",
            },
        ),
        # Decent camera — mid-tier
        Product(
            id="phone-camera-mid", merchant_id=MERCHANT_ID, sku="R-PHN-CAM-M",
            name="Mid Camera Phone", description="Good triple camera system.",
            category="smartphone", price=40000, currency="INR", inventory=8,
            active=True, attributes={
                "camera": "50MP Triple Hasselblad", "battery": "5000mAh",
                "chipset": "Snapdragon 7 Gen 3",
            },
        ),
        # Strong performance
        Product(
            id="phone-perf-flagship", merchant_id=MERCHANT_ID, sku="R-PHN-PERF",
            name="Performance Flagship Phone", description="Built for speed.",
            category="smartphone", price=55000, currency="INR", inventory=6,
            active=True, attributes={
                "camera": "50MP Dual", "chipset": "Snapdragon 8 Gen 3",
                "ram": "12GB", "battery": "4800mAh",
            },
        ),
        # Strong battery
        Product(
            id="phone-battery-king", merchant_id=MERCHANT_ID, sku="R-PHN-BATT",
            name="Battery King Phone", description="All-day battery life.",
            category="smartphone", price=25000, currency="INR", inventory=15,
            active=True, attributes={
                "camera": "50MP Dual", "battery": "7000mAh",
                "chipset": "Dimensity 6300",
            },
        ),
        # Strong display
        Product(
            id="phone-display-pro", merchant_id=MERCHANT_ID, sku="R-PHN-DISP",
            name="Display Pro Phone", description="Stunning AMOLED screen.",
            category="smartphone", price=45000, currency="INR", inventory=8,
            active=True, attributes={
                "camera": "50MP Triple", "display": "6.8 inch AMOLED 120Hz QHD HDR",
                "battery": "4800mAh", "chipset": "Exynos 2400",
            },
        ),
    ]
    db.add_all(phones)

    # ── Laptop fixtures for gaming queries ──
    laptops = [
        Product(
            id="laptop-budget", merchant_id=MERCHANT_ID, sku="R-LAP-A",
            name="Budget Laptop", description="Everyday computing.",
            category="laptop", price=35000, currency="INR", inventory=10,
            active=True, attributes={
                "gpu": "Integrated", "processor": "Intel Core i3-1215U",
                "ram": "8GB", "display": "15.6 inch FHD",
            },
        ),
        Product(
            id="laptop-gaming-mid", merchant_id=MERCHANT_ID, sku="R-LAP-B",
            name="Gaming Laptop Mid", description="Great for gaming.",
            category="laptop", price=65000, currency="INR", inventory=8,
            active=True, attributes={
                "gpu": "RTX 4050", "processor": "Ryzen 7",
                "ram": "16GB", "display": "15.6 inch FHD 144Hz",
            },
        ),
        Product(
            id="laptop-gaming-high", merchant_id=MERCHANT_ID, sku="R-LAP-C",
            name="Gaming Laptop High", description="Excellent for gaming.",
            category="laptop", price=69000, currency="INR", inventory=5,
            active=True, attributes={
                "gpu": "RTX 4060", "processor": "Intel Core i7-13650HX",
                "ram": "16GB", "display": "16 inch QHD 165Hz",
            },
        ),
    ]
    db.add_all(laptops)

    policy = CommercePolicy(
        merchant_id=MERCHANT_ID, max_order_amount=200000, max_discount_percent=10,
        require_confirmation_above=25000, allowed_currency="INR", active=True,
    )
    db.add(policy)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


# ── Unit tests for individual scorers ──

class TestCameraScorer:
    def test_200mp_ois_leica_scores_high(self):
        h = "200mp quad ois leica, 5x optical zoom, ultrawide"
        score = _score_camera(h)
        # 200/10=20 + ois=5 + optical=4 + ultrawide=2 + leica=6 + quad=4 + zoom already counted via optical
        assert score >= 35.0

    def test_50mp_triple_hasselblad_scores_mid(self):
        h = "50mp triple hasselblad"
        score = _score_camera(h)
        # 50/10=5 + hasselblad=6 + triple=3 = 14
        assert score >= 14.0

    def test_8mp_basic_scores_low(self):
        h = "8mp"
        score = _score_camera(h)
        assert score < 2.0

    def test_na_scores_zero(self):
        h = "n/a"
        score = _score_camera(h)
        assert score == 0.0


class TestPerformanceScorer:
    def test_snapdragon_8_gen_3_with_12gb_ram(self):
        h = "built for speed. snapdragon 8 gen 3 12gb"
        attrs = {"chipset": "Snapdragon 8 Gen 3", "ram": "12GB"}
        score = _score_performance(h, attrs)
        # proc=20 + gpu=0 + ram=12 = 32
        assert score >= 30.0

    def test_basic_chipset_scores_low(self):
        h = "entry-level smartphone. basic"
        attrs = {"chipset": "Basic"}
        score = _score_performance(h, attrs)
        assert score < 10.0


class TestGamingScorer:
    def test_rtx_4060_with_165hz(self):
        h = "excellent for gaming. rtx 4060 16 inch qhd 165hz"
        attrs = {"gpu": "RTX 4060", "display": "16 inch QHD 165Hz"}
        score = _score_gaming(h, attrs)
        # gpu=20 + hz=16.5 + gaming=5 + proc=0 = ~41.5
        assert score >= 35.0

    def test_integrated_gpu_scores_low(self):
        h = "everyday computing. integrated 15.6 inch fhd"
        attrs = {"gpu": "Integrated", "display": "15.6 inch FHD"}
        score = _score_gaming(h, attrs)
        assert score < 10.0


class TestBatteryScorer:
    def test_7000mah_scores_high(self):
        h = "all-day battery life. 7000mah"
        attrs = {"battery": "7000mAh"}
        score = _score_battery(h, attrs)
        # 7000/500=14
        assert score >= 14.0

    def test_3000mah_scores_low(self):
        h = "entry-level smartphone. 3000mah"
        attrs = {"battery": "3000mAh"}
        score = _score_battery(h, attrs)
        assert score < 8.0

    def test_fast_charging_bonus(self):
        h = "100w fast charging 5000mah"
        attrs = {"battery": "5000mAh", "charging": "100W fast charging"}
        score_with = _score_battery(h, attrs)
        h2 = "5000mah"
        attrs2 = {"battery": "5000mAh"}
        score_without = _score_battery(h2, attrs2)
        assert score_with > score_without


class TestDisplayScorer:
    def test_amoled_120hz_qhd_hdr(self):
        h = "stunning amoled screen. 6.8 inch amoled 120hz qhd hdr"
        attrs = {"display": "6.8 inch AMOLED 120Hz QHD HDR"}
        score = _score_display(h, attrs)
        # oled=10 + hz=12 + qhd=10 + hdr=4 = 36
        assert score >= 30.0

    def test_ips_lcd_60hz_fhd_scores_lower(self):
        h = "entry-level smartphone. 6.7 inch ips lcd fhd"
        attrs = {"display": "6.7 inch IPS LCD FHD"}
        score = _score_display(h, attrs)
        # fhd=5, no oled, no high hz
        assert score < 15.0


# ── Ranking integration tests (using tool_search_products against DB) ──

class TestRankingIntegration:
    def _ranked_ids(self, db, query, category="smartphone", max_price=None):
        result = tool_search_products(db, category=category, query=query, max_price=max_price)
        return [p["id"] for p in result["products"]]

    def test_camera_query_ranks_flagship_first(self):
        """Camera flagship must rank above cheap phones for camera queries."""
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best camera phone", max_price=80000)
        db.close()
        assert ids[0] == "phone-camera-flagship"
        assert "phone-camera-mid" in ids[:3]

    def test_camera_query_flagship_in_top5(self):
        """Even at 70,000, camera flagship must survive the top-5 cap."""
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "camera phone", max_price=80000)
        db.close()
        assert "phone-camera-flagship" in ids
        assert len(ids) <= MAX_PRODUCTS_TO_LLM

    def test_performance_query_ranks_flagship_first(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best performance phone", max_price=60000)
        db.close()
        assert ids[0] == "phone-perf-flagship"

    def test_battery_query_ranks_battery_king_first(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best battery phone", max_price=40000)
        db.close()
        assert ids[0] == "phone-battery-king"

    def test_display_query_ranks_display_pro_first(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best display phone", max_price=50000)
        db.close()
        assert ids[0] == "phone-display-pro"

    def test_gaming_laptop_ranks_gpu_laptops_first(self):
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "best gaming laptop", category="laptop", max_price=70000)
        db.close()
        # RTX 4060 should rank above RTX 4050, both above integrated
        assert ids[0] == "laptop-gaming-high"
        assert ids[1] == "laptop-gaming-mid"
        assert ids[2] == "laptop-budget"

    def test_no_requirement_preserves_price_order(self):
        """Query with no recognized requirement must not reorder."""
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "smartphone", max_price=80000)
        db.close()
        # Should be price-ascending (catalog default)
        prices = []
        db2 = TestSessionLocal()
        for pid in ids:
            p = db2.query(Product).filter(Product.id == pid).first()
            prices.append(p.price)
        db2.close()
        assert prices == sorted(prices)

    def test_price_is_tiebreaker_not_primary(self):
        """Among products with different camera quality, the better camera
        must rank higher even if it's more expensive."""
        db = TestSessionLocal()
        ids = self._ranked_ids(db, "camera phone", max_price=80000)
        db.close()
        cam_idx = ids.index("phone-camera-flagship")
        for cheap_id in ["phone-cheap-a", "phone-cheap-b", "phone-cheap-c"]:
            if cheap_id in ids:
                assert cam_idx < ids.index(cheap_id)

    def test_top5_limit_preserved(self):
        db = TestSessionLocal()
        result = tool_search_products(db, category="smartphone", query="phone")
        db.close()
        assert len(result["products"]) <= MAX_PRODUCTS_TO_LLM
