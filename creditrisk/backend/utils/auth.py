"""JWT authentication utilities."""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g

SECRET_KEY = os.environ.get('JWT_SECRET', 'dev-secret-change-in-production-32chars!!')
TOKEN_EXPIRY_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def generate_token(user_id: str, username: str, email: str) -> str:
    payload = {
        'sub':      user_id,
        'username': username,
        'email':    email,
        'iat':      datetime.utcnow(),
        'exp':      datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        token = auth_header[7:]
        try:
            payload = decode_token(token)
            g.user_id   = payload['sub']
            g.username  = payload['username']
            g.email     = payload['email']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Auth that sets g.user_id if token present, but doesn't block."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        g.user_id  = None
        g.username = 'anonymous'
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            try:
                payload = decode_token(token)
                g.user_id  = payload['sub']
                g.username = payload['username']
                g.email    = payload['email']
            except Exception:
                pass
        return f(*args, **kwargs)
    return decorated
