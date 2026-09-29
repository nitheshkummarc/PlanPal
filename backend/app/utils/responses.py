"""
Response helpers.

Every response carries a "success" flag:
    success: {"success": true, ...payload}
    error:   {"success": false, "error": "<message>"}
"""

from flask import jsonify


def success_response(payload=None, status_code=200):
    body = {'success': True}
    if payload:
        body.update(payload)
    return jsonify(body), status_code


def error_response(message, status_code=400):
    return jsonify({'success': False, 'error': message}), status_code
