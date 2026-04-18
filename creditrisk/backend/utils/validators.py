"""Input validation and sanitization utilities."""

from functools import wraps
from flask import request, jsonify
import re


EMPLOYMENT_STATUS_VALUES = ['Employed', 'Self-Employed', 'Part-Time', 'Unemployed']
EDUCATION_VALUES         = ['High School', 'Associate', 'Bachelor', 'Master', 'PhD']
HOME_OWNERSHIP_VALUES    = ['Rent', 'Own', 'Mortgage', 'Other']
LOAN_PURPOSE_VALUES      = ['Debt Consolidation', 'Home Improvement', 'Business',
                             'Education', 'Medical', 'Other']
LOAN_TERM_VALUES         = [12, 24, 36, 48, 60, 84]


def validate_prediction_input(data: dict) -> tuple[bool, list]:
    errors = []

    # Required numeric fields
    numeric_checks = [
        ('age',              18,    80,   'Age must be between 18 and 80'),
        ('annual_income',    1000,  1e8,  'Annual income must be between $1,000 and $100M'),
        ('loan_amount',      500,   1e7,  'Loan amount must be between $500 and $10M'),
        ('credit_score',     300,   850,  'Credit score must be between 300 and 850'),
    ]
    for field, mn, mx, msg in numeric_checks:
        val = data.get(field)
        if val is None:
            errors.append(f'{field} is required')
        else:
            try:
                v = float(val)
                if not (mn <= v <= mx):
                    errors.append(msg)
            except (ValueError, TypeError):
                errors.append(f'{field} must be a valid number')

    # Optional numeric fields
    optional_numeric = [
        ('employment_years',     0,   50,   'Employment years must be 0-50'),
        ('num_credit_lines',     0,   50,   'Credit lines must be 0-50'),
        ('debt_to_income_ratio', 0,   2.0,  'DTI ratio must be 0-2.0'),
        ('num_derogatory_marks', 0,   20,   'Derogatory marks must be 0-20'),
    ]
    for field, mn, mx, msg in optional_numeric:
        val = data.get(field)
        if val is not None:
            try:
                v = float(val)
                if not (mn <= v <= mx):
                    errors.append(msg)
            except (ValueError, TypeError):
                errors.append(f'{field} must be a valid number')

    # Loan term
    lt = data.get('loan_term')
    if lt is not None:
        try:
            if int(lt) not in LOAN_TERM_VALUES:
                errors.append(f'Loan term must be one of: {LOAN_TERM_VALUES}')
        except (ValueError, TypeError):
            errors.append('Loan term must be an integer')

    # Categorical fields
    cat_checks = [
        ('employment_status', EMPLOYMENT_STATUS_VALUES),
        ('education_level',   EDUCATION_VALUES),
        ('home_ownership',    HOME_OWNERSHIP_VALUES),
        ('loan_purpose',      LOAN_PURPOSE_VALUES),
    ]
    for field, allowed in cat_checks:
        val = data.get(field)
        if val is not None and val not in allowed:
            errors.append(f'{field} must be one of: {allowed}')

    return len(errors) == 0, errors


def validate_auth_input(data: dict, signup=False) -> tuple[bool, list]:
    errors = []

    username = data.get('username', '')
    password = data.get('password', '')

    if not username or len(username) < 3:
        errors.append('Username must be at least 3 characters')
    if not re.match(r'^[a-zA-Z0-9_]+$', username or ''):
        errors.append('Username must contain only letters, numbers, and underscores')

    if not password or len(password) < 8:
        errors.append('Password must be at least 8 characters')

    if signup:
        email = data.get('email', '')
        if not email or not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            errors.append('Valid email address is required')
        full_name = data.get('full_name', '')
        if not full_name or len(full_name.strip()) < 2:
            errors.append('Full name is required')

    return len(errors) == 0, errors


def require_json(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 415
        return f(*args, **kwargs)
    return decorated
