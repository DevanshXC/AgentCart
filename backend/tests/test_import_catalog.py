"""
Tests for the Excel catalog ingestion script.
"""
import sys
import os
import pytest
import pandas as pd
import tempfile
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import Base
from app.models.merchant import Merchant
from app.models.product import Product
from scripts.import_catalog import import_catalog_from_excel

SQLALCHEMY_TEST_URL = "sqlite:///./test_importer.db"
test_engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

MERCHANT_ID = "test-merchant-importer"

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    merchant = Merchant(id=MERCHANT_ID, name="Test Merchant", currency="INR")
    db.add(merchant)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestSessionLocal()
    # Clear products before each test
    db.query(Product).delete()
    db.commit()
    yield db
    db.close()

def create_excel(data: list[dict]) -> str:
    """Helper to create a temporary Excel file."""
    df = pd.DataFrame(data)
    fd, path = tempfile.mkstemp(suffix=".xlsx")
    os.close(fd)
    df.to_excel(path, index=False)
    return path

def test_successful_import_and_attribute_mapping(setup_database, db_session):
    data = [{
        "product_id": "test-phone-1",
        "sku": "SKU-PHN-01",
        "product_name": "Test Phone",
        "category": "smartphone",
        "price_inr": 50000,
        "inventory": 10,
        "active": True,
        "camera_mp": 50,
        "camera_ois": True,
        "camera_system": "Triple Leica",
        "battery_mah": 5000,
        "processor_tier": "Snapdragon 8 Gen 3",
        "display_size_in": 6.7,
        "display_type": "AMOLED",
        "refresh_rate_hz": 120
    }]
    path = create_excel(data)
    try:
        stats = import_catalog_from_excel(db_session, path, MERCHANT_ID)
        assert stats["inserted"] == 1
        assert stats["errors"] == []
        
        p = db_session.query(Product).filter(Product.id == "test-phone-1").first()
        assert p is not None
        assert p.price == 50000
        assert p.category == "smartphone"
        assert p.attributes["camera"] == "50MP Triple Leica OIS"
        assert p.attributes["battery"] == "5000mAh"
        assert p.attributes["chipset"] == "Snapdragon 8 Gen 3"
        assert p.attributes["display"] == "6.7 inch AMOLED 120Hz"
    finally:
        os.unlink(path)

def test_import_validation_failures(setup_database, db_session):
    data = [
        {"product_id": "p1", "sku": "s1", "product_name": "N1", "category": "invalid_cat", "price_inr": 10, "inventory": 1},
        {"product_id": "p2", "sku": "s2", "product_name": "N2", "category": "smartphone", "price_inr": -10, "inventory": 1},
        {"product_id": "p3", "sku": "s3", "product_name": "N3", "category": "smartphone", "price_inr": 10, "inventory": -5},
        {"product_id": "", "sku": "s4", "product_name": "N4", "category": "smartphone", "price_inr": 10, "inventory": 1},
        {"product_id": "p5", "sku": "", "product_name": "N5", "category": "smartphone", "price_inr": 10, "inventory": 1},
    ]
    path = create_excel(data)
    try:
        stats = import_catalog_from_excel(db_session, path, MERCHANT_ID)
        assert stats["inserted"] == 0
        assert stats["skipped"] == 5
        assert len(stats["errors"]) == 5
    finally:
        os.unlink(path)

def test_import_idempotency_and_update(setup_database, db_session):
    data1 = [{
        "product_id": "test-idemp", "sku": "SKU-IDEMP", "product_name": "Old Name",
        "category": "laptop", "price_inr": 40000, "inventory": 5
    }]
    path1 = create_excel(data1)
    try:
        stats1 = import_catalog_from_excel(db_session, path1, MERCHANT_ID)
        assert stats1["inserted"] == 1
    finally:
        os.unlink(path1)
        
    data2 = [{
        "product_id": "test-idemp", "sku": "SKU-IDEMP", "product_name": "New Name",
        "category": "laptop", "price_inr": 45000, "inventory": 10
    }]
    path2 = create_excel(data2)
    try:
        stats2 = import_catalog_from_excel(db_session, path2, MERCHANT_ID)
        assert stats2["inserted"] == 0
        assert stats2["updated"] == 1
        
        p = db_session.query(Product).filter(Product.id == "test-idemp").first()
        assert p.name == "New Name"
        assert p.price == 45000
    finally:
        os.unlink(path2)

def test_import_duplicate_sku_rejected(setup_database, db_session):
    data = [
        {"product_id": "p1", "sku": "SKU-SAME", "product_name": "N1", "category": "laptop", "price_inr": 100, "inventory": 1},
        {"product_id": "p2", "sku": "SKU-SAME", "product_name": "N2", "category": "laptop", "price_inr": 100, "inventory": 1},
    ]
    path = create_excel(data)
    try:
        stats = import_catalog_from_excel(db_session, path, MERCHANT_ID)
        assert stats["inserted"] == 1  # First one succeeds
        assert stats["skipped"] == 1   # Second one fails due to duplicate SKU
        assert len(stats["errors"]) == 1
        assert "already used" in stats["errors"][0]
    finally:
        os.unlink(path)
