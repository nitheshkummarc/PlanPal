"""User interests (user_tags), tag administration, and notification management."""

import pytest

from app import db
from app.models import Notification, Tag, event_tags, user_tags
from conftest import PASSWORD, auth, make_event, make_tag


# --- Interests ---------------------------------------------------------------------------

def test_register_with_interests(client):
    music = make_tag('Music')
    response = client.post('/api/auth/register', json={
        'name': 'New Person', 'email': 'new@example.com', 'username': 'new_person',
        'password': PASSWORD, 'interest_tag_ids': [str(music.tag_id)],
    })
    assert response.status_code == 201
    assert [t['name'] for t in response.get_json()['user']['interests']] == ['Music']


def test_profile_update_replaces_interests(client, owner):
    music, art = make_tag('Music'), make_tag('Art')
    headers = auth(owner)
    response = client.put('/api/auth/profile', headers=headers,
                          json={'interest_tag_ids': [str(music.tag_id), str(art.tag_id)]})
    assert [t['name'] for t in response.get_json()['user']['interests']] == ['Art', 'Music']

    response = client.put('/api/auth/profile', headers=headers, json={'interest_tag_ids': []})
    assert response.get_json()['user']['interests'] == []


def test_unknown_interest_is_rejected(client, owner):
    response = client.put('/api/auth/profile', headers=auth(owner),
                          json={'interest_tag_ids': ['00000000-0000-0000-0000-000000000001']})
    assert response.status_code == 400


def test_people_search_by_interest(client, owner, member):
    music = make_tag('Music')
    member.interests = [music]
    db.session.commit()
    response = client.get(f'/api/search/?type=users&tag_ids={music.tag_id}', headers=auth(owner))
    users = response.get_json()['results']['users']
    assert [u['username'] for u in users] == ['member']
    assert [t['name'] for t in users[0]['interests']] == ['Music']


def test_renaming_a_tag_keeps_interests(client, admin, member):
    music = make_tag('Music')
    member.interests = [music]
    db.session.commit()
    client.put(f'/api/tags/{music.tag_id}', headers=auth(admin), json={'name': 'Live Music'})
    profile = client.get('/api/auth/profile', headers=auth(member)).get_json()['user']
    assert [t['name'] for t in profile['interests']] == ['Live Music']


# --- Tag administration -------------------------------------------------------------------

def test_admin_tag_lifecycle(client, admin):
    headers = auth(admin)
    created = client.post('/api/tags/', headers=headers, json={'name': ' Music ', 'color': '#FF5733'})
    assert created.status_code == 201
    tag_id = created.get_json()['tag']['tag_id']
    assert created.get_json()['tag']['name'] == 'Music'

    updated = client.put(f'/api/tags/{tag_id}', headers=headers, json={'description': 'Concerts', 'color': ''})
    assert updated.get_json()['tag']['description'] == 'Concerts'
    assert updated.get_json()['tag']['color'] is None

    listed = client.get('/api/tags/', headers=headers).get_json()['tags']
    assert [t['name'] for t in listed] == ['Music']

    assert client.delete(f'/api/tags/{tag_id}', headers=headers).status_code == 200
    assert Tag.query.count() == 0


@pytest.mark.parametrize('body, status', [
    ({'name': ''}, 400),
    ({'name': 'x' * 51}, 400),
    ({'name': 'Art', 'color': 'red'}, 400),
    ({'name': 'MUSIC'}, 409),
])
def test_tag_validation(client, admin, body, status):
    make_tag('Music')
    assert client.post('/api/tags/', headers=auth(admin), json=body).status_code == status


def test_deleting_a_tag_removes_its_links(client, admin, owner):
    music = make_tag('Music')
    make_event(owner, tags=[music])
    owner.interests = [music]
    db.session.commit()

    assert client.delete(f'/api/tags/{music.tag_id}', headers=auth(admin)).status_code == 200
    assert db.session.query(event_tags).count() == 0
    assert db.session.query(user_tags).count() == 0


# --- Notification management ---------------------------------------------------------------

def _notify(user, count, is_read=False):
    for n in range(count):
        db.session.add(Notification(user_id=user.user_id, type='welcome', title=f'N{n}', message='m', is_read=is_read))
    db.session.commit()


def test_notification_filters_and_counts(client, owner):
    _notify(owner, 3)
    _notify(owner, 2, is_read=True)
    headers = auth(owner)

    def total(filter_value):
        body = client.get(f'/api/notifications/?filter={filter_value}', headers=headers).get_json()
        return body['pagination']['total']

    assert (total('all'), total('unread'), total('read')) == (5, 3, 2)
    assert client.get('/api/notifications/unread_count', headers=headers).get_json()['unread_count'] == 3
    assert client.get('/api/notifications/?filter=bogus', headers=headers).status_code == 400


def test_mark_all_read_and_delete_all(client, owner):
    _notify(owner, 3)
    headers = auth(owner)

    assert client.put('/api/notifications/mark-all-read', headers=headers).get_json()['updated_count'] == 3
    assert client.get('/api/notifications/unread_count', headers=headers).get_json()['unread_count'] == 0

    assert client.delete('/api/notifications/', headers=headers).get_json()['deleted_count'] == 3
    assert Notification.query.count() == 0


def test_clients_cannot_create_notifications(client, owner):
    headers = auth(owner)
    body = {'type': 'welcome', 'title': 'x', 'message': 'y'}
    assert client.post('/api/notifications/', headers=headers, json=body).status_code == 405
    assert client.post('/api/notifications/test', headers=headers).status_code == 405
