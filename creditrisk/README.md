# CreditIQ — AI-Based Credit Risk Prediction System

> Production-grade fintech platform for AI-driven loan application assessment, built for bank credit analysts.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [ML Model](#3-ml-model)
4. [Project Structure](#4-project-structure)
5. [Local Setup](#5-local-setup)
6. [MongoDB Atlas Setup](#6-mongodb-atlas-setup)
7. [API Reference](#7-api-reference)
8. [Deployment on Render](#8-deployment-on-render)
9. [Environment Variables](#9-environment-variables)
10. [Tech Stack](#10-tech-stack)

---

## 1. Project Overview

CreditIQ evaluates loan applications using a trained ML pipeline (Logistic Regression / Random Forest / XGBoost). Analysts submit applicant data through a React dashboard and receive an instant decision (Approved / Rejected), a calibrated risk score (0–100%), and key contributing factors. Every assessment is stored in MongoDB Atlas with full history, pagination, and analytics.

**Key capabilities:**
- Multi-model ML training with automatic best-model selection
- REST API with JWT authentication
- MongoDB Atlas cloud database with in-memory fallback for demos
- React + Recharts dashboard with analytics and charts
- One-click PDF report generation per assessment
- Deployment-ready for Render (backend) + Vercel/Netlify (frontend)

---

## 2. Architecture

```
Browser (React SPA)
      │
      ▼ HTTPS / REST
Flask API (Gunicorn)
      ├── /api/auth/*      → JWT auth (signup / login / me)
      ├── /api/predict     → ML inference + DB write
      ├── /api/history     → Paginated prediction log
      ├── /api/stats       → Aggregated dashboard stats
      └── /api/model-info  → Model metadata + feature importance
            │
            ├── ML Model (joblib .pkl)
            │       └── sklearn Pipeline (preprocessor + classifier)
            └── MongoDB Atlas
                    ├── loan_prediction_db.predictions
                    └── loan_prediction_db.users
```

---

## 3. ML Model

### Dataset
Synthetically generated realistic loan dataset (5,000 samples) with:
- 9 numeric features: age, annual income, loan amount, loan term, credit score, employment years, credit lines, DTI ratio, derogatory marks
- 4 categorical features: employment status, education level, home ownership, loan purpose
- ~3% missing values added to numeric fields (handled by median imputation)

### Pipeline
```
Raw Input → ColumnTransformer
              ├── Numeric: SimpleImputer(median) → StandardScaler
              └── Categorical: SimpleImputer(most_frequent) → OneHotEncoder
           → Classifier
```

### Models Trained & Compared

| Model               | Accuracy | F1    | AUC-ROC | CV-AUC |
|---------------------|----------|-------|---------|--------|
| Logistic Regression | 0.959    | 0.978 | 0.974   | 0.966  |
| Random Forest       | 0.959    | 0.978 | 0.967   | 0.958  |
| Gradient Boosting   | 0.959    | 0.978 | 0.971   | 0.961  |
| XGBoost             | 0.960    | 0.979 | 0.971   | 0.963  |

Selection criterion: highest 5-fold cross-validation AUC. Best model saved to `artifacts/best_model.pkl`.

### Risk Scoring
- Risk score = P(Rejected) × 100, calibrated via `predict_proba`
- Bands: Low (<25%) · Medium (25–50%) · High (50–75%) · Very High (>75%)

---

## 4. Project Structure

```
creditrisk/
├── backend/
│   ├── app.py                  # Flask app factory + blueprint registration
│   ├── Procfile                # Render/Heroku deployment command
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── artifacts/
│   │   ├── best_model.pkl      # Trained sklearn pipeline
│   │   └── model_metadata.json # Metrics, feature importance
│   ├── ml/
│   │   └── train_model.py      # Full training pipeline (run once)
│   ├── models/
│   │   └── predictor.py        # Inference service
│   ├── routes/
│   │   ├── auth.py             # /api/auth/* endpoints
│   │   └── predictions.py      # /api/predict, /history, /stats
│   ├── database/
│   │   ├── connection.py       # MongoDB client + in-memory fallback
│   │   └── operations.py       # CRUD abstractions
│   └── utils/
│       ├── auth.py             # JWT helpers, decorators
│       └── validators.py       # Input validation
└── frontend/
    ├── public/
    └── src/
        ├── App.js              # Router + protected routes
        ├── index.css           # Full design system
        ├── hooks/
        │   └── useAuth.js      # Auth context + provider
        ├── services/
        │   └── api.js          # Axios client + interceptors
        ├── components/
        │   └── AppLayout.jsx   # Sidebar navigation
        └── pages/
            ├── AuthPages.jsx   # Login + Signup
            ├── DashboardPage.jsx
            ├── PredictPage.jsx
            ├── HistoryPage.jsx
            └── AnalyticsPage.jsx  # Analytics + Model Info
```

---

## 5. Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd creditrisk/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

# Train the ML model (one-time)
python ml/train_model.py

# Start the API server
python app.py
# → API running at http://localhost:5000
```

### Frontend

```bash
cd creditrisk/frontend

# Install dependencies
npm install

# Set API URL (optional — defaults to localhost:5000)
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
# → UI running at http://localhost:3000
```

---

## 6. MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. **Database Access** → Add user with password authentication
3. **Network Access** → Add IP `0.0.0.0/0` (allow all) for development
4. **Connect** → Copy connection string (SRV format)
5. Paste into `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

The app creates these automatically on first run:
- Database: `loan_prediction_db`
- Collections: `predictions`, `users`
- Indexes on `user_id`, `timestamp`, `email`, `username`

> **Note:** If MongoDB is unavailable, the app automatically switches to an in-memory store so demos work without any database.

---

## 7. API Reference

### Authentication

#### POST /api/auth/signup
```json
{
  "username": "analyst_jane",
  "email": "jane@bank.com",
  "full_name": "Jane Smith",
  "password": "securepassword"
}
```
Response: `{ token, user: { id, username, email } }`

#### POST /api/auth/login
```json
{ "username": "analyst_jane", "password": "securepassword" }
```
Response: `{ token, user }`

#### GET /api/auth/me
Headers: `Authorization: Bearer <token>`

---

### Predictions

#### POST /api/predict
Headers: `Authorization: Bearer <token>` (optional)

```json
{
  "age": 35,
  "annual_income": 75000,
  "loan_amount": 25000,
  "loan_term": 36,
  "credit_score": 720,
  "employment_years": 8,
  "num_credit_lines": 6,
  "debt_to_income_ratio": 0.25,
  "num_derogatory_marks": 0,
  "employment_status": "Employed",
  "education_level": "Bachelor",
  "home_ownership": "Mortgage",
  "loan_purpose": "Debt Consolidation"
}
```

Response:
```json
{
  "success": true,
  "record_id": "6657abc123...",
  "prediction": "Approved",
  "confidence": 97.3,
  "prob_approved": 97.3,
  "prob_rejected": 2.7,
  "risk_score": 2.7,
  "risk_band": "Low",
  "risk_color": "#22c55e",
  "risk_label": "LOW RISK",
  "key_factors": [
    { "factor": "Excellent Credit Score", "impact": "positive", "value": "720" },
    { "factor": "Low Debt-to-Income Ratio", "impact": "positive", "value": "25%" }
  ],
  "model_used": "Logistic Regression",
  "model_auc": 0.974
}
```

#### GET /api/history?page=1&per_page=10
Returns paginated prediction history.

#### GET /api/stats
Returns aggregate stats: total, approved, rejected, avg_risk_score.

#### GET /api/model-info
Returns model name, accuracy, AUC, F1, comparison table, feature importance.

#### GET /api/health
Health check: `{ "status": "ok", "service": "CreditIQ API" }`

---

## 8. Deployment on Render

### Backend (Web Service)

1. Push `creditrisk/backend/` to a GitHub repo
2. [render.com](https://render.com) → **New Web Service** → Connect repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt && python ml/train_model.py`
   - **Start Command:** `gunicorn app:app --workers 2 --bind 0.0.0.0:$PORT`
4. **Environment Variables** (from Render dashboard):
   ```
   MONGO_URI     = mongodb+srv://...
   JWT_SECRET    = <strong-random-64-char-string>
   FLASK_ENV     = production
   CORS_ORIGINS  = https://your-frontend.vercel.app
   ```

### Frontend (Static Site — Vercel)

```bash
cd frontend
npm run build
# Deploy build/ folder to Vercel or Netlify
```

Set environment variable:
```
REACT_APP_API_URL = https://your-backend.onrender.com/api
```

---

## 9. Environment Variables

| Variable       | Required | Description                                  |
|----------------|----------|----------------------------------------------|
| `MONGO_URI`    | Yes      | MongoDB Atlas SRV connection string          |
| `JWT_SECRET`   | Yes      | Secret key for signing JWT tokens (32+ chars)|
| `FLASK_ENV`    | No       | `development` or `production`                |
| `PORT`         | No       | Server port (default: 5000)                  |
| `CORS_ORIGINS` | No       | Comma-separated allowed frontend origins     |

---

## 10. Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| ML         | scikit-learn, XGBoost, pandas, numpy, joblib            |
| Backend    | Flask 3, Flask-CORS, PyJWT, bcrypt, gunicorn            |
| Database   | MongoDB Atlas (pymongo), in-memory fallback             |
| Frontend   | React 18, React Router 6, Recharts, Axios, jsPDF        |
| Design     | Custom CSS design system (Space Grotesk + JetBrains Mono)|
| Deployment | Render (backend), Vercel (frontend)                     |

---

*CreditIQ — Built for production fintech workflows.*
