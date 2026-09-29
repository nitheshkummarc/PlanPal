"""
Flask application factory.

Every response uses one shape: {"success": true, ...} or {"success": false, "error": "..."}.
Routes raise ValidationError for bad input and let unexpected exceptions reach the
500 handler, which rolls back the session and logs the traceback.
"""

import logging
import os

from flask import Flask, redirect, request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import exists
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from config import config

db = SQLAlchemy()
cors = CORS()
jwt = JWTManager()
bcrypt = Bcrypt()
limiter = Limiter(key_func=get_remote_address)


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    if config_name == 'production':
        config[config_name].validate()
    app.config['SQLALCHEMY_DATABASE_URI'] = config[config_name].database_uri()

    # Behind a reverse proxy, trust X-Forwarded-For/Proto so the rate limiter sees the
    # client IP and request.is_secure reflects the original scheme.
    proxy_hops = app.config.get('PROXY_FIX_X_FOR', 0)
    if proxy_hops:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=proxy_hops, x_proto=proxy_hops)

    app.url_map.strict_slashes = False

    db.init_app(app)
    cors.init_app(
        app,
        origins=app.config['ALLOWED_ORIGINS'],
        methods=['GET', 'POST', 'PUT', 'DELETE'],
        allow_headers=['Content-Type', 'Authorization'],
    )
    jwt.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)
    if app.config.get('TESTING'):
        limiter.enabled = False
    if config_name == 'production' and app.config['RATELIMIT_STORAGE_URI'] == 'memory://':
        app.logger.warning('REDIS_URL is not set: rate limits are counted per worker process.')

    _register_jwt_callbacks()
    _register_error_handlers(app)
    _configure_logging(app)

    from app.utils.security import add_security_headers
    app.after_request(add_security_headers)

    if app.config.get('FORCE_HTTPS'):
        @app.before_request
        def redirect_to_https():
            # Health checks stay reachable over HTTP for the hosting platform's probes
            if request.is_secure or request.path.startswith('/api/system/'):
                return None
            # 308 keeps the method and body
            return redirect(request.url.replace('http://', 'https://', 1), code=308)

    from app.routes.auth import auth_bp
    from app.routes.events import events_bp
    from app.routes.notifications import notifications_bp
    from app.routes.search import search_bp
    from app.routes.system import system_bp
    from app.routes.tags import tags_bp
    from app.routes.users import users_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(tags_bp, url_prefix='/api/tags')
    app.register_blueprint(system_bp, url_prefix='/api/system')

    # With the debug reloader, only the child process that serves requests runs the scheduler
    is_reloader_parent = app.debug and os.environ.get('WERKZEUG_RUN_MAIN') != 'true'
    if app.config.get('ENABLE_TASK_SCHEDULER') and not is_reloader_parent:
        from app.services.task_scheduler import scheduler
        scheduler.init_app(app)
        scheduler.start()

    return app


def _register_jwt_callbacks():
    from app.models import RevokedToken, User
    from app.utils.responses import error_response
    from app.utils.validators import parse_uuid

    @jwt.token_in_blocklist_loader
    def is_token_rejected(_jwt_header, payload):
        """Reject tokens revoked at logout, tokens of missing or deactivated users, and
        tokens issued before the user's sessions were invalidated (password change).
        One query covers all three checks."""
        user_id = parse_uuid(payload.get('sub'))
        if user_id is None:
            return True
        revoked = exists().where(RevokedToken.jti == payload['jti'])
        row = db.session.query(User.is_active, User.token_version, revoked).filter(
            User.user_id == user_id
        ).first()
        if row is None:
            return True
        is_active, token_version, is_revoked = row
        return bool(is_revoked) or not is_active or payload.get('ver', 0) != token_version

    @jwt.unauthorized_loader
    def missing_token(_reason):
        return error_response('Authentication required', 401)

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return error_response('Invalid token', 401)

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _payload):
        return error_response('Token has expired', 401)

    @jwt.revoked_token_loader
    def revoked_token(_jwt_header, _payload):
        return error_response('Token has been revoked', 401)


def _register_error_handlers(app):
    from app.utils.responses import error_response
    from app.utils.validators import ValidationError

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return error_response(str(error), 400)

    @app.errorhandler(404)
    def not_found(_error):
        return error_response('Resource not found', 404)

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return error_response('Method not allowed', 405)

    @app.errorhandler(429)
    def rate_limited(error):
        return error_response(f'Rate limit exceeded ({error.description}). Please try again shortly.', 429)

    @app.errorhandler(HTTPException)
    def http_error(error):
        return error_response(error.description or error.name, error.code)

    @app.errorhandler(Exception)
    def unexpected_error(error):
        db.session.rollback()
        app.logger.exception('Unhandled error on %s %s', request.method, request.path)
        return error_response('Internal server error', 500)


def _configure_logging(app):
    if app.debug or app.testing:
        return
    os.makedirs('logs', exist_ok=True)
    file_handler = logging.FileHandler('logs/app.log')
    file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
