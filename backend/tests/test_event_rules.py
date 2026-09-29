"""Event validation, participation rules, list semantics and reminders."""

from datetime import datetime, timedelta, timezone

import pytest

from app import db
from app.models import Event, Notification, Participation
from app.services.task_scheduler import TaskScheduler
from conftest import auth, event_payload, future, join, make_event, make_tag


def _create(client, user, **overrides):
    return client.post('/api/events/', headers=auth(user), json=event_payload(**overrides))


# --- Validation ------------------------------------------------------------------------

@pytest.mark.parametrize('overrides, message', [
    ({'title': 'x' * 201}, 'Title must be 200 characters or fewer'),
    ({'city': 'x' * 101}, 'city must be 100 characters or fewer'),
    ({'state': 'x' * 101}, 'state must be 100 characters or fewer'),
    ({'place': 'x' * 201}, 'place must be 200 characters or fewer'),
    ({'location': 'x' * 201}, 'location must be 200 characters or fewer'),
    ({'description': 'x' * 10001}, 'Description must be 10000 characters or fewer'),
    ({'place': 123}, 'place is required'),
    ({'is_paid': 'false'}, 'is_paid must be true or false'),
    ({'is_paid': True}, 'Paid events need a price greater than 0'),
    ({'is_paid': True, 'price': 0}, 'Paid events need a price greater than 0'),
    ({'price': '10'}, 'Price must be a number'),
    ({'price': True}, 'Price must be a number'),
    ({'max_participants': 2.7}, 'max_participants must be a whole number'),
    ({'max_participants': True}, 'max_participants must be a whole number'),
    ({'max_participants': '5'}, 'max_participants must be a whole number'),
    ({'tag_ids': 'music'}, 'tag_ids must be an array'),
    ({'tag_ids': ['not-a-uuid']}, 'Each value in tag_ids must be a valid UUID'),
    ({'tag_ids': ['00000000-0000-0000-0000-000000000001']}, 'One or more tags were not found'),
    ({'timestamp': 'tomorrow'}, 'Invalid timestamp format'),
])
def test_create_event_validation(client, owner, overrides, message):
    response = _create(client, owner, **overrides)
    assert response.status_code == 400
    assert message in response.get_json()['error']
    assert Event.query.count() == 0


def test_paid_and_free_events_store_price_consistently(client, owner):
    paid = _create(client, owner, title='Paid', is_paid=True, price=499.5).get_json()['event']
    free = _create(client, owner, title='Free', price=100).get_json()['event']
    assert (paid['is_paid'], paid['price']) == (True, 499.5)
    assert (free['is_paid'], free['price']) == (False, None)


def test_duplicate_event_is_409(client, owner):
    timestamp = future().isoformat()
    assert _create(client, owner, timestamp=timestamp).status_code == 201
    response = _create(client, owner, timestamp=timestamp)
    assert response.status_code == 409
    assert response.get_json()['error'] == 'You already have an event with this title at this time'


def test_update_can_remove_the_capacity_limit(client, owner):
    event = make_event(owner, max_participants=5)
    response = client.put(f'/api/events/{event.event_id}', headers=auth(owner), json={'max_participants': None})
    assert response.status_code == 200
    assert response.get_json()['event']['max_participants'] is None


def test_update_switching_to_paid_requires_a_price(client, owner):
    event = make_event(owner)
    url = f'/api/events/{event.event_id}'
    assert client.put(url, headers=auth(owner), json={'is_paid': True}).status_code == 400
    response = client.put(url, headers=auth(owner), json={'is_paid': True, 'price': 250})
    assert response.get_json()['event']['price'] == 250.0


def test_update_notifies_participants_only_when_something_changed(client, owner, member):
    event = make_event(owner, tags=[make_tag('Music')])
    join(event, member)
    url = f'/api/events/{event.event_id}'
    unchanged = {
        'title': event.title, 'timestamp': event.timestamp.isoformat(),
        'tag_ids': [str(t.tag_id) for t in event.tags],
    }

    assert client.put(url, headers=auth(owner), json=unchanged).status_code == 200
    assert Notification.query.filter_by(type='event_update').count() == 0

    assert client.put(url, headers=auth(owner), json={'title': 'Renamed'}).status_code == 200
    updates = Notification.query.filter_by(type='event_update').all()
    assert [n.user_id for n in updates] == [member.user_id]  # the organiser is not notified


def test_update_replaces_tags(client, owner):
    music, art = make_tag('Music'), make_tag('Art')
    event = make_event(owner, tags=[music])
    response = client.put(f'/api/events/{event.event_id}', headers=auth(owner), json={'tag_ids': [str(art.tag_id)]})
    assert [t['name'] for t in response.get_json()['event']['tags']] == ['Art']


# --- Participation ---------------------------------------------------------------------

def test_join_and_leave_keep_the_cached_count_exact(client, owner, member, make_user):
    event = make_event(owner, max_participants=3)
    other = make_user('Other Person')
    for user in (member, other):
        assert client.post(f'/api/events/{event.event_id}/join', headers=auth(user)).status_code == 201
    assert db.session.get(Event, event.event_id).current_participants == 3

    late = make_user('Late Person')
    response = client.post(f'/api/events/{event.event_id}/join', headers=auth(late))
    assert (response.status_code, response.get_json()['error']) == (409, 'Event is full')

    assert client.delete(f'/api/events/{event.event_id}/leave', headers=auth(member)).status_code == 200
    assert db.session.get(Event, event.event_id).current_participants == 2
    assert client.post(f'/api/events/{event.event_id}/join', headers=auth(late)).status_code == 201


def test_duplicate_join_is_409(client, owner, member):
    event = make_event(owner)
    join(event, member)
    assert client.post(f'/api/events/{event.event_id}/join', headers=auth(member)).status_code == 409


def test_past_events_cannot_be_left_or_have_status_changes(client, owner, member):
    event = make_event(owner)
    join(event, member)
    event.timestamp = datetime.now(timezone.utc) - timedelta(hours=1)
    db.session.commit()

    assert client.delete(f'/api/events/{event.event_id}/leave', headers=auth(member)).status_code == 400
    response = client.put(f'/api/events/{event.event_id}/update-status', headers=auth(member), json={'status': 'going'})
    assert response.status_code == 400
    assert Participation.query.filter_by(user_id=member.user_id).count() == 1


def test_organiser_cannot_leave_or_change_status(client, owner):
    event = make_event(owner)
    assert client.delete(f'/api/events/{event.event_id}/leave', headers=auth(owner)).status_code == 400
    response = client.put(f'/api/events/{event.event_id}/update-status', headers=auth(owner), json={'status': 'interested'})
    assert response.status_code == 400


def test_status_changes(client, owner, member):
    event = make_event(owner)
    url = f'/api/events/{event.event_id}/update-status'
    assert client.put(url, headers=auth(member), json={'status': 'going'}).status_code == 404  # not joined
    join(event, member)
    assert client.put(url, headers=auth(member), json={'status': 'maybe'}).status_code == 400
    response = client.put(url, headers=auth(member), json={'status': 'going'})
    assert response.get_json()['participation']['status'] == 'going'


def test_event_detail_includes_the_viewers_participation(client, owner, member, make_user):
    event = make_event(owner)
    join(event, member, status='going')
    url = f'/api/events/{event.event_id}'

    assert client.get(url, headers=auth(owner)).get_json()['event']['viewer'] == {'status': 'going', 'is_creator': True}
    assert client.get(url, headers=auth(member)).get_json()['event']['viewer'] == {'status': 'going', 'is_creator': False}
    stranger = make_user('Stranger Person')
    assert client.get(url, headers=auth(stranger)).get_json()['event']['viewer']['status'] == 'not_joined'


def test_deleting_an_event_keeps_cancellation_notices(client, owner, member):
    event = make_event(owner)
    join(event, member)
    assert client.delete(f'/api/events/{event.event_id}', headers=auth(owner)).status_code == 200
    notice = Notification.query.filter_by(type='event_cancelled').one()
    assert (notice.user_id, notice.event_id) == (member.user_id, None)
    assert Participation.query.count() == 0


# --- Lists -------------------------------------------------------------------------------

def test_joined_list_excludes_own_events(client, owner, member):
    own = make_event(member, title='Mine')
    other = make_event(owner, title='Theirs')
    join(other, member)
    headers = auth(member)

    my = [e['title'] for e in client.get('/api/events/my', headers=headers).get_json()['events']]
    joined = [e['title'] for e in client.get('/api/events/joined', headers=headers).get_json()['events']]
    assert (my, joined) == ([own.title], [other.title])


def test_my_events_upcoming_filter_and_date_range(client, owner):
    make_event(owner, title='Past', hours_ahead=-48)
    make_event(owner, title='Soon', hours_ahead=24)
    make_event(owner, title='Later', hours_ahead=24 * 10)
    headers = auth(owner)

    upcoming = client.get('/api/events/my?upcoming=true', headers=headers).get_json()['events']
    assert [e['title'] for e in upcoming] == ['Soon', 'Later']

    date_to = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    in_range = client.get('/api/events/my', headers=headers, query_string={'date_to': date_to}).get_json()['events']
    assert [e['title'] for e in in_range] == ['Soon', 'Past']


def test_discover_filters_match_search(client, owner):
    music = make_tag('Music')
    make_event(owner, title='Jazz Night', tags=[music], city='Mumbai')
    make_event(owner, title='Jazz Walk', city='Chennai')
    make_event(owner, title='Old Jazz', hours_ahead=-5, city='Mumbai')
    headers = auth(owner)

    def titles(url, **params):
        return sorted(e['title'] for e in client.get(url, headers=headers, query_string=params).get_json()['events'])

    assert titles('/api/events/', q='jazz') == ['Jazz Night', 'Jazz Walk']  # upcoming only
    assert titles('/api/events/', tag_ids=str(music.tag_id)) == ['Jazz Night']
    assert titles('/api/events/', location='mumbai') == ['Jazz Night']
    assert client.get('/api/events/?sort_by=relevance', headers=headers).status_code == 400


# --- Reminders -----------------------------------------------------------------------------

def test_rescheduled_event_gets_a_new_reminder(app, owner, member):
    event = make_event(owner, hours_ahead=10)
    join(event, member)
    scheduler = TaskScheduler()
    scheduler.init_app(app)

    scheduler.run_once()
    scheduler.run_once()
    assert Notification.query.filter_by(user_id=member.user_id, type='event_reminder').count() == 1

    # Moved: the earlier reminder no longer covers the new time
    event.timestamp = future(20)
    reminder = Notification.query.filter_by(user_id=member.user_id, type='event_reminder').one()
    reminder.created_at = datetime.now(timezone.utc) - timedelta(hours=10)
    db.session.commit()
    scheduler.run_once()
    assert Notification.query.filter_by(user_id=member.user_id, type='event_reminder').count() == 2
