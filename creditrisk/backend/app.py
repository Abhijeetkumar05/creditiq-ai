"""
CreditIQ — AI-Based Credit Risk Prediction System
Flask Application Entry Point
"""

import os
import sys

# Ensure backend/ is on sys.path regardless of cwd
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, resources={
        r'/api/*': {
            'origins': os.environ.get('CORS_ORIGINS', '*').split(','),
            'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allow_headers': ['Content-Type', 'Authorization'],
        }
    })

    # ── Register Blueprints ───────────────────────────────────────────────────
    from routes.auth        import auth_bp
    from routes.predictions import predict_bp

    app.register_blueprint(auth_bp,    url_prefix='/api/auth')
    app.register_blueprint(predict_bp, url_prefix='/api')

    # ── Health check ─────────────────────────────────────────────────────────
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'service': 'CreditIQ API', 'version': '1.0.0'})

    # ── Serve React SPA (production) ─────────────────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        import os
        build_index = os.path.join(app.static_folder or '', 'index.html')
        if app.static_folder and os.path.exists(build_index):
            return app.send_static_file('index.html')
        return jsonify({
            'service': 'CreditIQ API',
            'version': '1.0.0',
            'docs':    '/api/health',
            'message': 'Frontend not built. Run: cd frontend && npm run build'
        })

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    print(f"\n🚀  CreditIQ API starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
