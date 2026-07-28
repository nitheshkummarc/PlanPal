import pytest
from app.models import Event
from datetime import datetime, timezone, timedelta

def test_search_by_location(client, init_database):
    """Test searching events by location without a text query"""
    # init_database creates some test data, but we can just use the endpoint and check if it succeeds
    # instead of throwing a 400 error.
    response = client.get('/api/search/?type=events&location=TestCity')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert 'events' in data['results']

def test_search_by_date_range(client, init_database):
    """Test searching events by date range without a text query"""
    now = datetime.now(timezone.utc)
    date_from = now.isoformat().replace('+00:00', 'Z')
    date_to = (now + timedelta(days=7)).isoformat().replace('+00:00', 'Z')
    
    response = client.get(f'/api/search/?type=events&date_from={date_from}&date_to={date_to}')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert 'events' in data['results']

def test_search_by_query(client, init_database):
    """Test searching events by text query"""
    response = client.get('/api/search/?type=events&q=TestEvent')
    assert response.status_code == 200
    data = response.get_json()
    assert data['query'] == 'TestEvent'
    assert 'results' in data
    assert 'events' in data['results']

def test_search_users(client, init_database):
    """Test searching users by query"""
    response = client.get('/api/search/?type=users&q=testuser')
    assert response.status_code == 200
    data = response.get_json()
    assert 'users' in data['results']

def test_search_missing_params(client, init_database):
    """Test search with absolutely no parameters still returns 200 (defaulting limit=50)"""
    response = client.get('/api/search/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'events' in data['results']
    assert 'users' in data['results']
