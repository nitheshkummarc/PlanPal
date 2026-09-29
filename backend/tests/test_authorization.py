"""Authentication is required everywhere except the public auth routes and health probes,
and ownership / admin checks are enforced on every mutating route."""

import pytest

from app import db
from app.models import Event, Notification, Tag
from conftest import auth, event_payload, join, make_event, make_tag

PROTECTED_ROUTES = [
    ('get', '/api/auth/profile'),
    ('put', '/api/auth/profile'),
    ('post', '/api/auth/change-password'),
    ('post', '/api/auth/logout'),
    ('get', '/api/users/00000000-0000-0000-0000-000000000001'),
    ('get', '/api/events/'),
    ('post', '/api/events/'),
    ('get', '/api/events/00000000-0000-0000-0000-000000000001'),
    ('put', '/api/events/00000000-0000-0000-0000-000000000001'),
    ('delete', '/api/events/00000000-0000-0000-0000-000000000001'),
    ('post', '/api/events/00000000-0000-0000-0000-000000000001/join'),
    ('delete', '/api/events/00000000-0000-0000-0000-000000000001/leave'),
    ('put', '/api/events/00000000-0000-0000-0000-000000000001/update-status'),
    ('get', '/api/events/my'),
    ('get', '/api/events/joined'),
    ('get', '/api/notifications/'),
    ('delete', '/api/notifications/'),
    ('get', '/api/notifications/unread_count'),
    ('put', '/api/notifications/mark-all-read'),
    ('get', '/api/search/'),
    ('get', '/api/tags/'),
    ('post', '/api/tags/'),
]


@pytest.mark.parametrize('method, url', PROTECTED_ROUTES)
def test_routes_require_a_token(client, method, url):
    response = getattr(client, method)(url, json={})
    assert response.status_code == 401
    assert response.get_json() == {'success': False, 'error': 'Authentication required'}


@pytest.mark.parametrize('url', ['/api/system/health', '/api/system/ready'])
def test_health_probes_are_public(client, url):
    assert client.get(url).status_code == 200


def test_only_the_organiser_can_edit(client, owner, member):
    event = make_event(owner)
    response = client.put(f'/api/events/{event.event_id}', headers=auth(member), json={'title': 'Hijacked'})
    assert response.status_code == 403
    assert db.session.get(Event, event.event_id).title == 'Tech Meetup'


def test_admins_cannot_edit_other_peoples_events(client, owner, admin):
    event = make_event(owner)
    assert client.put(f'/api/events/{event.event_id}', headers=auth(admin), json={'title': 'X'}).status_code == 403


def test_only_the_organiser_or_an_admin_can_delete(client, owner, member, admin):
    event = make_event(owner)
    assert client.delete(f'/api/events/{event.event_id}', headers=auth(member)).status_code == 403
    assert db.session.get(Event, event.event_id) is not None

    assert client.delete(f'/api/events/{event.event_id}', headers=auth(admin)).status_code == 200
    assert db.session.get(Event, event.event_id) is None


def test_users_cannot_touch_other_users_notifications(client, owner, member):
    notification = Notification(user_id=owner.user_id, type='welcome', title='Hi', message='Hello')
    db.session.add(notification)
    db.session.commit()
    url = f'/api/notifications/{notification.notification_id}'
    headers = auth(member)

    assert client.put(f'{url}/mark-read', headers=headers).status_code == 403
    assert client.put(f'{url}/mark-unread', headers=headers).status_code == 403
    assert client.delete(url, headers=headers).status_code == 403
    assert db.session.get(Notification, notification.notification_id).is_read is False

    # Bulk actions only affect the caller's own notifications
    client.put('/api/notifications/mark-all-read', headers=headers)
    client.delete('/api/notifications/', headers=headers)
    assert db.session.get(Notification, notification.notification_id) is not None
    assert db.session.get(Notification, notification.notification_id).is_read is False


@pytest.mark.parametrize('method, suffix, body', [
    ('post', '', {'name': 'NewTag'}),
    ('put', '{tag_id}', {'name': 'Renamed'}),
    ('delete', '{tag_id}', None),
])
def test_tag_changes_require_admin(client, member, method, suffix, body):
    tag = make_tag('Music')
    url = '/api/tags/' + suffix.format(tag_id=tag.tag_id)
    response = getattr(client, method)(url, headers=auth(member), json=body)
    assert response.status_code == 403
    assert response.get_json()['error'] == 'Admin access required'
    assert Tag.query.count() == 1
    assert Tag.query.first().name == 'Music'


def test_demoted_admin_loses_access_immediately(client, admin):
    headers = auth(admin)
    admin.role = 'user'
    db.session.commit()
    assert client.post('/api/tags/', headers=headers, json={'name': 'Music'}).status_code == 403


def test_other_users_emails_are_never_returned(client, owner, member):
    make_event(owner)
    member_view = client.get(f'/api/users/{owner.user_id}', headers=auth(member)).get_json()['user']
    own_view = client.get(f'/api/users/{owner.user_id}', headers=auth(owner)).get_json()['user']
    assert 'email' not in member_view
    assert own_view['email'] == 'owner@example.com'


def test_event_detail_shows_participants_only_to_signed_in_users(client, owner, member):
    event = make_event(owner)
    join(event, member)
    assert client.get(f'/api/events/{event.event_id}').status_code == 401
    participants = client.get(f'/api/events/{event.event_id}', headers=auth(member)).get_json()['event']['participants']
    assert [p['name'] for p in participants] == ['Owner Person', 'Member Person']


def test_joining_requires_an_account_that_still_exists(client, owner, make_user):
    ghost = make_user('Ghost User')
    headers = auth(ghost)
    db.session.delete(ghost)
    db.session.commit()
    assert client.post('/api/events/', headers=headers, json=event_payload()).status_code == 401
