"""
Environment-specific configuration.

Environment variables (see .env.example):
    FLASK_ENV              development | production
    SUPABASE_DATABASE_URL  Supabase PostgreSQL connection string (pooler URL); required
    SECRET_KEY             Flask secret; required in production
    JWT_SECRET_KEY         JWT signing key; required in production
    ALLOWED_ORIGINS        Comma-separated frontend origins allowed by CORS
    ENABLE_TASK_SCHEDULER  Run the background jobs (reminders, token cleanup) in this process
    REDIS_URL              Shared rate-limit storage; without it, limits are counted per process
    PROXY_FIX_X_FOR        Number of reverse proxies in front of the app
    FORCE_HTTPS            Redirect plain HTTP requests to HTTPS

The test suite uses its own in-memory SQLite database and needs none of these.
"""

import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _flag(name, default):
    return os.environ.get(name, default).lower() in ('true', 'on', '1')


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_urlsafe(32)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
        'pool_timeout': 30,
    }

    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or 'memory://'
    PROXY_FIX_X_FOR = int(os.environ.get('PROXY_FIX_X_FOR', '0'))
    FORCE_HTTPS = _flag('FORCE_HTTPS', 'false')

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_urlsafe(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
        if origin.strip()
    ]
    ENABLE_TASK_SCHEDULER = _flag('ENABLE_TASK_SCHEDULER', 'false')

    @staticmethod
    def database_uri():
        """Read when the app is created, so the environment can be set after import."""
        uri = os.environ.get('SUPABASE_DATABASE_URL')
        if not uri:
            raise RuntimeError('SUPABASE_DATABASE_URL is not set. Add the Supabase connection string to backend/.env.')
        return uri


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    # Unhandled errors return the JSON 500 response instead of propagating into the test
    PROPAGATE_EXCEPTIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {}
    SECRET_KEY = 'test-secret-key-with-at-least-32-characters'
    JWT_SECRET_KEY = 'test-jwt-secret-key-with-at-least-32-chars'
    ALLOWED_ORIGINS = ['http://localhost:5173']
    RATELIMIT_STORAGE_URI = 'memory://'
    BCRYPT_LOG_ROUNDS = 4  # faster hashing in tests
    ENABLE_TASK_SCHEDULER = False
    FORCE_HTTPS = False
    PROXY_FIX_X_FOR = 0

    @staticmethod
    def database_uri():
        return 'sqlite:///:memory:'


class ProductionConfig(Config):
    DEBUG = False
    PROXY_FIX_X_FOR = int(os.environ.get('PROXY_FIX_X_FOR', '1'))
    FORCE_HTTPS = _flag('FORCE_HTTPS', 'true')

    @classmethod
    def validate(cls):
        missing = [name for name in ('SECRET_KEY', 'JWT_SECRET_KEY', 'SUPABASE_DATABASE_URL')
                   if not os.environ.get(name)]
        origins = os.environ.get('ALLOWED_ORIGINS', '')
        if not origins or 'localhost:5173' in origins or '127.0.0.1:5173' in origins:
            missing.append('ALLOWED_ORIGINS (must be set to the deployed frontend origin)')
        if missing:
            raise RuntimeError('Missing or invalid production environment variables: ' + ', '.join(missing))


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}
