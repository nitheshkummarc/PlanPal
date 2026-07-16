import pytest

def test_get_notifications_unauthorized(client):
    response = client.get('/api/notifications/')
    assert response.status_code == 401

def test_get_unread_count_unauthorized(client):
    response = client.get('/api/notifications/unread_count')
    assert response.status_code == 401
