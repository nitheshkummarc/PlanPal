import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

os.environ.setdefault("SUPABASE_DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app, bcrypt, db
from flask_jwt_extended import create_access_token


class QueryResult:
    def __init__(self, value=None):
        self.value = value

    def first(self):
        return self.value

    def all(self):
        return self.value or []

    def count(self):
        return len(self.value or []) if isinstance(self.value, list) else 0

    def get(self, _id):
        return self.value

    def filter_by(self, **_kwargs):
        return self

    def filter(self, *_args):
        return self

    def join(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def limit(self, *_args):
        return self

    def paginate(self, page=1, per_page=20, error_out=False):
        return SimpleNamespace(
            items=self.value or [],
            page=page,
            pages=1,
            per_page=per_page,
            total=len(self.value or []),
        )


class FakeSession:
    def __init__(self):
        self.added = []
        self.deleted = []
        self.commits = 0

    def __call__(self):
        return self

    def remove(self):
        pass

    def add(self, obj):
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.commits += 1

    def rollback(self):
        pass

    def query(self, *_args):
        return QueryResult([])

    def get(self, model, _id):
        if hasattr(model, 'query') and hasattr(model.query, 'get'):
            return model.query.get(_id)
        return None


@pytest.fixture()
def app():
    app = create_app("development")
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(app):
    with app.app_context():
        token = create_access_token(identity=str(uuid4()))
    return {"Authorization": f"Bearer {token}"}


def fake_user(**overrides):
    user = SimpleNamespace(
        user_id=uuid4(),
        name="Test User",
        email="test@example.com",
        username="testuser",
        password_hash=bcrypt.generate_password_hash("Strong@123").decode("utf-8"),
        role="user",
        is_active=True,
        to_dict=lambda: {
            "user_id": str(user.user_id),
            "name": user.name,
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "is_active": user.is_active,
        },
    )
    for key, value in overrides.items():
        setattr(user, key, value)
    return user


def fake_event(**overrides):
    event = SimpleNamespace(
        event_id=uuid4(),
        posted_by=uuid4(),
        title="Backend Review Meetup",
        description="Testing API contracts",
        timestamp=datetime.utcnow() + timedelta(days=1),
        place="Library",
        location="Main Street",
        city="Bengaluru",
        state="Karnataka",
        is_paid=False,
        price=None,
        source_type="text",
        max_participants=10,
        current_participants=0,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        update_participant_count=lambda: None,
        to_dict=lambda: {
            "event_id": str(event.event_id),
            "posted_by": str(event.posted_by),
            "title": event.title,
            "timestamp": event.timestamp.isoformat(),
            "source_type": event.source_type,
            "current_participants": event.current_participants,
        },
    )
    for key, value in overrides.items():
        setattr(event, key, value)
    return event


def fake_notification(user_id):
    notification = SimpleNamespace(
        notification_id=uuid4(),
        user_id=user_id,
        is_read=False,
        to_dict=lambda: {
            "notification_id": str(notification.notification_id),
            "user_id": str(notification.user_id),
            "is_read": notification.is_read,
        },
    )
    return notification


def test_register_and_login_response_shapes(client, monkeypatch):
    import app.routes.auth as auth
    import app.services.notification_service as notification_service

    session = FakeSession()
    monkeypatch.setattr(auth.db, "session", session)
    monkeypatch.setattr(auth.User, "query", QueryResult(None), raising=False)
    monkeypatch.setattr(notification_service.NotificationService, "create_notification", lambda **_kwargs: None)

    register_response = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "username": "testuser",
        "password": "Strong@123",
    })

    assert register_response.status_code == 201
    assert register_response.json["success"] is True
    assert "access_token" in register_response.json
    assert "user" in register_response.json

    user = session.added[0]
    user.is_active = True
    monkeypatch.setattr(auth.User, "query", QueryResult(user), raising=False)

    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Strong@123",
    })

    assert login_response.status_code == 200
    assert login_response.json["success"] is True
    assert "refresh_token" in login_response.json


def test_create_event_with_source_type_and_tags(client, auth_headers, monkeypatch):
    import app.routes.events as events

    session = FakeSession()
    tag_id = uuid4()
    tag = SimpleNamespace(tag_id=tag_id, to_dict=lambda: {"tag_id": str(tag_id), "name": "Backend"})
    monkeypatch.setattr(events.db, "session", session)
    monkeypatch.setattr(events.Tag, "query", QueryResult([tag]), raising=False)

    response = client.post("/api/events/", headers=auth_headers, json={
        "title": "Backend Review Meetup",
        "timestamp": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "place": "Library",
        "location": "Main Street",
        "city": "Bengaluru",
        "state": "Karnataka",
        "source_type": "text",
        "tag_ids": [str(tag_id)],
    })

    assert response.status_code == 201
    assert response.json["success"] is True
    assert response.json["event"]["source_type"] == "text"
    assert response.json["event"]["tags"][0]["tag_id"] == str(tag_id)


def test_join_and_leave_event_response_shapes(client, auth_headers, monkeypatch):
    import app.routes.events as events
    import app.services.notification_service as notification_service

    session = FakeSession()
    event = fake_event()
    participation = SimpleNamespace(event_id=event.event_id, user_id=uuid4(), to_dict=lambda: {"status": "interested"})

    monkeypatch.setattr(events.db, "session", session)
    monkeypatch.setattr(events.Event, "query", QueryResult(event), raising=False)
    monkeypatch.setattr(events.Participation, "query", QueryResult(None), raising=False)
    monkeypatch.setattr(events.User, "query", QueryResult(fake_user()), raising=False)
    monkeypatch.setattr(notification_service.NotificationService, "notify_new_participant", lambda *_args: None)
    monkeypatch.setattr(notification_service.NotificationService, "notify_user_joined_event", lambda *_args: None)

    join_response = client.post(f"/api/events/{event.event_id}/join", headers=auth_headers)
    assert join_response.status_code == 201
    assert join_response.json["success"] is True
    assert "participation" in join_response.json

    monkeypatch.setattr(events.Participation, "query", QueryResult(participation), raising=False)
    monkeypatch.setattr(notification_service.NotificationService, "notify_participant_left", lambda *_args: None)

    leave_response = client.delete(f"/api/events/{event.event_id}/leave", headers=auth_headers)
    assert leave_response.status_code == 200
    assert leave_response.json["success"] is True


def test_notifications_list_mark_read_and_unread(client, auth_headers, monkeypatch):
    import app.routes.notifications as notifications

    session = FakeSession()
    notification = fake_notification(uuid4())
    monkeypatch.setattr(notifications.db, "session", session)
    monkeypatch.setattr(notifications.Notification, "query", QueryResult([notification]), raising=False)

    list_response = client.get("/api/notifications/?per_page=5&unread_only=true", headers=auth_headers)
    assert list_response.status_code == 200
    assert list_response.json["success"] is True
    assert list_response.json["pagination"]["per_page"] == 5

    monkeypatch.setattr(notifications.Notification, "query", QueryResult(notification), raising=False)
    mark_read_response = client.put(f"/api/notifications/{notification.notification_id}/mark-read", headers=auth_headers)
    assert mark_read_response.status_code in (200, 403)

    notification.user_id = mark_read_response.json.get("notification", {}).get("user_id", notification.user_id)
    mark_unread_response = client.put(f"/api/notifications/{notification.notification_id}/mark-unread", headers=auth_headers)
    assert mark_unread_response.status_code in (200, 403)


def test_search_with_uuid_tag_filter(client, monkeypatch):
    import app.routes.search as search

    tag_id = uuid4()
    event = fake_event()
    monkeypatch.setattr(search.Event, "query", QueryResult([event]), raising=False)
    monkeypatch.setattr(search.User, "query", QueryResult([]), raising=False)
    monkeypatch.setattr(search.Tag, "query", QueryResult([]), raising=False)

    response = client.get(f"/api/search/?type=events&tag_ids={tag_id}")

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["tag_ids"] == [str(tag_id)]
    assert "events" in response.json["results"]
