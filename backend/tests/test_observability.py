import pytest
from app import create_app, db

@pytest.fixture
def system_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        client = app.test_client()
        yield client
        db.session.remove()
        db.drop_all()

def test_health_check(system_client):
    resp = system_client.get('/api/system/health')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'healthy'

def test_readiness_check(system_client):
    resp = system_client.get('/api/system/ready')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ready'

def test_version_endpoint_removed(system_client):
    # The API exposes only the probes the hosting platform uses
    resp = system_client.get('/api/system/version')
    assert resp.status_code == 404

def test_error_handlers(system_client):
    resp = system_client.get('/api/this_route_does_not_exist')
    assert resp.status_code == 404
    data = resp.get_json()
    assert 'error' in data
