"""Tests for the end-to-end fixes: logout revocation, validation rules shared with
the frontend, past events, list tags/sorting, delete notifications, scheduler."""

from datetime import datetime, timedelta, timezone

import pytest
from flask_jwt_extended import create_access_token, create_refresh_token

from app import db
from app.models import Event, EventTag, Notification, Participation, RevokedToken, Tag, User
from app.services.task_scheduler import TaskScheduler


def _make_user(name='Owner Person', username='owner', email='owner@example.com', role='user'):
    user = User(name=name, username=username, email=email, password_hash='hash', role=role)
    db.session.add(user)
    db.session.commit()
    return user


def _make_event(owner, title='Tech Meetup', hours_ahead=72, **kwargs):
    event = Event(
        title=title,
        timestamp=datetime.now(timezone.utc) + timedelta(hours=hours_ahead),
        place='Hall', location='Main St', city='Chennai', state='Tamil Nadu',
        source_type='text', posted_by=owner.user_id, **kwargs,
    )
    db.session.add(event)
    db.session.commit()
    return event


def _join(event, user, status='going'):
    db.session.add(Participation(event_id=event.event_id, user_id=user.user_id, status=status))
    db.session.commit()


def _auth(user):
    return {'Authorization': f'Bearer {create_access_token(identity=str(user.user_id))}'}


def _register(client, **overrides):
    payload = {'name': 'New Person', 'email': 'new@example.com', 'username': 'new_person',
               'password': 'Strong#Pass1'}
    payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


@pytest.fixture
def owner(app):
    return _make_user()


@pytest.fixture
def member(app):
    return _make_user('Member Person', 'member', 'member@example.com')


# --- Logout revokes tokens ---------------------------------------------------

def test_logout_revokes_access_and_refresh_tokens(client, owner):
    with client.application.app_context():
        access = create_access_token(identity=str(owner.user_id))
        refresh = create_refresh_token(identity=str(owner.user_id))
    headers = {'Authorization': f'Bearer {access}'}

    assert client.get('/api/auth/profile', headers=headers).status_code == 200
    response = client.post('/api/auth/logout', headers=headers, json={'refresh_token': refresh})
    assert response.status_code == 200
    assert RevokedToken.query.count() == 2

    after = client.get('/api/auth/profile', headers=headers)
    assert after.status_code == 401
    assert after.get_json() == {'success': False, 'error': 'Token has been revoked'}
    assert client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh}'}).status_code == 401


# --- Validation rules (mirrored in frontend/src/utils/validators.ts) ---------

@pytest.mark.parametrize('overrides', [
    {'password': 'Strong#Pass1'},            # '#' is a valid special character
    {'email': 'first.last+events@gmail.com'},  # plus-addressing
    {'name': 'நிதேஷ் குமார்'},                  # Tamil name (letters + combining marks)
    {'name': "Mary-Jane O'Neil Jr."},
])
def test_register_accepts_valid_input(client, overrides):
    assert _register(client, **overrides).status_code == 201


@pytest.mark.parametrize('overrides, message_part', [
    ({'password': 'Password1'}, 'Password'),        # no special char + weak pattern
    ({'password': 'Strong#12345'}, 'Password'),     # weak pattern
    ({'username': 'ab'}, 'Username'),               # too short
    ({'username': 'has space'}, 'Username'),
    ({'name': 'John2'}, 'Name'),
    ({'profile_image_url': 'javascript:alert(1)'}, 'Profile image URL'),
    ({'preferences': 'music'}, 'Preferences'),
])
def test_register_rejects_invalid_input(client, overrides, message_part):
    response = _register(client, **overrides)
    assert response.status_code == 400
    assert message_part in response.get_json()['error']


def test_usernames_are_unique_ignoring_case(client, owner):
    response = _register(client, username='OWNER')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'Username already taken'


def test_profile_update_uses_the_same_validation(client, owner):
    headers = _auth(owner)
    assert client.put('/api/auth/profile', headers=headers, json={'username': 'x'}).status_code == 400
    assert client.put('/api/auth/profile', headers=headers,
                      json={'profile_image_url': 'data:text/html,hi'}).status_code == 400
    ok = client.put('/api/auth/profile', headers=headers,
                    json={'bio': 'Hello', 'profile_image_url': 'https://example.com/me.png'})
    assert ok.status_code == 200


def test_non_object_json_body_is_rejected(client, owner):
    response = client.post('/api/events/', headers=_auth(owner), json=['not', 'an', 'object'])
    assert response.status_code == 400
    assert response.get_json() == {'success': False, 'error': 'Invalid request body'}


# --- Past events stay viewable -------------------------------------------------

def test_past_events_are_viewable_but_not_listed_as_upcoming(client, owner):
    past = _make_event(owner, title='Old Meetup', hours_ahead=-48, is_active=False)
    upcoming = _make_event(owner, title='New Meetup')
    headers = _auth(owner)

    assert client.get(f'/api/events/{past.event_id}').status_code == 200
    listed = [e['event_id'] for e in client.get('/api/events/').get_json()['events']]
    assert listed == [str(upcoming.event_id)]

    mine = {e['event_id'] for e in client.get('/api/events/my', headers=headers).get_json()['events']}
    assert mine == {str(past.event_id), str(upcoming.event_id)}

    searched = client.get('/api/search/?type=events&q=Meetup').get_json()['results']['events']
    # upcoming first, then past
    assert [e['event_id'] for e in searched] == [str(upcoming.event_id), str(past.event_id)]


def test_past_events_cannot_be_edited_or_joined(client, owner, member):
    past = _make_event(owner, hours_ahead=-2)
    assert client.put(f'/api/events/{past.event_id}', headers=_auth(owner), json={'title': 'X'}).status_code == 400
    assert client.post(f'/api/events/{past.event_id}/join', headers=_auth(member)).status_code == 400


# --- Lists include tags; sorting; LIKE escaping --------------------------------

def test_event_lists_include_tags(client, owner):
    event = _make_event(owner)
    tag = Tag(name='Music')
    db.session.add(tag)
    db.session.flush()
    db.session.add(EventTag(event_id=event.event_id, tag_id=tag.tag_id))
    db.session.commit()

    listed = client.get('/api/events/').get_json()['events'][0]
    assert [t['name'] for t in listed['tags']] == ['Music']
    searched = client.get('/api/search/?type=events').get_json()['results']['events'][0]
    assert [t['name'] for t in searched['tags']] == ['Music']


def test_sort_by_created_at_returns_newest_first(client, owner):
    created = datetime.now(timezone.utc)
    first = _make_event(owner, title='First created', hours_ahead=10, created_at=created - timedelta(hours=1))
    second = _make_event(owner, title='Second created', hours_ahead=100, created_at=created)
    by_date = [e['title'] for e in client.get('/api/events/?sort_by=date').get_json()['events']]
    newest = [e['title'] for e in client.get('/api/events/?sort_by=created_at').get_json()['events']]
    assert by_date == [first.title, second.title]
    assert newest == [second.title, first.title]


def test_search_wildcards_are_matched_literally(client, owner):
    _make_event(owner, title='Flat 50% off')
    _make_event(owner, title='Something else')
    titles = [e['title'] for e in client.get('/api/search/?type=events&q=%25').get_json()['results']['events']]
    assert titles == ['Flat 50% off']


# --- Delete notifies participants ----------------------------------------------

def test_delete_event_notifies_participants_and_removes_tags(client, owner, member):
    event = _make_event(owner)
    _join(event, owner)
    _join(event, member, status='interested')
    tag = Tag(name='Art')
    db.session.add(tag)
    db.session.flush()
    db.session.add(EventTag(event_id=event.event_id, tag_id=tag.tag_id))
    db.session.commit()
    event_id = event.event_id

    assert client.delete(f'/api/events/{event_id}', headers=_auth(owner)).status_code == 200
    assert EventTag.query.filter_by(event_id=event_id).count() == 0
    assert Participation.query.filter_by(event_id=event_id).count() == 0

    cancelled = Notification.query.filter_by(type='event_cancelled').all()
    assert [n.user_id for n in cancelled] == [member.user_id]  # creator isn't notified
    assert cancelled[0].event_id is None  # kept, but unlinked from the deleted event


# --- Scheduler -------------------------------------------------------------------

def test_scheduler_reminders_are_created_once_and_past_events_expire(app, owner, member):
    soon = _make_event(owner, title='Soon', hours_ahead=5)
    later = _make_event(owner, title='Later', hours_ahead=72)
    ended = _make_event(owner, title='Ended', hours_ahead=-1)
    _join(soon, member)
    _join(later, member)

    scheduler = TaskScheduler()
    scheduler.init_app(app)
    scheduler.run_once()
    scheduler.run_once()  # a second tick (or a restart) must not duplicate reminders

    reminders = Notification.query.filter_by(type='event_reminder').all()
    assert [(n.user_id, n.event_id) for n in reminders] == [(member.user_id, soon.event_id)]
    assert 'UTC' in reminders[0].message
    assert db.session.get(Event, ended.event_id).is_active is False
    assert db.session.get(Event, soon.event_id).is_active is True


def test_scheduler_deletes_expired_revoked_tokens(app):
    now = datetime.now(timezone.utc)
    db.session.add_all([
        RevokedToken(jti='expired', expires_at=now - timedelta(minutes=1)),
        RevokedToken(jti='active', expires_at=now + timedelta(minutes=10)),
    ])
    db.session.commit()

    scheduler = TaskScheduler()
    scheduler.init_app(app)
    scheduler.run_once()
    assert [t.jti for t in RevokedToken.query.all()] == ['active']


# --- Tags and notifications ------------------------------------------------------

def test_tag_validation_for_admins(client):
    admin = _make_user('Admin Person', 'admin_user', 'admin@example.com', role='admin')
    headers = _auth(admin)
    assert client.post('/api/tags/', headers=headers, json={'name': 'Music', 'color': 'red'}).status_code == 400
    assert client.post('/api/tags/', headers=headers, json={'name': 'Music', 'color': '#FF5733'}).status_code == 201
    duplicate = client.post('/api/tags/', headers=headers, json={'name': 'music'})
    assert duplicate.status_code == 400
    assert duplicate.get_json()['error'] == 'Tag already exists'


def test_notification_types_include_every_type_the_app_creates(client, owner):
    types = client.get('/api/notifications/types', headers=_auth(owner)).get_json()['types']
    for expected in ['welcome', 'event_joined', 'event_reminder', 'event_update',
                     'new_participant', 'participant_left', 'event_cancelled']:
        assert expected in types


# --- Search: by tags alone, by name alone, or both -----------------------------

def test_search_by_tags_only_name_only_or_both(client, owner):
    music = Tag(name='Music')
    art = Tag(name='Art')
    db.session.add_all([music, art])
    db.session.flush()
    jazz = _make_event(owner, title='Jazz Night')
    gallery = _make_event(owner, title='Gallery Walk')
    jazz_art = _make_event(owner, title='Jazz Painting')
    db.session.add_all([
        EventTag(event_id=jazz.event_id, tag_id=music.tag_id),
        EventTag(event_id=gallery.event_id, tag_id=art.tag_id),
        EventTag(event_id=jazz_art.event_id, tag_id=art.tag_id),
    ])
    db.session.commit()

    def titles(url):
        return sorted(e['title'] for e in client.get(url).get_json()['results']['events'])

    # Tags alone (no text): every event with any selected tag
    assert titles(f'/api/search/?type=events&tag_ids={art.tag_id}') == ['Gallery Walk', 'Jazz Painting']
    assert titles(f'/api/search/?type=events&tag_ids={art.tag_id},{music.tag_id}') == \
        ['Gallery Walk', 'Jazz Night', 'Jazz Painting']
    # Name alone (no tags)
    assert titles('/api/search/?type=events&q=jazz') == ['Jazz Night', 'Jazz Painting']
    # Both: name AND tag must match
    assert titles(f'/api/search/?type=events&q=jazz&tag_ids={art.tag_id}') == ['Jazz Painting']


# --- HTTPS -------------------------------------------------------------------------

def test_https_is_forced_except_for_health_checks(monkeypatch):
    """With FORCE_HTTPS (default in production), plain HTTP is redirected."""
    import config as config_module
    from app import create_app
    monkeypatch.setattr(config_module.TestingConfig, 'FORCE_HTTPS', True, raising=False)
    https_app = create_app('testing')
    with https_app.app_context():
        db.create_all()
    client = https_app.test_client()

    response = client.post('/api/auth/login', json={}, base_url='http://planpal.example')
    assert response.status_code == 308  # keeps the method: POST stays POST
    assert response.headers['Location'] == 'https://planpal.example/api/auth/login'

    # Health checks stay reachable over HTTP for the hosting platform
    assert client.get('/api/system/health', base_url='http://planpal.example').status_code == 200
    # HTTPS requests are served normally
    assert client.get('/api/tags/', base_url='https://planpal.example').status_code == 200
