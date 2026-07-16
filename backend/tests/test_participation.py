import pytest

def test_join_event_unauthorized(client):
    response = client.post('/api/events/123/join')
    assert response.status_code == 401

def test_leave_event_unauthorized(client):
    response = client.delete('/api/events/123/leave')
    assert response.status_code == 401
