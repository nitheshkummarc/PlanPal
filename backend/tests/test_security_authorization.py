import pytest
from app import create_app, db
from app.models import Notification, User
from flask_jwt_extended import create_access_token

@pytest.fixture
def test_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        u = User(name='Test User', username='testuser', email='test@example.com', password_hash='hash')
        db.session.add(u)
        db.session.commit()
        
        client = app.test_client()
        yield client, str(u.user_id)
        
        db.session.remove()
        db.drop_all()

def test_user_search_no_email(test_client):
    client, user_id = test_client
    with client.application.app_context():
        token = create_access_token(identity=user_id)
    
    response = client.get('/api/search/?type=users&q=test', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    data = response.get_json()
    assert len(data['results']['users']) > 0
    for u in data['results']['users']:
        assert 'email' not in u
        assert 'password_hash' not in u

def test_non_uuid_event_id(test_client):
    client, user_id = test_client
    with client.application.app_context():
        token = create_access_token(identity=user_id)
    response = client.get('/api/events/not-a-uuid', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 400

def test_notification_user_id_from_jwt(test_client):
    """Clients cannot create notifications, and only the owner (from the JWT) can change one."""
    client, user_id = test_client
    with client.application.app_context():
        token = create_access_token(identity=user_id)
        other = User(name='Other User', username='other', email='other@example.com', password_hash='hash')
        db.session.add(other)
        db.session.flush()
        foreign = Notification(user_id=other.user_id, type='welcome', title='Hi', message='Hello')
        db.session.add(foreign)
        db.session.commit()
        foreign_id = foreign.notification_id
    headers = {'Authorization': f'Bearer {token}'}

    payload = {'user_id': 'some-other-uuid', 'type': 'welcome', 'title': 'Hello', 'message': 'World'}
    assert client.post('/api/notifications/', json=payload, headers=headers).status_code == 405
    assert client.put(f'/api/notifications/{foreign_id}/mark-read', headers=headers).status_code == 403
    assert client.delete(f'/api/notifications/{foreign_id}', headers=headers).status_code == 403
