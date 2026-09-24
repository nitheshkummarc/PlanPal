"""Regression tests for fixed bugs (atomic joins, validation, search, pagination, tags)."""

from datetime import datetime, timedelta, timezone

import pytest
from flask_jwt_extended import create_access_token

from app import db
from app.models import Event, EventTag, Notification, Participation, Tag, User, UserTag
from app.services.notification_service import NotificationService


def _make_user(name, username, email):
    user = User(name=name, username=username, email=email, password_hash='hash')
    db.session.add(user)
    db.session.commit()
    return user


def _make_event(owner, title='Tech Meetup', days_ahead=3, **kwargs):
    event = Event(
        title=title,
        timestamp=datetime.now(timezone.utc) + timedelta(days=days_ahead),
        place='Hall', location='Main St', city='Chennai', state='Tamil Nadu',
        source_type='text', posted_by=owner.user_id, **kwargs,
    )
    db.session.add(event)
    db.session.commit()
    return event


def _auth(user):
    return {'Authorization': f'Bearer {create_access_token(identity=str(user.user_id))}'}


@pytest.fixture
def owner(app):
    return _make_user('Owner Person', 'owner', 'owner@example.com')


@pytest.fixture
def member(app):
    return _make_user('Member Person', 'member', 'member@example.com')


def test_register_saves_welcome_notification(client):
    response = client.post('/api/auth/register', json={
        'name': 'New Person', 'email': 'new@example.com', 'username': 'newperson',
        'password': 'Strong@123x',
    })
    assert response.status_code == 201
    user_id = response.get_json()['user']['user_id']
    assert Notification.query.filter_by(type='welcome').count() == 1
    assert str(Notification.query.first().user_id) == user_id


def test_join_is_atomic_when_notification_fails(client, owner, member, monkeypatch):
    event = _make_event(owner)

    def boom(*_args, **_kwargs):
        raise RuntimeError('notification insert failed')

    monkeypatch.setattr(NotificationService, 'notify_user_joined_event', boom)
    response = client.post(f'/api/events/{event.event_id}/join', headers=_auth(member))

    assert response.status_code == 500
    assert Participation.query.filter_by(user_id=member.user_id).count() == 0


def test_join_saves_participation_and_notifications_together(client, owner, member):
    event = _make_event(owner)
    response = client.post(f'/api/events/{event.event_id}/join', headers=_auth(member))

    assert response.status_code == 201
    assert Participation.query.filter_by(user_id=member.user_id).count() == 1
    assert Notification.query.filter_by(type='new_participant').count() == 1
    assert Notification.query.filter_by(type='event_joined').count() == 1


def test_update_event_rejects_invalid_values(client, owner):
    event = _make_event(owner)
    headers = _auth(owner)

    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.put(f'/api/events/{event.event_id}', headers=headers, json={'timestamp': past}).status_code == 400
    assert client.put(f'/api/events/{event.event_id}', headers=headers, json={'price': -5}).status_code == 400
    assert client.put(f'/api/events/{event.event_id}', headers=headers, json={'title': '   '}).status_code == 400
    assert client.put(f'/api/events/{event.event_id}', headers=headers, json={'max_participants': 0}).status_code == 400


def test_update_event_keeps_unchanged_timestamp_and_clears_price_when_free(client, owner):
    event = _make_event(owner, is_paid=True, price=100)
    response = client.put(f'/api/events/{event.event_id}', headers=_auth(owner), json={
        'title': 'Renamed Meetup',
        'timestamp': event.timestamp.isoformat(),
        'is_paid': False,
    })
    assert response.status_code == 200
    body = response.get_json()['event']
    assert body['title'] == 'Renamed Meetup'
    assert body['price'] is None


def test_update_event_rejects_capacity_below_current_participants(client, owner):
    event = _make_event(owner, current_participants=5)
    response = client.put(f'/api/events/{event.event_id}', headers=_auth(owner), json={'max_participants': 2})
    assert response.status_code == 400


def test_unified_search_does_not_expose_emails(client, owner):
    response = client.get('/api/search/?type=users&q=owner')
    assert response.status_code == 200
    users = response.get_json()['results']['users']
    assert users
    assert all('email' not in u for u in users)


def test_search_tag_filter_returns_each_event_once(client, owner):
    event = _make_event(owner)
    tags = [Tag(name='Music'), Tag(name='Art')]
    db.session.add_all(tags)
    db.session.flush()
    db.session.add_all([EventTag(event_id=event.event_id, tag_id=t.tag_id) for t in tags])
    db.session.commit()

    tag_ids = ','.join(str(t.tag_id) for t in tags)
    events = client.get(f'/api/search/?type=events&tag_ids={tag_ids}').get_json()['results']['events']
    assert [e['event_id'] for e in events] == [str(event.event_id)]


def test_date_to_includes_the_whole_day(client, owner):
    event = _make_event(owner)
    day = event.timestamp.date().isoformat()

    listed = client.get(f'/api/events/?date_from={day}&date_to={day}').get_json()['events']
    searched = client.get(f'/api/search/?type=events&date_from={day}&date_to={day}').get_json()['results']['events']
    assert [e['event_id'] for e in listed] == [str(event.event_id)]
    assert [e['event_id'] for e in searched] == [str(event.event_id)]


def test_invalid_event_id_returns_400_on_every_event_route(client, owner):
    headers = _auth(owner)
    for method, url in [
        ('post', '/api/events/not-a-uuid/join'),
        ('delete', '/api/events/not-a-uuid/leave'),
        ('put', '/api/events/not-a-uuid'),
        ('delete', '/api/events/not-a-uuid'),
        ('put', '/api/events/not-a-uuid/update-status'),
        ('get', '/api/events/not-a-uuid/participation_status'),
    ]:
        response = getattr(client, method)(url, headers=headers, json={'status': 'going'})
        assert response.status_code == 400, url
        assert response.get_json() == {'success': False, 'error': 'Invalid event ID format'}


def test_invalid_date_filter_returns_400(client):
    assert client.get('/api/events/?date_from=not-a-date').status_code == 400
    assert client.get('/api/search/?type=events&date_to=31-12-2026').status_code == 400


def test_pagination_bounds_do_not_crash(client):
    response = client.get('/api/events/?per_page=0&page=0')
    assert response.status_code == 200
    assert response.get_json()['pagination']['per_page'] == 10  # falls back to the default
    assert response.get_json()['pagination']['page'] == 1

    response = client.get('/api/events/?per_page=100000')
    assert response.get_json()['pagination']['per_page'] == 100


def test_popular_tags_counts_are_not_multiplied(client, owner, member):
    event_a = _make_event(owner, title='A')
    event_b = _make_event(owner, title='B')
    tag = Tag(name='Tech')
    db.session.add(tag)
    db.session.flush()
    db.session.add_all([
        UserTag(user_id=owner.user_id, tag_id=tag.tag_id),
        UserTag(user_id=member.user_id, tag_id=tag.tag_id),
        EventTag(event_id=event_a.event_id, tag_id=tag.tag_id),
        EventTag(event_id=event_b.event_id, tag_id=tag.tag_id),
    ])
    db.session.commit()

    tags = client.get('/api/tags/popular').get_json()['tags']
    assert tags[0]['name'] == 'Tech'
    assert tags[0]['usage_count'] == 4  # 2 users + 2 events (was 8 before the fix)


def test_errors_use_one_json_shape_across_the_api(client, owner):
    """Every error is JSON: {"success": false, "error": "..."}."""
    headers = _auth(owner)
    cases = [
        (client.get('/api/does-not-exist'), 404),
        (client.patch('/api/events/'), 405),  # was an HTML page
        (client.post('/api/auth/login', data='{bad', content_type='application/json'), 400),  # was 500
        (client.post('/api/auth/login', data='x', content_type='text/plain'), 400),  # was 500
        (client.get('/api/events/my'), 401),  # JWT errors used {"msg": ...}
        (client.put('/api/tags/not-a-uuid', headers=headers, json={}), 400),
        (client.put('/api/notifications/not-a-uuid/mark-read', headers=headers), 400),
    ]
    for response, status in cases:
        body = response.get_json()
        assert response.status_code == status, (response.request.path, response.status_code)
        assert body['success'] is False
        assert isinstance(body['error'], str) and body['error']
        assert 'msg' not in body
