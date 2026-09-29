"""Response shapes of the core endpoints the frontend depends on (see frontend/src/api/*)."""

from app import db
from app.models import Notification
from conftest import auth, event_payload, make_event, make_tag


def test_register_and_login_response_shapes(client):
    register_response = client.post('/api/auth/register', json={
        'name': 'Test User',
        'email': 'Test@Example.com',
        'username': 'testuser',
        'password': 'Strong@123',
    })
    assert register_response.status_code == 201
    body = register_response.get_json()
    assert body['success'] is True
    assert {'access_token', 'refresh_token', 'user'} <= body.keys()
    assert body['user']['email'] == 'test@example.com'
    assert body['user']['interests'] == []
    assert 'password_hash' not in body['user']

    login_response = client.post('/api/auth/login', json={'email': 'TEST@example.com', 'password': 'Strong@123'})
    assert login_response.status_code == 200
    assert login_response.get_json()['success'] is True
    assert {'access_token', 'refresh_token', 'user'} <= login_response.get_json().keys()


def test_create_event_with_source_type_and_tags(client, owner):
    """source_type no longer exists; an unknown field is ignored and tags are returned."""
    tag = make_tag('Backend')
    response = client.post('/api/events/', headers=auth(owner), json=event_payload(
        source_type='text', tag_ids=[str(tag.tag_id)],
    ))

    assert response.status_code == 201
    event = response.get_json()['event']
    assert response.get_json()['success'] is True
    assert 'source_type' not in event
    assert [t['tag_id'] for t in event['tags']] == [str(tag.tag_id)]
    assert event['current_participants'] == 1  # the organiser


def test_join_and_leave_event_response_shapes(client, owner, member):
    event = make_event(owner)

    join_response = client.post(f'/api/events/{event.event_id}/join', headers=auth(member))
    assert join_response.status_code == 201
    assert join_response.get_json()['success'] is True
    assert join_response.get_json()['participation']['status'] == 'interested'

    leave_response = client.delete(f'/api/events/{event.event_id}/leave', headers=auth(member))
    assert leave_response.status_code == 200
    assert leave_response.get_json() == {'success': True, 'message': 'Successfully left event'}


def test_notifications_list_mark_read_and_unread(client, owner, member):
    notification = Notification(user_id=owner.user_id, type='welcome', title='Hi', message='Welcome')
    db.session.add(notification)
    db.session.commit()
    headers = auth(owner)

    list_response = client.get('/api/notifications/?per_page=5&filter=unread', headers=headers)
    assert list_response.status_code == 200
    body = list_response.get_json()
    assert body['success'] is True
    assert body['pagination'] == {'page': 1, 'per_page': 5, 'total': 1, 'pages': 1}
    assert body['unread_count'] == 1

    url = f'/api/notifications/{notification.notification_id}'
    mark_read = client.put(f'{url}/mark-read', headers=headers)
    assert mark_read.status_code == 200
    assert mark_read.get_json()['notification']['is_read'] is True

    mark_unread = client.put(f'{url}/mark-unread', headers=headers)
    assert mark_unread.status_code == 200
    assert mark_unread.get_json()['notification']['is_read'] is False

    # Another user cannot touch it
    assert client.put(f'{url}/mark-read', headers=auth(member)).status_code == 403


def test_search_with_uuid_tag_filter(client, owner):
    tag = make_tag('Music')
    tagged = make_event(owner, title='Jazz Night', tags=[tag])
    make_event(owner, title='Untagged')

    response = client.get(f'/api/search/?type=events&tag_ids={tag.tag_id}', headers=auth(owner))

    assert response.status_code == 200
    body = response.get_json()
    assert body['success'] is True
    assert body['tag_ids'] == [str(tag.tag_id)]
    assert [e['event_id'] for e in body['results']['events']] == [str(tagged.event_id)]
    assert 'users' not in body['results']
