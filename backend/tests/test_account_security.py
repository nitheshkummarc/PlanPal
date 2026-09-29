"""Session handling: token versioning, deactivation, invalid tokens, and strict input types."""

import pytest

from app import db
from conftest import PASSWORD, auth, refresh_auth


def _login(client, email, password=PASSWORD):
    return client.post('/api/auth/login', json={'email': email, 'password': password})


def test_changing_the_password_ends_every_other_session(client, owner):
    old_access, old_refresh = auth(owner), refresh_auth(owner)

    response = client.post('/api/auth/change-password', headers=old_access, json={
        'current_password': PASSWORD, 'new_password': 'N3w!Passw0rd',
    })
    assert response.status_code == 200
    new_tokens = response.get_json()

    assert client.get('/api/auth/profile', headers=old_access).status_code == 401
    assert client.post('/api/auth/refresh', headers=old_refresh).status_code == 401
    new_access = {'Authorization': f"Bearer {new_tokens['access_token']}"}
    assert client.get('/api/auth/profile', headers=new_access).status_code == 200
    assert _login(client, 'owner@example.com', 'N3w!Passw0rd').status_code == 200
    assert _login(client, 'owner@example.com').status_code == 401


@pytest.mark.parametrize('body, message', [
    ({'current_password': 'wrong', 'new_password': 'N3w!Passw0rd'}, 'Current password is incorrect'),
    ({'current_password': PASSWORD, 'new_password': 'weak'}, 'Password must be'),
    ({'current_password': PASSWORD}, 'required'),
    ({'current_password': PASSWORD, 'new_password': 12345678}, 'required'),
])
def test_change_password_validation(client, owner, body, message):
    response = client.post('/api/auth/change-password', headers=auth(owner), json=body)
    assert response.status_code == 400
    assert message in response.get_json()['error']


def test_refresh_issues_a_working_access_token(client, owner):
    response = client.post('/api/auth/refresh', headers=refresh_auth(owner))
    assert response.status_code == 200
    headers = {'Authorization': f"Bearer {response.get_json()['access_token']}"}
    assert client.get('/api/auth/profile', headers=headers).status_code == 200


def test_access_token_cannot_be_used_to_refresh(client, owner):
    assert client.post('/api/auth/refresh', headers=auth(owner)).status_code == 401


def test_deactivated_users_are_rejected_immediately(client, owner):
    headers = auth(owner)
    owner.is_active = False
    db.session.commit()
    assert client.get('/api/auth/profile', headers=headers).status_code == 401
    assert client.post('/api/auth/refresh', headers=refresh_auth(owner)).status_code == 401
    assert _login(client, 'owner@example.com').get_json()['error'] == 'Account is deactivated'


def test_malformed_token_is_401_so_the_client_can_recover(client):
    response = client.get('/api/auth/profile', headers={'Authorization': 'Bearer not.a.jwt'})
    assert response.status_code == 401
    assert response.get_json() == {'success': False, 'error': 'Invalid token'}


@pytest.mark.parametrize('body', [
    {'email': 12345, 'password': PASSWORD},
    {'email': 'owner@example.com', 'password': 12345678},
    {'email': ['owner@example.com'], 'password': PASSWORD},
    {},
])
def test_login_rejects_non_string_credentials(client, owner, body):
    response = client.post('/api/auth/login', json=body)
    assert response.status_code == 400


@pytest.mark.parametrize('field, value', [
    ('email', 12345),
    ('password', 12345678),
    ('name', 42),
    ('username', None),
])
def test_register_rejects_wrong_types(client, field, value):
    payload = {'name': 'New Person', 'email': 'new@example.com', 'username': 'new_person', 'password': PASSWORD}
    payload[field] = value
    assert client.post('/api/auth/register', json=payload).status_code == 400


def test_emails_are_unique_ignoring_case(client, owner):
    response = client.post('/api/auth/register', json={
        'name': 'Someone Else', 'email': 'OWNER@example.com', 'username': 'someone', 'password': PASSWORD,
    })
    assert response.status_code == 409
    assert response.get_json()['error'] == 'Email already registered'


def test_profile_username_conflict_is_409(client, owner, member):
    response = client.put('/api/auth/profile', headers=auth(member), json={'username': 'OWNER'})
    assert response.status_code == 409
