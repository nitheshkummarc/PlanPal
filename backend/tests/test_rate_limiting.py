import pytest
from app import create_app, limiter, db

@pytest.fixture
def rate_limited_client():
    app = create_app('testing')
    app.config['TESTING'] = False  # Re-enable limiter for this test
    limiter.enabled = True
    with app.app_context():
        db.create_all()
        client = app.test_client()
        yield client
        limiter.enabled = False
        db.session.remove()
        db.drop_all()

@pytest.fixture
def normal_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        client = app.test_client()
        yield client
        db.session.remove()
        db.drop_all()

def test_normal_conditions(normal_client):
    # Under normal conditions (TESTING=True, limiter disabled), requests succeed normally
    for _ in range(6):
        resp = normal_client.post('/api/auth/login', json={'email': 'test@a.com', 'password': 'test'})
        assert resp.status_code != 429

def test_rate_limiting(rate_limited_client):
    # Send 6 login requests, 6th should return 429
    for i in range(5):
        resp = rate_limited_client.post('/api/auth/login', json={'email': 'test@a.com', 'password': 'test'})
        assert resp.status_code != 429
    
    resp = rate_limited_client.post('/api/auth/login', json={'email': 'test@a.com', 'password': 'test'})
    assert resp.status_code == 429
