from datetime import datetime, timezone

from conftest import auth


def test_get_events_pagination(client, owner):
    response = client.get('/api/events/?page=1&per_page=5', headers=auth(owner))
    assert response.status_code == 200
    assert 'events' in response.json
    assert 'pagination' in response.json

def test_create_event_unauthorized(client):
    response = client.post('/api/events/', json={
        'title': 'Test Event',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'place': 'Test Place',
        'location': 'Test Location',
        'city': 'Test City',
        'state': 'Test State'
    })
    assert response.status_code == 401
