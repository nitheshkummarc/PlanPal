"""
Health probes for the hosting platform (not used by the frontend).

- GET /api/system/health  Liveness: 200 while the process is running
- GET /api/system/ready   Readiness: 200 when the database answers, 503 otherwise
                          (Render's healthCheckPath)
"""

from datetime import datetime, timezone

from flask import Blueprint, current_app
from sqlalchemy import text

from app import db
from app.utils.responses import error_response, success_response

system_bp = Blueprint('system', __name__)


def _now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


@system_bp.route('/health', methods=['GET'])
def health_check():
    return success_response({'status': 'healthy', 'timestamp': _now()})


@system_bp.route('/ready', methods=['GET'])
def readiness_check():
    try:
        db.session.execute(text('SELECT 1'))
    except Exception:
        # Log the details; do not expose database errors to callers
        current_app.logger.exception('Readiness check failed')
        db.session.rollback()
        return error_response('Database unavailable', 503)
    return success_response({'status': 'ready', 'database': 'connected', 'timestamp': _now()})
