"""
responses.py - Error response helper

Every API error uses one shape: {"success": false, "error": "<message>"}.
(Success bodies get "success": true added by the after_request hook in app/__init__.py.)
"""

from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException


def error_response(message, status_code=500, exc=None):
    """Return a client-safe error response and log internal details."""
    if isinstance(exc, HTTPException) and exc.code and exc.code < 500:
        # Client error raised inside a route (e.g. malformed JSON body): report it
        # as that client error instead of turning it into a 500.
        return jsonify({'success': False, 'error': 'Invalid request body'}), exc.code
    if exc is not None:
        current_app.logger.exception(message)
    return jsonify({'success': False, 'error': message}), status_code
