"""
Shared fixtures. Each test gets a fresh in-memory SQLite database built from the models.
"""

import itertools
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# Never start the background scheduler from a developer's local .env during tests
os.environ['ENABLE_TASK_SCHEDULER'] = 'false'

from flask_jwt_extended import create_access_token, create_refresh_token  # noqa: E402

from app import bcrypt, create_app, db  # noqa: E402
from app.models import Event, Participation, Tag, User  # noqa: E402

PASSWORD = 'Str0ng!Pass'


@event.listens_for(Engine, 'connect')
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    """SQLite ignores foreign keys unless enabled; this makes ON DELETE rules behave as in PostgreSQL."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()


@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(app):
    counter = itertools.count(1)
    password_hash = bcrypt.generate_password_hash(PASSWORD).decode('utf-8')

    def factory(name='Test User', role='user', **fields):
        n = next(counter)
        fields.setdefault('email', f'user{n}@example.com')
        fields.setdefault('username', f'user{n}')
        user = User(name=name, role=role, password_hash=password_hash, **fields)
        db.session.add(user)
        db.session.commit()
        return user

    return factory


@pytest.fixture
def owner(make_user):
    return make_user('Owner Person', username='owner', email='owner@example.com')


@pytest.fixture
def member(make_user):
    return make_user('Member Person', username='member', email='member@example.com')


@pytest.fixture
def admin(make_user):
    return make_user('Admin Person', role='admin', username='admin_user', email='admin@example.com')


@pytest.fixture
def init_database(make_user):
    """A single user test@example.com / testuser with password 'Strong@123'."""
    user = make_user(email='test@example.com', username='testuser')
    user.password_hash = bcrypt.generate_password_hash('Strong@123').decode('utf-8')
    db.session.commit()
    return {'user1': user}


def auth(user):
    """Authorization header for a user (same claims as the login endpoint issues)."""
    token = create_access_token(identity=str(user.user_id), additional_claims={'ver': user.token_version})
    return {'Authorization': f'Bearer {token}'}


def refresh_auth(user):
    token = create_refresh_token(identity=str(user.user_id), additional_claims={'ver': user.token_version})
    return {'Authorization': f'Bearer {token}'}


def future(hours=72):
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def make_event(organiser, title='Tech Meetup', hours_ahead=72, tags=(), **fields):
    """Create an event the way the API does: the organiser is its first participant."""
    for field, default in (('place', 'Hall'), ('location', '12 Main Street'), ('city', 'Chennai'), ('state', 'Tamil Nadu')):
        fields.setdefault(field, default)
    event = Event(
        title=title, timestamp=future(hours_ahead), posted_by=organiser.user_id,
        tags=list(tags), current_participants=1, **fields,
    )
    db.session.add(event)
    db.session.flush()
    db.session.add(Participation(event_id=event.event_id, user_id=organiser.user_id, status='going'))
    db.session.commit()
    return event


def join(event, user, status='interested'):
    db.session.add(Participation(event_id=event.event_id, user_id=user.user_id, status=status))
    event.refresh_participant_count()
    db.session.commit()


def make_tag(name, **fields):
    tag = Tag(name=name, **fields)
    db.session.add(tag)
    db.session.commit()
    return tag


def event_payload(**overrides):
    payload = {
        'title': 'Tech Meetup',
        'description': 'Talks and networking',
        'timestamp': future().isoformat(),
        'place': 'Community Hall',
        'location': '12 Main Street',
        'city': 'Chennai',
        'state': 'Tamil Nadu',
        'is_paid': False,
    }
    payload.update(overrides)
    return payload
