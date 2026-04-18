"""
ML Prediction Service
Loads trained model and provides inference with calibrated risk scoring
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

_model = None
_metadata = None

# ✅ FIXED PATH (IMPORTANT)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'ml', 'artifacts'))


def _load_model():
    global _model, _metadata
    if _model is not None:
        return _model, _metadata

    model_path = os.path.join(ARTIFACTS_DIR, 'best_model.pkl')
    meta_path = os.path.join(ARTIFACTS_DIR, 'model_metadata.json')

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run ml/train_model.py first."
        )

    _model = joblib.load(model_path)

    if os.path.exists(meta_path):
        with open(meta_path) as f:
            _metadata = json.load(f)
    else:
        _metadata = {}

    print(f"✓ Loaded model: {_metadata.get('best_model', 'Unknown')}")
    return _model, _metadata


# ─── Features ─────────────────────────────────────────────
NUMERIC_FEATURES = [
    'age', 'annual_income', 'loan_amount', 'loan_term', 'credit_score',
    'employment_years', 'num_credit_lines', 'debt_to_income_ratio',
    'num_derogatory_marks'
]

CATEGORICAL_FEATURES = [
    'employment_status', 'education_level', 'home_ownership', 'loan_purpose'
]


# ─── Risk Band Logic ─────────────────────────────────────
def _get_risk_band(prob_rejection: float) -> dict:
    score = round(prob_rejection * 100, 1)

    if score < 25:
        return {'score': score, 'band': 'Low', 'color': '#22c55e', 'label': 'LOW RISK'}
    elif score < 50:
        return {'score': score, 'band': 'Medium', 'color': '#f59e0b', 'label': 'MEDIUM RISK'}
    elif score < 75:
        return {'score': score, 'band': 'High', 'color': '#f97316', 'label': 'HIGH RISK'}
    else:
        return {'score': score, 'band': 'Very High', 'color': '#ef4444', 'label': 'VERY HIGH RISK'}


# ─── Prediction Function ─────────────────────────────────
def predict(input_data: dict) -> dict:
    model, metadata = _load_model()

    df = pd.DataFrame([{
        'age': float(input_data['age']),
        'annual_income': float(input_data['annual_income']),
        'loan_amount': float(input_data['loan_amount']),
        'loan_term': float(input_data['loan_term']),
        'credit_score': float(input_data['credit_score']),
        'employment_years': float(input_data.get('employment_years', 3)),
        'num_credit_lines': float(input_data.get('num_credit_lines', 5)),
        'debt_to_income_ratio': float(input_data.get('debt_to_income_ratio', 0.3)),
        'num_derogatory_marks': float(input_data.get('num_derogatory_marks', 0)),
        'employment_status': str(input_data.get('employment_status', 'Employed')),
        'education_level': str(input_data.get('education_level', 'Bachelor')),
        'home_ownership': str(input_data.get('home_ownership', 'Rent')),
        'loan_purpose': str(input_data.get('loan_purpose', 'Debt Consolidation')),
    }])

    pred_class = int(model.predict(df)[0])
    pred_proba = model.predict_proba(df)[0]

    prob_approved = float(pred_proba[1])
    prob_rejected = float(pred_proba[0])

    prediction = 'Approved' if pred_class == 1 else 'Rejected'

    # ✅ FIXED CONFIDENCE LOGIC
    confidence = prob_approved if prediction == 'Approved' else prob_rejected

    risk = _get_risk_band(prob_rejected)

    factors = _generate_factors(input_data)

    return {
        'prediction': prediction,
        'confidence': round(confidence * 100, 1),
        'prob_approved': round(prob_approved * 100, 1),
        'prob_rejected': round(prob_rejected * 100, 1),
        'risk_score': risk['score'],
        'risk_band': risk['band'],
        'risk_color': risk['color'],
        'risk_label': risk['label'],
        'key_factors': factors,
        'model_used': metadata.get('best_model', 'Unknown'),
        'model_auc': metadata.get('auc_score', 0),
    }


# ─── Explainability ─────────────────────────────────────
def _generate_factors(data: dict) -> list:
    factors = []

    cs = float(data.get('credit_score', 650))
    dti = float(data.get('debt_to_income_ratio', 0.3))
    income = float(data.get('annual_income', 50000))
    loan = float(data.get('loan_amount', 20000))
    emp_status = data.get('employment_status', 'Employed')
    derog = float(data.get('num_derogatory_marks', 0))

    if cs >= 750:
        factors.append({'factor': 'Excellent Credit Score', 'impact': 'positive', 'value': str(cs)})
    elif cs >= 650:
        factors.append({'factor': 'Good Credit Score', 'impact': 'neutral', 'value': str(cs)})
    else:
        factors.append({'factor': 'Low Credit Score', 'impact': 'negative', 'value': str(cs)})

    if dti <= 0.2:
        factors.append({'factor': 'Low Debt-to-Income Ratio', 'impact': 'positive', 'value': f'{dti:.0%}'})
    elif dti <= 0.4:
        factors.append({'factor': 'Moderate Debt-to-Income', 'impact': 'neutral', 'value': f'{dti:.0%}'})
    else:
        factors.append({'factor': 'High Debt-to-Income Ratio', 'impact': 'negative', 'value': f'{dti:.0%}'})

    ratio = loan / income if income > 0 else 0
    if ratio <= 0.3:
        factors.append({'factor': 'Conservative Loan-to-Income', 'impact': 'positive', 'value': f'{ratio:.1f}x'})
    elif ratio > 0.8:
        factors.append({'factor': 'High Loan-to-Income Ratio', 'impact': 'negative', 'value': f'{ratio:.1f}x'})

    if emp_status == 'Employed':
        factors.append({'factor': 'Stable Employment', 'impact': 'positive', 'value': emp_status})
    elif emp_status == 'Unemployed':
        factors.append({'factor': 'No Current Employment', 'impact': 'negative', 'value': emp_status})

    if derog > 0:
        factors.append({'factor': 'Derogatory Credit Marks', 'impact': 'negative', 'value': f'{int(derog)} mark(s)'})

    return factors[:5]


# ─── Model Info ─────────────────────────────────────────
def get_model_info() -> dict:
    _, metadata = _load_model()

    return {
        'best_model': metadata.get('best_model'),
        'accuracy': metadata.get('accuracy'),
        'auc_score': metadata.get('auc_score'),
        'f1_score': metadata.get('f1_score'),
        'model_comparison': metadata.get('model_comparison', {}),
        'feature_importance': metadata.get('feature_importance', {}),
    }