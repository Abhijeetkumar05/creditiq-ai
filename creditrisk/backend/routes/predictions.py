"""Prediction API routes."""

from flask import Blueprint, request, jsonify, g
from utils.auth import require_auth, optional_auth
from utils.validators import validate_prediction_input, require_json
from models.predictor import predict, get_model_info
from database.operations import save_prediction, get_predictions, get_stats

predict_bp = Blueprint('predict', __name__)


@predict_bp.route('/predict', methods=['POST'])
@optional_auth
@require_json
def make_prediction():
    data = request.get_json()

    valid, errors = validate_prediction_input(data)
    if not valid:
        return jsonify({'error': 'Validation failed', 'details': errors}), 422

    try:
        result = predict(data)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

    # Persist to database
    record = {
        'user_id':        g.user_id,
        'username':       g.username,
        'input_data':     data,
        'prediction':     result['prediction'],
        'risk_score':     result['risk_score'],
        'risk_band':      result['risk_band'],
        'confidence':     result['confidence'],
        'prob_approved':  result['prob_approved'],
        'prob_rejected':  result['prob_rejected'],
        'key_factors':    result['key_factors'],
        'model_used':     result['model_used'],
    }
    record_id = save_prediction(record)

    return jsonify({
        'success':      True,
        'record_id':    record_id,
        'prediction':   result['prediction'],
        'confidence':   result['confidence'],
        'prob_approved': result['prob_approved'],
        'prob_rejected': result['prob_rejected'],
        'risk_score':   result['risk_score'],
        'risk_band':    result['risk_band'],
        'risk_color':   result['risk_color'],
        'risk_label':   result['risk_label'],
        'key_factors':  result['key_factors'],
        'model_used':   result['model_used'],
        'model_auc':    result['model_auc'],
    }), 200


@predict_bp.route('/history', methods=['GET'])
@optional_auth
def get_history():
    page     = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 10)), 50)
    user_filter = request.args.get('user_id') or g.user_id

    records, total = get_predictions(user_id=user_filter, page=page, per_page=per_page)

    return jsonify({
        'success':    True,
        'data':       records,
        'pagination': {
            'page':       page,
            'per_page':   per_page,
            'total':      total,
            'pages':      (total + per_page - 1) // per_page,
            'has_next':   page * per_page < total,
            'has_prev':   page > 1,
        }
    }), 200


@predict_bp.route('/stats', methods=['GET'])
@optional_auth
def get_dashboard_stats():
    user_filter = request.args.get('user_id') or g.user_id
    stats = get_stats(user_id=user_filter)
    model_info = get_model_info()

    return jsonify({
        'success':        True,
        'stats':          stats,
        'model_info':     model_info,
    }), 200


@predict_bp.route('/model-info', methods=['GET'])
def model_info():
    try:
        info = get_model_info()
        return jsonify({'success': True, 'data': info}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
