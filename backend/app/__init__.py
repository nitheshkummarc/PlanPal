"""
__init__.py - Flask Application Factory

Why: Creates and configures the Flask app with all extensions and routes

Function:
- create_app(config_name): Initializes Flask app, extensions, and blueprints

Extensions Initialized:
- db (SQLAlchemy), migrate, cors, jwt, bcrypt, mail

Blueprints Registered:
- /api/auth, /api/users, /api/events, /api/notifications
- /api/search, /api/system, /api/tags

Error Handlers: 404, 500, 413, 429
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_mail import Mail
from config import config  # Using regular config with Supabase settings
import os
import logging

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
bcrypt = Bcrypt()
mail = Mail()

def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
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
    bcrypt.init_app(app)
    mail.init_app(app)
    
    # Initialize Supabase client (optional)
    try:
        from app.utils.supabase_client import init_supabase
        supabase_client = init_supabase(app)
        if supabase_client:
            app.logger.info("Supabase client initialized successfully")
        else:
            app.logger.warning("Supabase client not initialized - check environment variables")
    except ImportError:
        app.logger.info("Supabase client not available - continuing without it")
    except Exception as e:
        app.logger.warning(f"Supabase client initialization failed: {str(e)}")
    
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
        return {'error': 'Rate limit exceeded', 'message': str(e.description)}, 429
    
    return app
