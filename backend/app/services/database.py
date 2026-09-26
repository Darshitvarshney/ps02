import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from pymongo import MongoClient, GEOSPHERE, ASCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("DB_NAME", "naksha_cadastre")

class SpatialDatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False
        self._connect()

    def _connect(self):
        if not MONGO_URI:
            print("[Spatial DB] Notice: MONGO_URI not configured. Operating in fallback mode.")
            self.is_connected = False
            return
        try:
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
            self.client.admin.command('ping')
            self.db = self.client[DB_NAME]
            self.is_connected = True
            print(f"[Spatial DB] Connected to Database: '{DB_NAME}'")
            self._ensure_indexes()
        except Exception as e:
            print(f"[Spatial DB] Notice: Connection failed ({e}). Operating in fallback mode.")
            self.is_connected = False

    def _ensure_indexes(self):
        if not self.is_connected or self.db is None:
            return
        try:
            # 2dsphere spatial indexes for fast geospatial polygon operations
            self.db.cadastral_parcels.create_index([("geometry", GEOSPHERE)])
            self.db.ai_buildings.create_index([("geometry", GEOSPHERE)])
            self.db.utility_networks.create_index([("geometry", GEOSPHERE)])
            self.db.revenue_records.create_index([("khasra_no", ASCENDING)], unique=True)
            self.db.conflicts_log.create_index([("conflict_id", ASCENDING)])
            self.db.pipeline_runs.create_index([("run_id", ASCENDING)], unique=True)
            self.db.passbooks.create_index([("khasra_no", ASCENDING)])
            print("[MongoDB Spatial DB] Created 2dsphere and unique indexes successfully.")
        except Exception as e:
            print(f"[MongoDB Spatial DB] Index creation notice: {e}")

    def seed_initial_datasets(self, mock_generator):
        """
        Seeds initial benchmark multi-source layers into MongoDB Atlas if empty.
        """
        if not self.is_connected or self.db is None:
            return False

        try:
            # 1. Cadastral parcels
            if self.db.cadastral_parcels.count_documents({}) == 0:
                parcels = mock_generator.get_legacy_cadastral()["features"]
                for p in parcels:
                    doc = dict(p)
                    doc["_id"] = p.get("id") or f"cad-{p.get('properties', {}).get('khasra_no')}"
                    doc["updated_at"] = datetime.now()
                    self.db.cadastral_parcels.replace_one({"_id": doc["_id"]}, doc, upsert=True)
                print(f"[MongoDB] Seeded {len(parcels)} cadastral parcels.")

            # 2. Revenue Records (RoR)
            if self.db.revenue_records.count_documents({}) == 0:
                rev_recs = mock_generator.get_revenue_records()
                for r in rev_recs:
                    doc = dict(r)
                    doc["_id"] = f"ror-{r['khasra_no']}"
                    doc["updated_at"] = datetime.now()
                    self.db.revenue_records.replace_one({"_id": doc["_id"]}, doc, upsert=True)
                print(f"[MongoDB] Seeded {len(rev_recs)} revenue RoR records.")

            # 3. AI Building Footprints
            if self.db.ai_buildings.count_documents({}) == 0:
                blds = mock_generator.get_ai_building_footprints()["features"]
                for b in blds:
                    doc = dict(b)
                    doc["_id"] = b.get("id") or f"bld-{b.get('properties', {}).get('building_id')}"
                    doc["updated_at"] = datetime.now()
                    self.db.ai_buildings.replace_one({"_id": doc["_id"]}, doc, upsert=True)
                print(f"[MongoDB] Seeded {len(blds)} AI building footprints.")

            # 4. Utility Networks
            if self.db.utility_networks.count_documents({}) == 0:
                utls = mock_generator.get_utility_networks()["features"]
                for u in utls:
                    doc = dict(u)
                    doc["_id"] = u.get("id")
                    doc["updated_at"] = datetime.now()
                    self.db.utility_networks.replace_one({"_id": doc["_id"]}, doc, upsert=True)
                print(f"[MongoDB] Seeded {len(utls)} utility networks.")

            return True
        except Exception as e:
            print(f"[MongoDB] Seeding error: {e}")
            return False

    def save_pipeline_run(self, run_response: Dict[str, Any]):
        """
        Saves full harmonization execution run and confidence distribution to MongoDB.
        """
        if not self.is_connected or self.db is None:
            return False
        try:
            doc = {
                "_id": run_response.get("run_id"),
                "run_id": run_response.get("run_id"),
                "timestamp": datetime.now(),
                "execution_time_ms": run_response.get("execution_time_ms"),
                "status": run_response.get("status"),
                "summary_metrics": run_response.get("summary_metrics"),
                "change_detection": run_response.get("change_detection_results"),
                "elevation_insights": run_response.get("elevation_insights")
            }
            self.db.pipeline_runs.replace_one({"_id": doc["_id"]}, doc, upsert=True)
            return True
        except Exception as e:
            print(f"[MongoDB] Save pipeline error: {e}")
            return False

    def save_conflict_resolution(self, conflict_id: str, action_taken: str, justification: str, resolved_by: str = "System"):
        if not self.is_connected or self.db is None:
            return False
        try:
            entry = {
                "conflict_id": conflict_id,
                "timestamp": datetime.now(),
                "action_taken": action_taken,
                "justification": justification,
                "resolved_by": resolved_by
            }
            self.db.conflicts_log.insert_one(entry)
            return True
        except Exception as e:
            print(f"[MongoDB] Conflict log error: {e}")
            return False

    def save_passbook(self, passbook_data: Dict[str, Any]):
        if not self.is_connected or self.db is None:
            return False
        try:
            doc = dict(passbook_data)
            doc["_id"] = passbook_data.get("passbook_id")
            doc["saved_at"] = datetime.now()
            self.db.passbooks.replace_one({"_id": doc["_id"]}, doc, upsert=True)
            return True
        except Exception as e:
            print(f"[MongoDB] Save passbook error: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        if not self.is_connected or self.db is None:
            return {
                "connected": False,
                "database": DB_NAME,
                "status": "In-Memory / Fallback Mode"
            }
        cluster_host = "Spatial Cluster"
        if "@" in MONGO_URI:
            cluster_host = MONGO_URI.split("@")[-1].split("/")[0].split("?")[0]
        try:
            return {
                "connected": True,
                "database": DB_NAME,
                "cluster": cluster_host,
                "collections": {
                    "cadastral_parcels": self.db.cadastral_parcels.count_documents({}),
                    "revenue_records": self.db.revenue_records.count_documents({}),
                    "ai_buildings": self.db.ai_buildings.count_documents({}),
                    "utility_networks": self.db.utility_networks.count_documents({}),
                    "pipeline_runs": self.db.pipeline_runs.count_documents({}),
                    "conflicts_log": self.db.conflicts_log.count_documents({}),
                    "passbooks": self.db.passbooks.count_documents({})
                },
                "indexes": [
                    "cadastral_parcels (geometry 2dsphere)",
                    "ai_buildings (geometry 2dsphere)",
                    "utility_networks (geometry 2dsphere)",
                    "revenue_records (khasra_no unique)"
                ],
                "status": "Live & Synchronized"
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

spatial_db = SpatialDatabaseManager()
