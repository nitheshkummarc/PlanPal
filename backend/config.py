"""
config.py - Application Configuration

Why: Stores all environment-specific settings (database, JWT, security) for Flask app

Classes:
- Config: Base configuration with database URL, JWT settings, Supabase keys
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
        'pool_pre_ping': True,  # Verify connections before using
        'pool_recycle': 300,    # Recycle connections after 5 minutes
    }
    
    # Supabase API Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')  # For admin operations
    
    # JWT Configuration - SECURITY: Strong defaults
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_urlsafe(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # SECURITY: Shorter token lifetime
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)     # SECURITY: Shorter refresh token lifetime
    
    # Supabase Storage Configuration
    SUPABASE_STORAGE_BUCKET = os.environ.get('SUPABASE_STORAGE_BUCKET') or 'planpal-uploads'
    
    # Encryption Configuration - SECURITY: Strong key generation
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY') or secrets.token_urlsafe(32)
    
    # SECURITY: Input validation limits
    MAX_TEXT_LENGTH = 10000
    MAX_NAME_LENGTH = 100
    MAX_EMAIL_LENGTH = 254
    MAX_TITLE_LENGTH = 200
    
    # Supabase Auth Configuration
    USE_SUPABASE_AUTH = os.environ.get('USE_SUPABASE_AUTH', 'false').lower() in ['true', 'on', '1']
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


class ProductionConfig(Config):
    DEBUG = False
    # Production should always use environment variables
    SQLALCHEMY_DATABASE_URI = os.environ.get('SUPABASE_DATABASE_URL') or Config.SQLALCHEMY_DATABASE_URI

    @classmethod
    def validate(cls):
        missing = []
        if not os.environ.get('SECRET_KEY'):
            missing.append('SECRET_KEY')
        if not os.environ.get('JWT_SECRET_KEY'):
            missing.append('JWT_SECRET_KEY')
        if not os.environ.get('ENCRYPTION_KEY'):
            missing.append('ENCRYPTION_KEY')
        if not os.environ.get('SUPABASE_DATABASE_URL'):
            missing.append('SUPABASE_DATABASE_URL')
        
        allowed_origins = os.environ.get('ALLOWED_ORIGINS')
        if not allowed_origins or 'localhost' in allowed_origins or '127.0.0.1' in allowed_origins:
            missing.append('ALLOWED_ORIGINS (must be set and not use default localhost)')

        if missing:
            raise RuntimeError("Missing or invalid required production environment variables: " + ", ".join(missing))


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
