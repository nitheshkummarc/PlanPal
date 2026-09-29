from datetime import datetime, timezone, timedelta

from conftest import auth


def _get(client, init_database, url):
    return client.get(url, headers=auth(init_database['user1']))


def test_search_by_location(client, init_database):
    """Test searching events by location without a text query"""
    response = _get(client, init_database, '/api/search/?type=events&location=TestCity')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert 'events' in data['results']

def test_search_by_date_range(client, init_database):
    """Test searching events by date range without a text query"""
    now = datetime.now(timezone.utc)
    date_from = now.isoformat().replace('+00:00', 'Z')
    date_to = (now + timedelta(days=7)).isoformat().replace('+00:00', 'Z')
    
    response = _get(client, init_database, f'/api/search/?type=events&date_from={date_from}&date_to={date_to}')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert 'events' in data['results']

def test_search_by_query(client, init_database):
    """Test searching events by text query"""
    response = _get(client, init_database, '/api/search/?type=events&q=TestEvent')
    assert response.status_code == 200
    data = response.get_json()
    assert data['query'] == 'TestEvent'
    assert 'results' in data
    assert 'events' in data['results']

def test_search_users(client, init_database):
    """Test searching users by query"""
    response = _get(client, init_database, '/api/search/?type=users&q=testuser')
    assert response.status_code == 200
    data = response.get_json()
    assert [u['username'] for u in data['results']['users']] == ['testuser']

def test_search_missing_params(client, init_database):
    """No parameters: 200 with events, and no user listing (people need a query or tags)"""
    response = _get(client, init_database, '/api/search/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'events' in data['results']
    assert data['results']['users'] == []


def test_search_requires_authentication(client, init_database):
    assert client.get('/api/search/?q=test').status_code == 401


def test_search_rejects_unknown_type(client, init_database):
    assert _get(client, init_database, '/api/search/?type=tags').status_code == 400
