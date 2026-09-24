"""
config.py - Application Configuration

Why: Stores all environment-specific settings (database, JWT, security) for Flask app

Classes:
- Config: Base configuration with database URL, JWT, rate limiting, CORS
- DevelopmentConfig: Development settings (DEBUG=True)
- ProductionConfig: Production settings (DEBUG=False)
"""

import os
import secrets
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

class Config:
    # SECURITY: Generate strong secret keys if not provided
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_urlsafe(32)
    
    # Supabase Database Configuration - Use Supabase pooler URL ONLY
    # IMPORTANT: SUPABASE_DATABASE_URL must be the pooler connection string
    SQLALCHEMY_DATABASE_URI = os.environ.get('SUPABASE_DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
        'pool_timeout': 30
    }
    
    # Rate-limit storage: Redis when REDIS_URL is set (shared across workers),
    # otherwise in-memory (per process - fine for a single instance)
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or 'memory://'

    # Number of reverse proxies in front of the app (Render/nginx = 1). Lets the
    # rate limiter see the real client IP from X-Forwarded-For. 0 = no proxy.
    PROXY_FIX_X_FOR = int(os.environ.get('PROXY_FIX_X_FOR', '0'))

    # Redirect plain-HTTP requests to HTTPS (on in production)
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'false').lower() in ['true', 'on', '1']
    
    # JWT Configuration - SECURITY: Strong defaults
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_urlsafe(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # SECURITY: Shorter token lifetime
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)     # SECURITY: Shorter refresh token lifetime
    
    # SECURITY: Input validation limits
    MAX_TEXT_LENGTH = 10000
    MAX_NAME_LENGTH = 100
    MAX_EMAIL_LENGTH = 254
    MAX_TITLE_LENGTH = 200
    
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'ALLOWED_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173'
        ).split(',')
        if origin.strip()
    ]
    ENABLE_TASK_SCHEDULER = os.environ.get('ENABLE_TASK_SCHEDULER', 'false').lower() in ['true', 'on', '1']

class DevelopmentConfig(Config):
    DEBUG = True
    # Use Supabase pooler for development, fallback to local SQLite if not set
    SQLALCHEMY_DATABASE_URI = os.environ.get('SUPABASE_DATABASE_URL') or 'sqlite:///local_dev.db'
    
    # We remove the import-time raise ValueError so the file can be imported without crashing.


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {}
    RATELIMIT_STORAGE_URI = 'memory://'
    ENABLE_TASK_SCHEDULER = False


class ProductionConfig(Config):
    DEBUG = False
    # Render (and the local nginx) sit in front of the app as one proxy hop
    PROXY_FIX_X_FOR = int(os.environ.get('PROXY_FIX_X_FOR', '1'))
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'true').lower() in ['true', 'on', '1']
    # Production should always use environment variables
    SQLALCHEMY_DATABASE_URI = os.environ.get('SUPABASE_DATABASE_URL') or Config.SQLALCHEMY_DATABASE_URI

    @classmethod
    def validate(cls):
        missing = []
        if not os.environ.get('SECRET_KEY'):
            missing.append('SECRET_KEY')
        if not os.environ.get('JWT_SECRET_KEY'):
            missing.append('JWT_SECRET_KEY')
        if not os.environ.get('SUPABASE_DATABASE_URL'):
            missing.append('SUPABASE_DATABASE_URL')
        
        allowed_origins = os.environ.get('ALLOWED_ORIGINS')
        if not allowed_origins or 'localhost:5173' in allowed_origins or '127.0.0.1:5173' in allowed_origins:
            missing.append('ALLOWED_ORIGINS (must be set and not use default dev localhost)')

        if missing:
            raise RuntimeError("Missing or invalid required production environment variables: " + ", ".join(missing))


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
