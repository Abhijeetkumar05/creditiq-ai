"""
Credit Risk ML Training Pipeline
Trains Logistic Regression, Random Forest, and XGBoost models
Selects best model based on F1 score and saves as .pkl
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (accuracy_score, classification_report,
                              roc_auc_score, f1_score, confusion_matrix)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import warnings
warnings.filterwarnings('ignore')

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# ─── Generate Realistic Loan Dataset ────────────────────────────────────────
def generate_loan_dataset(n=5000, random_state=42):
    np.random.seed(random_state)

    age = np.random.randint(22, 65, n)
    income = np.random.lognormal(10.8, 0.6, n).astype(int)
    loan_amount = np.random.lognormal(10.5, 0.7, n).astype(int)
    loan_term = np.random.choice([12, 24, 36, 48, 60, 84], n)
    credit_score = np.random.normal(650, 80, n).clip(300, 850).astype(int)
    employment_years = np.random.exponential(5, n).clip(0, 30).round(1)
    num_credit_lines = np.random.randint(1, 20, n)
    debt_to_income = np.random.beta(2, 5, n).round(3)
    num_derogatory_marks = np.random.choice([0,0,0,0,1,1,2,3,4], n)
    employment_status = np.random.choice(
        ['Employed', 'Self-Employed', 'Part-Time', 'Unemployed'],
        n, p=[0.6, 0.2, 0.12, 0.08]
    )
    education = np.random.choice(
        ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'],
        n, p=[0.25, 0.15, 0.35, 0.2, 0.05]
    )
    home_ownership = np.random.choice(
        ['Rent', 'Own', 'Mortgage', 'Other'],
        n, p=[0.35, 0.2, 0.4, 0.05]
    )
    loan_purpose = np.random.choice(
        ['Debt Consolidation', 'Home Improvement', 'Business', 'Education', 'Medical', 'Other'],
        n, p=[0.35, 0.2, 0.15, 0.12, 0.1, 0.08]
    )

    # Deterministic approval logic
    score = (
        (credit_score - 300) / 550 * 40 +
        np.log1p(income) / np.log1p(income.max()) * 25 +
        (1 - debt_to_income) * 15 +
        np.log1p(employment_years) / np.log1p(30) * 10 +
        (num_credit_lines / 20) * 5 +
        (num_derogatory_marks == 0).astype(int) * 5 -
        (employment_status == 'Unemployed').astype(int) * 20
    )
    noise = np.random.normal(0, 5, n)
    prob = 1 / (1 + np.exp(-(score + noise - 50) / 8))
    approved = (prob > 0.5).astype(int)

    df = pd.DataFrame({
        'age': age, 'annual_income': income, 'loan_amount': loan_amount,
        'loan_term': loan_term, 'credit_score': credit_score,
        'employment_years': employment_years, 'num_credit_lines': num_credit_lines,
        'debt_to_income_ratio': debt_to_income, 'num_derogatory_marks': num_derogatory_marks,
        'employment_status': employment_status, 'education_level': education,
        'home_ownership': home_ownership, 'loan_purpose': loan_purpose,
        'approved': approved
    })

    # Add realistic missing values
    for col in ['employment_years', 'num_credit_lines', 'debt_to_income_ratio']:
        mask = np.random.random(n) < 0.03
        df.loc[mask, col] = np.nan

    return df


# ─── Preprocessing ──────────────────────────────────────────────────────────
NUMERIC_FEATURES = [
    'age', 'annual_income', 'loan_amount', 'loan_term', 'credit_score',
    'employment_years', 'num_credit_lines', 'debt_to_income_ratio',
    'num_derogatory_marks'
]
CATEGORICAL_FEATURES = [
    'employment_status', 'education_level', 'home_ownership', 'loan_purpose'
]

def build_preprocessor():
    numeric_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    categorical_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    return ColumnTransformer([
        ('num', numeric_transformer, NUMERIC_FEATURES),
        ('cat', categorical_transformer, CATEGORICAL_FEATURES)
    ])


# ─── Model Training ──────────────────────────────────────────────────────────
def train_and_evaluate():
    print("=" * 60)
    print("  CREDIT RISK ML TRAINING PIPELINE")
    print("=" * 60)

    df = generate_loan_dataset(5000)
    print(f"\n✓ Dataset generated: {len(df)} samples")
    print(f"  Approval rate: {df['approved'].mean():.1%}")

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df['approved']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = build_preprocessor()

    models = {
        'Logistic Regression': Pipeline([
            ('preprocessor', preprocessor),
            ('clf', LogisticRegression(max_iter=1000, C=0.1, random_state=42))
        ]),
        'Random Forest': Pipeline([
            ('preprocessor', preprocessor),
            ('clf', RandomForestClassifier(n_estimators=200, max_depth=12,
                                           min_samples_leaf=5, random_state=42, n_jobs=-1))
        ]),
        'Gradient Boosting': Pipeline([
            ('preprocessor', preprocessor),
            ('clf', GradientBoostingClassifier(n_estimators=200, max_depth=5,
                                               learning_rate=0.05, random_state=42))
        ]),
    }

    if XGBOOST_AVAILABLE:
        models['XGBoost'] = Pipeline([
            ('preprocessor', preprocessor),
            ('clf', XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05,
                                  use_label_encoder=False, eval_metric='logloss',
                                  random_state=42))
        ])

    results = {}
    print("\n📊 Model Training & Evaluation:")
    print("-" * 60)

    for name, pipeline in models.items():
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        y_prob = pipeline.predict_proba(X_test)[:, 1]

        acc   = accuracy_score(y_test, y_pred)
        f1    = f1_score(y_test, y_pred)
        auc   = roc_auc_score(y_test, y_prob)
        cv    = cross_val_score(pipeline, X_train, y_train, cv=5,
                                scoring='roc_auc', n_jobs=-1).mean()

        results[name] = {
            'pipeline': pipeline, 'accuracy': acc,
            'f1': f1, 'auc': auc, 'cv_auc': cv
        }
        print(f"  {name:<25} Acc:{acc:.3f}  F1:{f1:.3f}  AUC:{auc:.3f}  CV-AUC:{cv:.3f}")

    # Select best by CV AUC
    best_name = max(results, key=lambda k: results[k]['cv_auc'])
    best = results[best_name]
    print(f"\n🏆 Best Model: {best_name}")

    # Feature importance (Random Forest or XGBoost)
    feature_importance = {}
    rf_name = 'Random Forest' if 'Random Forest' in results else None
    if rf_name:
        rf_clf = results[rf_name]['pipeline'].named_steps['clf']
        prep   = results[rf_name]['pipeline'].named_steps['preprocessor']
        cat_features = prep.named_transformers_['cat']['encoder'].get_feature_names_out(CATEGORICAL_FEATURES)
        all_features = NUMERIC_FEATURES + list(cat_features)
        importances = rf_clf.feature_importances_
        top_n = min(15, len(all_features))
        top_idx = np.argsort(importances)[::-1][:top_n]
        feature_importance = {
            all_features[i]: float(round(importances[i], 4)) for i in top_idx
        }

    # Save artifacts
    os.makedirs('artifacts', exist_ok=True)
    joblib.dump(best['pipeline'], 'artifacts/best_model.pkl')

    metadata = {
        'best_model': best_name,
        'accuracy': round(best['accuracy'], 4),
        'f1_score': round(best['f1'], 4),
        'auc_score': round(best['auc'], 4),
        'cv_auc': round(best['cv_auc'], 4),
        'numeric_features': NUMERIC_FEATURES,
        'categorical_features': CATEGORICAL_FEATURES,
        'feature_importance': feature_importance,
        'model_comparison': {
            k: {
                'accuracy': round(v['accuracy'], 4),
                'f1': round(v['f1'], 4),
                'auc': round(v['auc'], 4),
                'cv_auc': round(v['cv_auc'], 4)
            } for k, v in results.items()
        }
    }
    with open('artifacts/model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ Model saved → artifacts/best_model.pkl")
    print(f"✓ Metadata  → artifacts/model_metadata.json")
    print("=" * 60)
    return metadata


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    train_and_evaluate()
