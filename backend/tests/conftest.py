import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from app import create_app, db

@pytest.fixture
def app():
    # Use SQLite in-memory database for testing
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'SECRET_KEY': 'test-secret-key'
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def init_database(app):
    from app.models import User
    from app import bcrypt
    
    user1 = User(
        name="Test User",
        email="test@example.com",
        username="testuser",
        password_hash=bcrypt.generate_password_hash("Strong@123").decode("utf-8"),
        role="user",
        is_active=True
    )
    db.session.add(user1)
    db.session.commit()
    
    return {
        'user1': user1
    }
