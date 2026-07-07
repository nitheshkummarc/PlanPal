from flask import current_app, jsonify


def error_response(message, status_code=500, exc=None):
    """Return a client-safe error response and log internal details."""
    if exc is not None:
        current_app.logger.exception(message)
    return jsonify({'success': False, 'error': message}), status_code


def message_response(message, status_code=200, **payload):
    body = {'success': True, 'message': message}
    body.update(payload)
    return jsonify(body), status_code
