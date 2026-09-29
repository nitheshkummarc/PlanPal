"""Application-level behaviour: API surface, CORS, security headers, rate limits."""

import pytest

from app import create_app, db, limiter
from conftest import auth, refresh_auth

REMOVED_ROUTES = [
    ('get', '/'),
    ('get', '/api'),
    ('get', '/api/system/version'),
    ('get', '/api/users/profile'),
    ('get', '/api/users/search?q=test'),
    ('get', '/api/tags/popular'),
    ('get', '/api/tags/search?q=music'),
    ('get', '/api/notifications/types'),
    ('get', '/api/events/00000000-0000-0000-0000-000000000001/participation_status'),
]


@pytest.mark.parametrize('method, url', REMOVED_ROUTES)
def test_removed_routes_are_gone(client, owner, method, url):
    response = getattr(client, method)(url, headers=auth(owner))
    # /api/users/<id> and /api/tags/<id> still exist, so an unknown id segment gives 400
    assert response.status_code in (400, 404, 405)
    assert response.get_json()['success'] is False


def test_cors_allows_only_configured_origins(client):
    allowed = client.options('/api/events/', headers={
        'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization',
    })
    assert allowed.headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173'
    assert 'Authorization' in allowed.headers.get('Access-Control-Allow-Headers', '')

    blocked = client.options('/api/events/', headers={
        'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'GET',
    })
    assert 'Access-Control-Allow-Origin' not in blocked.headers


def test_security_headers(client):
    response = client.get('/api/system/health')
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert response.headers['X-Frame-Options'] == 'DENY'
    assert 'Strict-Transport-Security' not in response.headers  # plain HTTP
    secure = client.get('/api/system/health', base_url='https://planpal.example')
    assert secure.headers['Strict-Transport-Security'].startswith('max-age=')


def test_refresh_is_rate_limited():
    app = create_app('testing')
    limiter.enabled = True
    try:
        with app.app_context():
            db.create_all()
            client = app.test_client()
            from app.models import User
            user = User(name='Rate Limited', email='rl@example.com', username='rate_limited', password_hash='x')
            db.session.add(user)
            db.session.commit()
            statuses = [client.post('/api/auth/refresh', headers=refresh_auth(user)).status_code for _ in range(31)]
            db.session.remove()
            db.drop_all()
    finally:
        limiter.enabled = False
    assert statuses[:30] == [200] * 30
    assert statuses[30] == 429


def test_unexpected_errors_return_the_json_500(client, owner, monkeypatch):
    from app.routes import tags

    monkeypatch.setattr(tags, 'Tag', None)  # any unexpected exception inside a route
    response = client.get('/api/tags/', headers=auth(owner))
    assert response.status_code == 500
    assert response.get_json() == {'success': False, 'error': 'Internal server error'}
