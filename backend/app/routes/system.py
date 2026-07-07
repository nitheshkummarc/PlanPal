"""
system.py - System Health and Information Routes

Why: Provides system health checks and version info for monitoring

Routes/Functions:
- health_check(): GET /api/system/health - Database connectivity test
- get_version(): GET /api/system/version - API version and build date
"""

from flask import Blueprint, jsonify
from app import db
from app.utils.responses import error_response
from datetime import datetime
from sqlalchemy import text

system_bp = Blueprint('system', __name__)

@system_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        return error_response('Health check failed', exc=e)

@system_bp.route('/version', methods=['GET'])
def get_version():
    """API version information"""
    return jsonify({
        'version': '1.0.0',
        'api_name': 'PlanPal API',
        'build_date': '2025-09-11'
    }), 200
