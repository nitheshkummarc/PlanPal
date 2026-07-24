import pytest
from app import create_app, db
from app.models import User
from flask_jwt_extended import create_access_token

@pytest.fixture
def test_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Create a user
        u = User(name='Test User', username='testuser', email='test@example.com', password_hash='hash')
        db.session.add(u)
        db.session.commit()
        
        client = app.test_client()
        yield client, str(u.user_id)
        
        db.session.remove()
        db.drop_all()

def test_user_search_no_email(test_client):
    client, user_id = test_client
    # Get token
    with client.application.app_context():
        token = create_access_token(identity=user_id)
    
    response = client.get('/api/users/search?q=test', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    data = response.get_json()
    assert len(data['users']) > 0
    for u in data['users']:
        assert 'email' not in u
        assert 'password_hash' not in u

def test_non_uuid_event_id(test_client):
    client, _ = test_client
    response = client.get('/api/events/not-a-uuid')
    assert response.status_code == 400

def test_notification_user_id_from_jwt(test_client):
    client, user_id = test_client
    with client.application.app_context():
        token = create_access_token(identity=user_id)
    
    # Send a notification with another user_id in body
    payload = {
        'user_id': 'some-other-uuid',
        'type': 'info',
        'title': 'Hello',
        'message': 'World'
    }
    response = client.post('/api/notifications/', json=payload, headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 201
    data = response.get_json()
    assert data['notification']['user_id'] == user_id
