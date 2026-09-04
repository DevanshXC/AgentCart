"""
Script to import the AgentCart merchant catalog from an Excel workbook.

Maps structured specification columns into the flexible JSON 'attributes' column
on the Product model while preserving the core schema (price, inventory, category, etc.).
"""
import sys
import os
import argparse
import pandas as pd
from typing import Dict, Any

# Ensure backend directory is in path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.product import Product

VALID_CATEGORIES = {
    "smartphone", "laptop", "audio", "monitor", "smartwatch",
    "tablet", "camera", "gaming", "accessory", "smarthome", "storage"
}

def is_valid_str(val: Any) -> bool:
    if pd.isna(val):
        return False
    if isinstance(val, str) and val.strip() == "":
        return False
    return True

def format_value(val: Any, suffix: str = "") -> str:
    if isinstance(val, float):
        if val.is_integer():
            return f"{int(val)}{suffix}"
    return f"{val}{suffix}"

def import_catalog_from_excel(db: Session, excel_path: str, merchant_id: str) -> dict:
    """Reads the Excel catalog, maps columns, and upserts into PostgreSQL."""
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Catalog file not found: {excel_path}")
    
    print(f"Reading catalog from {excel_path}...")
    df = pd.read_excel(excel_path)
    
    # Track statistics
    stats = {
        "processed": 0,
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Process each row
    for index, row in df.iterrows():
        try:
            stats["processed"] += 1
            
            # 1. Base Validations
            product_id = row.get("product_id")
            if not is_valid_str(product_id):
                stats["errors"].append(f"Row {index + 2}: missing product_id")
                stats["skipped"] += 1
                continue
                
            sku = row.get("sku")
            if not is_valid_str(sku):
                stats["errors"].append(f"Row {index + 2} ({product_id}): missing sku")
                stats["skipped"] += 1
                continue
                
            category_raw = str(row.get("category", "")).lower().strip()
            
            # Normalize plurals and spaces
            category_mapping = {
                "smartphones": "smartphone",
                "laptops": "laptop",
                "monitors": "monitor",
                "smartwatches": "smartwatch",
                "tablets": "tablet",
                "cameras": "camera",
                "accessories": "accessory",
                "smart home": "smarthome"
            }
            category = category_mapping.get(category_raw, category_raw)
            
            if category not in VALID_CATEGORIES:
                stats["errors"].append(f"Row {index + 2} ({product_id}): invalid category '{category_raw}'")
                stats["skipped"] += 1
                continue
                
            price = row.get("price_inr")
            if pd.isna(price) or price <= 0:
                stats["errors"].append(f"Row {index + 2} ({product_id}): invalid price '{price}'")
                stats["skipped"] += 1
                continue
                
            inventory = row.get("inventory")
            if pd.isna(inventory) or inventory < 0:
                stats["errors"].append(f"Row {index + 2} ({product_id}): invalid inventory '{inventory}'")
                stats["skipped"] += 1
                continue
                
            # Booleans
            active_val = row.get("active")
            is_active = True if pd.isna(active_val) else bool(active_val)

            # 2. Build Attributes JSON (Requirement mapping)
            attributes = {}
            
            # --- CAMERA mapping ---
            if is_valid_str(row.get("camera_mp")):
                attributes["camera"] = format_value(row["camera_mp"], "MP")
                if is_valid_str(row.get("camera_system")):
                    attributes["camera"] += f" {row['camera_system']}"
                if row.get("camera_ois") == True:
                    attributes["camera"] += " OIS"
                if row.get("camera_telephoto") == True:
                    attributes["camera"] += " Telephoto"
                if row.get("camera_ultrawide") == True:
                    attributes["camera"] += " Ultrawide"
                if row.get("camera_periscope") == True:
                    attributes["camera"] += " Periscope"
                if is_valid_str(row.get("camera_optical_zoom")):
                    attributes["camera"] += f" {format_value(row['camera_optical_zoom'])}x optical zoom"
            elif is_valid_str(row.get("camera_system")): # fallback if MP is missing but system described
                attributes["camera"] = str(row["camera_system"])
                
            # --- PERFORMANCE / COMPUTING mapping ---
            if is_valid_str(row.get("processor")):
                attributes["processor"] = str(row["processor"])
            if is_valid_str(row.get("processor_tier")):
                attributes["chipset"] = str(row["processor_tier"])
                
            if is_valid_str(row.get("gpu")):
                attributes["gpu"] = str(row["gpu"])
            if is_valid_str(row.get("gpu_tier")):
                # if tier is different from gpu string, append it for better matching
                if is_valid_str(row.get("gpu")) and str(row["gpu_tier"]) not in str(row["gpu"]):
                    attributes["gpu"] += f" {row['gpu_tier']}"
                elif not is_valid_str(row.get("gpu")):
                    attributes["gpu"] = str(row["gpu_tier"])

            if is_valid_str(row.get("ram_gb")):
                attributes["ram"] = format_value(row["ram_gb"], "GB")
                
            if is_valid_str(row.get("storage_gb")):
                if int(row["storage_gb"]) >= 1000:
                    val = int(row["storage_gb"]) / 1000
                    attributes["storage"] = format_value(val, "TB")
                else:
                    attributes["storage"] = format_value(row["storage_gb"], "GB")

            # --- BATTERY mapping ---
            if is_valid_str(row.get("battery_mah")):
                attributes["battery"] = format_value(row["battery_mah"], "mAh")
            if is_valid_str(row.get("battery_life_hours")):
                attributes["battery_life"] = format_value(row["battery_life_hours"], " hours")
            if is_valid_str(row.get("charging_watts")):
                attributes["charging"] = format_value(row["charging_watts"], "W fast charging")
                
            # --- DISPLAY mapping ---
            display_parts = []
            if is_valid_str(row.get("display_size_in")):
                display_parts.append(format_value(row["display_size_in"], " inch"))
            if is_valid_str(row.get("display_type")):
                display_parts.append(str(row["display_type"]))
            if is_valid_str(row.get("refresh_rate_hz")):
                display_parts.append(format_value(row["refresh_rate_hz"], "Hz"))
            if is_valid_str(row.get("resolution")):
                display_parts.append(str(row["resolution"]))
            if row.get("hdr") == True:
                display_parts.append("HDR")
            
            if display_parts:
                attributes["display"] = " ".join(display_parts)
                
            # --- AUDIO mapping ---
            if is_valid_str(row.get("audio_type")):
                attributes["type"] = str(row["audio_type"])
            if is_valid_str(row.get("anc")):
                if isinstance(row["anc"], bool) and row["anc"]:
                    attributes["anc"] = "Active Noise Cancellation"
                elif isinstance(row["anc"], str):
                    attributes["anc"] = str(row["anc"])
            if is_valid_str(row.get("microphone")):
                attributes["microphone"] = "Yes" if row["microphone"] == True else str(row["microphone"])
            if is_valid_str(row.get("battery_hours_audio")):
                attributes["battery"] = format_value(row["battery_hours_audio"], " hours")

            # --- OTHER mapping ---
            if is_valid_str(row.get("weight_kg")):
                attributes["weight"] = format_value(row["weight_kg"], "kg")
            if is_valid_str(row.get("water_resistance")):
                attributes["water_resistance"] = str(row["water_resistance"])
            if is_valid_str(row.get("connectivity")):
                attributes["connectivity"] = str(row["connectivity"])

            # 3. Handle images safely
            image_url = row.get("image_url", "")
            if not is_valid_str(image_url):
                image_url = f"/products/placeholders/{category}.svg"
            hero_image_url = row.get("hero_image_url", "")
            if not is_valid_str(hero_image_url):
                hero_image_url = f"/products/placeholders/{category}.svg"

            # 4. Check uniqueness and UPSERT
            db.begin_nested()
            existing = db.query(Product).filter(Product.id == product_id).first()
            if existing:
                # Ensure SKU matches if ID matches, else fail
                if existing.sku != sku:
                    # check if the new SKU is owned by another product
                    conflict = db.query(Product).filter(Product.sku == sku, Product.id != product_id).first()
                    if conflict:
                        stats["errors"].append(f"Row {index + 2} ({product_id}): SKU {sku} already used by {conflict.id}")
                        stats["skipped"] += 1
                        db.rollback()
                        continue

                existing.sku = sku
                existing.name = str(row["product_name"])
                existing.description = str(row.get("description", "")) if is_valid_str(row.get("description")) else None
                existing.category = category
                existing.price = int(price)
                existing.inventory = int(inventory)
                existing.active = is_active
                existing.attributes = attributes
                existing.image_url = str(image_url)
                existing.hero_image_url = str(hero_image_url)
                stats["updated"] += 1
            else:
                # check if SKU already exists for a different ID
                conflict = db.query(Product).filter(Product.sku == sku).first()
                if conflict:
                    stats["errors"].append(f"Row {index + 2} ({product_id}): SKU {sku} already used by {conflict.id}")
                    stats["skipped"] += 1
                    db.rollback()
                    continue

                new_product = Product(
                    id=product_id,
                    merchant_id=merchant_id,
                    sku=sku,
                    name=str(row["product_name"]),
                    description=str(row.get("description", "")) if is_valid_str(row.get("description")) else None,
                    category=category,
                    price=int(price),
                    currency="INR",
                    inventory=int(inventory),
                    active=is_active,
                    attributes=attributes,
                    image_url=str(image_url),
                    hero_image_url=str(hero_image_url)
                )
                db.add(new_product)
                db.flush()
                stats["inserted"] += 1
            
            db.commit() # commit the nested transaction
                
        except IntegrityError as e:
            db.rollback() # rollback nested transaction
            stats["errors"].append(f"Row {index + 2} ({row.get('product_id', 'unknown')}): Integrity Error - {str(e.orig)}")
            stats["skipped"] += 1
        except Exception as e:
            db.rollback() # rollback nested transaction (if any active)
            stats["errors"].append(f"Row {index + 2} ({row.get('product_id', 'unknown')}): Exception - {str(e)}")
            stats["skipped"] += 1
            
    db.commit()
    print(f"Import Complete! Processed: {stats['processed']} | Inserted: {stats['inserted']} | Updated: {stats['updated']} | Skipped: {stats['skipped']}")
    if stats["errors"]:
        print("Errors encountered:")
        for err in stats["errors"]:
            print(f"  - {err}")
            
    return stats

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import Merchant Catalog from Excel")
    parser.add_argument("excel_path", help="Path to the Excel file (e.g., AgentCart_Merchant_Catalog.xlsx)")
    parser.add_argument("--merchant-id", default="merchant-demo-001", help="Merchant ID to associate with products")
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        import_catalog_from_excel(db, args.excel_path, args.merchant_id)
    finally:
        db.close()
