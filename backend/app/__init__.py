"""
__init__.py - Flask Application Factory

Why: Creates and configures the Flask app with all extensions and routes

Function:
- create_app(config_name): Initializes Flask app, extensions, and blueprints

Extensions Initialized:
- db (SQLAlchemy), migrate, cors, jwt, bcrypt, limiter

Blueprints Registered:
- /api/auth, /api/users, /api/events, /api/notifications
- /api/search, /api/system, /api/tags

Error contract: every error response is {"success": false, "error": "<message>"}
(404, 405, 413, 415, 429, 500, JWT errors and route errors alike).
"""

from flask import Flask, request, redirect
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from config import config
import os
import logging
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
bcrypt = Bcrypt()
limiter = Limiter(key_func=get_remote_address)

def create_app(config_name='default'):
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    if config_name == 'production':
        try:
            config[config_name].validate()
        except RuntimeError as e:
            app.logger.error(f"Configuration Error: {str(e)}")
            raise

    # Behind a reverse proxy (Render / nginx), trust X-Forwarded-For so
    # request.remote_addr - and therefore the rate limiter - sees the real client IP.
    proxy_hops = app.config.get('PROXY_FIX_X_FOR', 0)
    if proxy_hops:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=proxy_hops, x_proto=proxy_hops)

    # Disable strict slashes to prevent redirects on trailing slashes
    app.url_map.strict_slashes = False

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)

    allowed_origins = app.config.get('ALLOWED_ORIGINS')

    # Configure CORS with explicit origins because credentials are enabled.
    cors.init_app(app,
                  origins=allowed_origins,
                  methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                  allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
                  supports_credentials=True)

    jwt.init_app(app)

    # Same error shape as the rest of the API: {"success": false, "error": "..."}
    # (status codes are unchanged; 401 still triggers the frontend token refresh)
    @jwt.unauthorized_loader
    def missing_token(reason):
        return {'success': False, 'error': 'Authentication required'}, 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return {'success': False, 'error': 'Invalid token'}, 422

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return {'success': False, 'error': 'Token has expired'}, 401

    @jwt.token_in_blocklist_loader
    def is_token_revoked(jwt_header, jwt_payload):
        """Tokens revoked at logout are rejected until they expire."""
        from app.models import RevokedToken
        return bool(db.session.query(RevokedToken.jti).filter_by(jti=jwt_payload['jti']).first())

    @jwt.revoked_token_loader
    def revoked_token(jwt_header, jwt_payload):
        return {'success': False, 'error': 'Token has been revoked'}, 401

    bcrypt.init_app(app)
    limiter.init_app(app)

    if app.config.get('TESTING'):
        limiter.enabled = False

    # Initialize security features (simplified)
    try:
        # Add security headers to all responses
        from app.utils.security import add_security_headers
        app.after_request(add_security_headers)

        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.makedirs('logs')

        # Configure application logging
        if not app.debug:
            file_handler = logging.FileHandler('logs/app.log')
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)

    except Exception as e:
        # Continue without security features if there are issues
        app.logger.warning(f"Some features not available: {str(e)}")

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.events import events_bp
    from app.routes.notifications import notifications_bp
    from app.routes.search import search_bp
    from app.routes.system import system_bp
    from app.routes.tags import tags_bp


    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(system_bp, url_prefix='/api/system')
    app.register_blueprint(tags_bp, url_prefix='/api/tags')

    # Force HTTPS: redirect plain-HTTP requests (X-Forwarded-Proto via ProxyFix).
    # Health checks are exempt because the platform may probe them over HTTP.
    # Browsers are then kept on HTTPS by the Strict-Transport-Security header.
    if app.config.get('FORCE_HTTPS'):
        @app.before_request
        def redirect_to_https():
            if request.is_secure or request.path.startswith('/api/system/'):
                return None
            # 308 keeps the method and body (POST stays POST)
            return redirect(request.url.replace('http://', 'https://', 1), code=308)

    # Add global OPTIONS handler for CORS preflight requests
    @app.before_request
    def handle_preflight():
        from flask import request, make_response
        if request.method == "OPTIONS":
            response = make_response()
            origin = request.headers.get("Origin")
            if origin in app.config.get('ALLOWED_ORIGINS', []):
                response.headers.add("Access-Control-Allow-Origin", origin)
                response.headers.add("Vary", "Origin")
            response.headers.add('Access-Control-Allow-Headers', "Content-Type, Authorization, X-Requested-With, Accept")
            response.headers.add('Access-Control-Allow-Methods', "GET, POST, PUT, DELETE, OPTIONS, PATCH")
            return response

    @app.after_request
    def add_success_flag(response):
        """Add a common success flag without changing existing response bodies."""
        if response.is_json:
            payload = response.get_json(silent=True)
            if isinstance(payload, dict) and 'success' not in payload:
                payload = {'success': response.status_code < 400, **payload}
                response.set_data(app.json.dumps(payload))
                response.content_length = len(response.get_data())
        return response

    if app.config.get('ENABLE_TASK_SCHEDULER'):
        from app.services.task_scheduler import scheduler
        scheduler.init_app(app)
        scheduler.start()

    # Enhanced error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Server Error: {error}')
        return {'error': 'Internal server error'}, 500

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return {'error': 'File too large'}, 413

    @app.errorhandler(429)
    def ratelimit_handler(e):
        # e.description is the limit that was hit, e.g. "5 per 1 minute"
        return {'error': f'Rate limit exceeded ({e.description}). Please try again shortly.'}, 429

    @app.errorhandler(HTTPException)
    def http_error(e):
        # Any other HTTP error (405, 415, ...) as JSON instead of Werkzeug's HTML page
        return {'error': e.description or e.name}, e.code

    return app
