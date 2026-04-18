"""
Authentication routes — signup, login, profile.
"""

from flask import Blueprint, request, jsonify, g
from utils.auth import hash_password, verify_password, generate_token, require_auth
from utils.validators import validate_auth_input, require_json
from database.operations import create_user, find_user_by_email, find_user_by_username

auth_bp = Blueprint('auth', __name__)


# =========================
# ✅ SIGNUP
# =========================
@auth_bp.route('/signup', methods=['POST'])
@require_json
def signup():
    data = request.get_json()

    valid, errors = validate_auth_input(data, signup=True)
    if not valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 422

    username  = data['username'].strip().lower()
    email     = data['email'].strip().lower()
    full_name = data.get('full_name', '').strip()
    password  = data['password']

    # Check existing user
    if find_user_by_email(email):
        return jsonify({'error': 'Email already registered'}), 409

    if find_user_by_username(username):
        return jsonify({'error': 'Username already taken'}), 409

    # Create user
    pwd_hash = hash_password(password)
    user_id  = create_user(username, email, pwd_hash)

    if not user_id:
        return jsonify({'error': 'Failed to create account'}), 500

    # Generate token
    token = generate_token(str(user_id), username, email)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': str(user_id),
            'username': username,
            'email': email,
            'full_name': full_name,
        },
        'message': 'Account created successfully'
    }), 201


# =========================
# ✅ LOGIN (FIXED)
# =========================
@auth_bp.route('/login', methods=['POST'])
@require_json
def login():
    data = request.get_json()

    # 🔥 Debug (you can remove later)
    print("LOGIN DATA:", data)

    valid, errors = validate_auth_input(data, signup=False)
    if not valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 422

    # 🔥 FIX: accept username OR email
    identifier = data.get('username') or data.get('email')

    if not identifier:
        return jsonify({'error': 'Username or email required'}), 400

    identifier = identifier.strip().lower()
    password = data['password']

    # Find user
    user = find_user_by_email(identifier) or find_user_by_username(identifier)

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    if not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Generate token
    user_id  = str(user['_id'])
    username = user['username']
    email    = user['email']

    token = generate_token(user_id, username, email)

    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user_id,
            'username': username,
            'email': email,
        }
    }), 200


# =========================
# ✅ PROFILE
# =========================
@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_profile():
    return jsonify({
        'success': True,
        'user': {
            'id': g.user_id,
            'username': g.username,
            'email': g.email,
        }
    }), 200


# =========================
# ✅ LOGOUT
# =========================
@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    return jsonify({
        'success': True,
        'message': 'Logged out'
    }), 200
