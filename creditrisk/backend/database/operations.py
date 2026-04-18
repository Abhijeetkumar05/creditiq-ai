"""
Database service layer — abstracts MongoDB vs in-memory fallback
"""

from datetime import datetime
from bson import ObjectId
from database.connection import get_store, get_db


def _serialize(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    if 'timestamp' in doc and isinstance(doc['timestamp'], datetime):
        doc['timestamp'] = doc['timestamp'].isoformat()
    doc.pop('password_hash', None)
    return doc


# ─── Predictions ─────────────────────────────────────────────────────────────
def save_prediction(data: dict) -> str:
    store = get_store()
    data['timestamp'] = datetime.utcnow()

    db = get_db()
    if db is not None:
        result = db.predictions.insert_one(data)
        return str(result.inserted_id)
    else:
        return store.insert_prediction(data)


def get_predictions(user_id=None, page=1, per_page=10):
    db = get_db()
    if db is not None:
        query = {'user_id': user_id} if user_id else {}
        skip = (page - 1) * per_page
        cursor = db.predictions.find(query).sort('timestamp', -1).skip(skip).limit(per_page)
        total = db.predictions.count_documents(query)
        docs = [_serialize(d) for d in cursor]
        return docs, total
    else:
        store = get_store()
        docs, total = store.get_predictions(user_id=user_id, page=page, per_page=per_page)
        return [_serialize(d) for d in docs], total


def get_stats(user_id=None):
    db = get_db()
    if db is not None:
        query = {'user_id': user_id} if user_id else {}
        total = db.predictions.count_documents(query)
        approved = db.predictions.count_documents({**query, 'prediction': 'Approved'})
        pipeline = [
            {'$match': query},
            {'$group': {'_id': None, 'avg': {'$avg': '$risk_score'}}}
        ]
        agg = list(db.predictions.aggregate(pipeline))
        avg_risk = round(agg[0]['avg'], 1) if agg else 0.0
        return {
            'total': total,
            'approved': approved,
            'rejected': total - approved,
            'avg_risk_score': avg_risk
        }
    else:
        return get_store().get_stats(user_id=user_id)


# ─── Users ────────────────────────────────────────────────────────────────────
def create_user(username: str, email: str, password_hash: str) -> str:
    doc = {
        'username': username,
        'email': email,
        'password_hash': password_hash,
        'created_at': datetime.utcnow(),
        'role': 'analyst'
    }
    db = get_db()
    if db is not None:
        result = db.users.insert_one(doc)
        return str(result.inserted_id)
    else:
        return get_store().insert_user(doc)


def find_user_by_email(email: str):
    db = get_db()
    if db is not None:
        return db.users.find_one({'email': email})
    else:
        return get_store().find_user({'email': email})


def find_user_by_username(username: str):
    db = get_db()
    if db is not None:
        return db.users.find_one({'username': username})
    else:
        return get_store().find_user({'username': username})
