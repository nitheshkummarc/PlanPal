import pytest
from app import create_app, db
from app.models import User
from flask_jwt_extended import create_access_token
from datetime import datetime, timezone, timedelta

@pytest.fixture
def auth_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        u = User(name='Test', username='test', email='test@a.com', password_hash='hash')
        db.session.add(u)
        db.session.commit()
        token = create_access_token(identity=str(u.user_id))
        yield app.test_client(), token
        db.session.remove()
        db.drop_all()

def test_valid_event_creation(auth_client):
    client, token = auth_client
    future_dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    data = {
        'title': 'Test Event',
        'timestamp': future_dt,
        'place': 'Place',
        'location': 'Loc',
        'city': 'City',
        'state': 'State',
        'price': 10,
        'max_participants': 100
    }
    resp = client.post('/api/events/', json=data, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 201

def test_missing_required_field(auth_client):
    client, token = auth_client
    resp = client.post('/api/events/', json={'title': 'Test'}, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 400

def test_past_timestamp(auth_client):
    client, token = auth_client
    past_dt = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    data = {
        'title': 'Test Event',
        'timestamp': past_dt,
        'place': 'Place',
        'location': 'Loc',
        'city': 'City',
        'state': 'State'
    }
    resp = client.post('/api/events/', json=data, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 400
    assert 'future' in resp.get_json()['error'].lower()

def test_negative_price(auth_client):
    client, token = auth_client
    future_dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    data = {
        'title': 'Test Event',
        'timestamp': future_dt,
        'place': 'Place',
        'location': 'Loc',
        'city': 'City',
        'state': 'State',
        'price': -10
    }
    resp = client.post('/api/events/', json=data, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 400

@pytest.mark.parametrize("invalid_max", [0, -1])
def test_invalid_max_participants(auth_client, invalid_max):
    client, token = auth_client
    future_dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    data = {
        'title': 'Test Event',
        'timestamp': future_dt,
        'place': 'Place',
        'location': 'Loc',
        'city': 'City',
        'state': 'State',
        'max_participants': invalid_max
    }
    resp = client.post('/api/events/', json=data, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 400
