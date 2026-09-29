"""
Database models.

database/init.sql is the authoritative schema. These models mirror it, including
table, constraint and index names; the test suite builds its database from them
with db.create_all(). tests/test_schema.py fails if a name declared here is
missing from init.sql.

Tables:
- users            Accounts (bcrypt password hash, role, token_version)
- events           Events; the organiser is also stored as a participant
- participations   User <-> event membership with status 'interested' or 'going'
- notifications    In-app notifications
- tags             Categories used for events and user interests
- user_tags        User interests (user <-> tag)
- event_tags       Event categories (event <-> tag)
- revoked_tokens   JWT ids revoked at logout, kept until they expire
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DDL, event, func
from sqlalchemy.dialects.postgresql import UUID

from app import db

PARTICIPATION_STATUSES = ('interested', 'going')
USER_ROLES = ('user', 'admin')
NOTIFICATION_TYPES = (
    'welcome',
    'event_joined',
    'event_reminder',
    'event_update',
    'new_participant',
    'participant_left',
    'event_cancelled',
)


def utc_now():
    return datetime.now(timezone.utc)


def utc_iso(value):
    """Serialize a datetime as ISO 8601 in UTC with a 'Z' suffix (naive values are UTC)."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def _in_list(column, values):
    quoted = ', '.join(f"'{value}'" for value in values)
    return f'{column} IN ({quoted})'


def _trigram_index(name, column):
    """GIN trigram index that serves ILIKE '%term%' searches (PostgreSQL only)."""
    return db.Index(
        name, column,
        postgresql_using='gin',
        postgresql_ops={column: 'gin_trgm_ops'},
    ).ddl_if(dialect='postgresql')


# The trigram indexes need pg_trgm; init.sql creates it too.
event.listen(
    db.metadata, 'before_create',
    DDL('CREATE EXTENSION IF NOT EXISTS pg_trgm').execute_if(dialect='postgresql'),
)


user_tags = db.Table(
    'user_tags',
    db.Column('user_id', UUID(as_uuid=True), db.ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True),
    db.Column('tag_id', UUID(as_uuid=True), db.ForeignKey('tags.tag_id', ondelete='CASCADE'), primary_key=True),
    db.Column('created_at', db.DateTime(timezone=True), nullable=False, default=utc_now),
    db.Index('idx_user_tags_tag_id', 'tag_id'),
)

event_tags = db.Table(
    'event_tags',
    db.Column('event_id', UUID(as_uuid=True), db.ForeignKey('events.event_id', ondelete='CASCADE'), primary_key=True),
    db.Column('tag_id', UUID(as_uuid=True), db.ForeignKey('tags.tag_id', ondelete='CASCADE'), primary_key=True),
    db.Column('created_at', db.DateTime(timezone=True), nullable=False, default=utc_now),
    db.Index('idx_event_tags_tag_id', 'tag_id'),
)


class Tag(db.Model):
    __tablename__ = 'tags'

    tag_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7))  # '#RRGGBB'
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    def __repr__(self):
        return f'<Tag {self.name}>'

    def to_dict(self):
        return {
            'tag_id': str(self.tag_id),
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'created_at': utc_iso(self.created_at),
            'updated_at': utc_iso(self.updated_at),
        }


class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False)  # always stored in lower case
    username = db.Column(db.String(100), nullable=False)  # unique ignoring case
    password_hash = db.Column(db.Text, nullable=False)
    bio = db.Column(db.Text)
    profile_image_url = db.Column(db.String(500))
    role = db.Column(db.String(20), nullable=False, default='user')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    # Incremented to invalidate every token issued before (e.g. on password change)
    token_version = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    interests = db.relationship('Tag', secondary=user_tags, order_by=Tag.name, passive_deletes=True)

    __table_args__ = (
        db.UniqueConstraint('email', name='users_email_key'),
        db.CheckConstraint('email = lower(email)', name='ck_users_email_lowercase'),
        db.CheckConstraint(_in_list('role', USER_ROLES), name='ck_users_role'),
        _trigram_index('idx_users_name_trgm', 'name'),
        _trigram_index('idx_users_username_trgm', 'username'),
        _trigram_index('idx_users_bio_trgm', 'bio'),
    )

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self, include_email=True):
        data = {
            'user_id': str(self.user_id),
            'name': self.name,
            'username': self.username,
            'bio': self.bio,
            'profile_image_url': self.profile_image_url,
            'interests': [tag.to_dict() for tag in self.interests],
            'role': self.role,
            'created_at': utc_iso(self.created_at),
            'updated_at': utc_iso(self.updated_at),
        }
        if include_email:
            data['email'] = self.email
        return data

    def to_public_dict(self):
        """Profile as seen by other users (no email address)."""
        return self.to_dict(include_email=False)


db.Index('uq_users_username_lower', func.lower(User.username), unique=True)


class Event(db.Model):
    __tablename__ = 'events'

    event_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime(timezone=True), nullable=False)
    place = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    is_paid = db.Column(db.Boolean, nullable=False, default=False)
    price = db.Column(db.Numeric(10, 2))  # set only for paid events
    posted_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    max_participants = db.Column(db.Integer)
    # Cached COUNT of participations, maintained by the join/leave routes
    current_participants = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    creator = db.relationship('User')
    tags = db.relationship('Tag', secondary=event_tags, order_by=Tag.name, passive_deletes=True)
    participations = db.relationship(
        'Participation', back_populates='event', lazy='dynamic',
        cascade='all, delete-orphan', passive_deletes=True,
    )

    __table_args__ = (
        db.UniqueConstraint('posted_by', 'title', 'timestamp', name='uq_events_owner_title_timestamp'),
        db.CheckConstraint(
            '(is_paid AND price > 0) OR (NOT is_paid AND price IS NULL)', name='ck_events_price',
        ),
        db.CheckConstraint(
            'max_participants IS NULL OR max_participants > 0', name='ck_events_max_participants_positive',
        ),
        db.CheckConstraint('current_participants >= 0', name='ck_events_current_participants_non_negative'),
        db.Index('idx_events_posted_by', 'posted_by'),
        db.Index('idx_events_timestamp', 'timestamp'),
        _trigram_index('idx_events_title_trgm', 'title'),
        _trigram_index('idx_events_description_trgm', 'description'),
        _trigram_index('idx_events_place_trgm', 'place'),
        _trigram_index('idx_events_location_trgm', 'location'),
        _trigram_index('idx_events_city_trgm', 'city'),
        _trigram_index('idx_events_state_trgm', 'state'),
    )

    def __repr__(self):
        return f'<Event {self.title}>'

    def refresh_participant_count(self):
        """Recount participations into the cached column (flushes, never commits)."""
        db.session.flush()
        self.current_participants = db.session.query(func.count(Participation.participation_id)).filter(
            Participation.event_id == self.event_id
        ).scalar()

    def to_dict(self):
        return {
            'event_id': str(self.event_id),
            'posted_by': str(self.posted_by),
            'creator_name': self.creator.name if self.creator else None,
            'title': self.title,
            'description': self.description,
            'timestamp': utc_iso(self.timestamp),
            'place': self.place,
            'location': self.location,
            'city': self.city,
            'state': self.state,
            'is_paid': self.is_paid,
            'price': float(self.price) if self.price is not None else None,
            'max_participants': self.max_participants,
            'current_participants': self.current_participants,
            'tags': [tag.to_dict() for tag in self.tags],
            'created_at': utc_iso(self.created_at),
            'updated_at': utc_iso(self.updated_at),
        }


class Participation(db.Model):
    __tablename__ = 'participations'

    participation_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.event_id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='interested')
    joined_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    event = db.relationship('Event', back_populates='participations')
    user = db.relationship('User')

    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='uq_participations_event_user'),
        db.CheckConstraint(_in_list('status', PARTICIPATION_STATUSES), name='ck_participations_status'),
        db.Index('idx_participations_user_id', 'user_id'),
    )

    def __repr__(self):
        return f'<Participation {self.user_id} -> {self.event_id} ({self.status})>'

    def to_dict(self):
        return {
            'participation_id': str(self.participation_id),
            'event_id': str(self.event_id),
            'user_id': str(self.user_id),
            'status': self.status,
            'joined_at': utc_iso(self.joined_at),
            'created_at': utc_iso(self.created_at),
            'updated_at': utc_iso(self.updated_at),
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    notification_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    # Set to NULL when the event is deleted, so the user keeps the notification
    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.event_id', ondelete='SET NULL'))
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        db.CheckConstraint(_in_list('type', NOTIFICATION_TYPES), name='ck_notifications_type'),
        db.Index('idx_notifications_event_id', 'event_id'),
    )

    def __repr__(self):
        return f'<Notification {self.type} for {self.user_id}>'

    def to_dict(self):
        return {
            'notification_id': str(self.notification_id),
            'user_id': str(self.user_id),
            'event_id': str(self.event_id) if self.event_id else None,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': utc_iso(self.created_at),
            'updated_at': utc_iso(self.updated_at),
        }


# Newest-first listing of a user's notifications
db.Index('idx_notifications_user_created', Notification.user_id, Notification.created_at.desc())
# Unread badge count
db.Index(
    'idx_notifications_user_unread', Notification.user_id,
    postgresql_where=Notification.is_read.is_(False),
    sqlite_where=Notification.is_read.is_(False),
)
db.Index('uq_tags_name_lower', func.lower(Tag.name), unique=True)


class RevokedToken(db.Model):
    """A JWT revoked at logout. The row is only needed until the token expires."""
    __tablename__ = 'revoked_tokens'

    jti = db.Column(db.String(36), primary_key=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    __table_args__ = (
        db.Index('idx_revoked_tokens_expires_at', 'expires_at'),
    )
