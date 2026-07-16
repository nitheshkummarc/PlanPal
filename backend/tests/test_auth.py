import pytest
from app.models import User
from app import db

def test_register_success(client):
    response = client.post('/api/auth/register', json={
        'name': 'New User',
        'email': 'new@example.com',
        'username': 'newuser',
        'password': 'StrongPass!123'
    })
    print("REGISTRATION RESPONSE:", response.json)
    assert response.status_code == 201
    assert 'access_token' in response.json
    assert 'user' in response.json

def test_register_duplicate_email(client, init_database):
    response = client.post('/api/auth/register', json={
        'name': 'Duplicate',
        'email': 'test@example.com',  # From init_database
        'username': 'dupuser',
        'password': 'StrongPass!123'
    })
    assert response.status_code == 400
    assert 'error' in response.json

def test_login_success(client, init_database):
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Strong@123'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json

def test_login_wrong_password(client, init_database):
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'WrongPassword123'
    })
    assert response.status_code == 401

def test_get_profile_unauthorized(client):
    response = client.get('/api/auth/profile')
    assert response.status_code == 401
