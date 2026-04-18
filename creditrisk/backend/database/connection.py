"""
MongoDB Atlas Connection Manager
Handles connection pooling and provides collection accessors
"""

import os
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is not None:
        return _db

    mongo_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')

    try:
        _client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=50,
            retryWrites=True
        )
        # Verify connection
        _client.admin.command('ping')
        _db = _client['loan_prediction_db']
        print("✓ MongoDB connected successfully")
        _ensure_indexes(_db)
        return _db
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print(f"⚠ MongoDB unavailable, using in-memory store: {e}")
        return None


def _ensure_indexes(db):
    """Create indexes for performance."""
    try:
        db.predictions.create_index([('user_id', 1), ('timestamp', DESCENDING)])
        db.predictions.create_index([('timestamp', DESCENDING)])
        db.users.create_index([('email', 1)], unique=True)
        db.users.create_index([('username', 1)], unique=True)
    except Exception:
        pass


# ─── In-Memory Fallback Store ────────────────────────────────────────────────
class InMemoryStore:
    """Fallback when MongoDB is unavailable (demo mode)."""
    def __init__(self):
        self._predictions = []
        self._users = []
        self._counter = 0

    def insert_prediction(self, doc):
        self._counter += 1
        doc['_id'] = str(self._counter)
        self._predictions.append(doc)
        return doc['_id']

    def get_predictions(self, user_id=None, page=1, per_page=10):
        data = self._predictions
        if user_id:
            data = [p for p in data if p.get('user_id') == user_id]
        data = sorted(data, key=lambda x: x.get('timestamp', ''), reverse=True)
        total = len(data)
        start = (page - 1) * per_page
        return data[start:start + per_page], total

    def insert_user(self, doc):
        self._counter += 1
        doc['_id'] = str(self._counter)
        self._users.append(doc)
        return doc['_id']

    def find_user(self, query):
        for u in self._users:
            if all(u.get(k) == v for k, v in query.items()):
                return u
        return None

    def get_stats(self, user_id=None):
        data = self._predictions
        if user_id:
            data = [p for p in data if p.get('user_id') == user_id]
        total = len(data)
        approved = sum(1 for p in data if p.get('prediction') == 'Approved')
        rejected = total - approved
        avg_risk = sum(p.get('risk_score', 0) for p in data) / total if total else 0
        return {'total': total, 'approved': approved,
                'rejected': rejected, 'avg_risk_score': round(avg_risk, 1)}


_memory_store = InMemoryStore()


def get_store():
    """Returns MongoDB db or in-memory fallback."""
    db = get_db()
    return db if db is not None else _memory_store
