"""
models/__init__.py - Database Models

Why: Defines all database tables and their relationships

Models/Classes:
- User: User accounts (user_id, name, email, password_hash, bio, preferences)
  Methods: to_dict()
  
- Event: Events (event_id, title, description, timestamp, location, city, state, posted_by)
  Methods: to_dict(), update_participant_count()
  
- Participation: User-Event join table (participation_id, event_id, user_id, status)
  Methods: to_dict()
  
- Notification: User notifications (notification_id, user_id, event_id, type, message)
  Methods: to_dict()
  
- Tag: Categorization tags (tag_id, name, description, color)
  Methods: to_dict()
  
- UserTag: User-Tag association (user_id, tag_id)
- EventTag: Event-Tag association (event_id, tag_id)
"""

from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    bio = db.Column(db.Text)
    profile_image_url = db.Column(db.String(500))
    preferences = db.Column(db.JSON)  # Store as JSON array
    role = db.Column(db.String(20), default='user')  # user, admin
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_events = db.relationship('Event', foreign_keys='Event.posted_by', backref='creator', lazy='dynamic')
    participations = db.relationship('Participation', backref='user', lazy='dynamic')
    
    # Add indexes on commonly queried fields
    __table_args__ = (
        db.Index('idx_user_email', 'email'),
        db.Index('idx_user_username', 'username'),
        db.Index('idx_user_active', 'is_active'),
        db.Index('idx_user_role', 'role'),
    )
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    def to_dict(self):
        return {
            'user_id': str(self.user_id),
            'name': self.name,
            'email': self.email,
            'username': self.username,
            'bio': self.bio,
            'profile_image_url': self.profile_image_url,
            'preferences': self.preferences or [],
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Event(db.Model):
    __tablename__ = 'events'
    
    event_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, nullable=False)
    place = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=False)  # Detailed location (city, state)
    city = db.Column(db.String(100), nullable=False, index=True)  # Added index for filtering
    state = db.Column(db.String(100), nullable=False, index=True)  # Added index for filtering
    is_paid = db.Column(db.Boolean, default=False)
    price = db.Column(db.Numeric(10, 2))
    source_type = db.Column(db.String(20), nullable=False)  # 'poster' or 'text'
    posted_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id'), nullable=False)
    max_participants = db.Column(db.Integer)
    current_participants = db.Column(db.Integer, default=0)  # Cache participant count for performance
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True, index=True)  # Added index for filtering
    
    # Relationships
    participations = db.relationship('Participation', backref='event', lazy='dynamic', cascade='all, delete-orphan')
    
    # Add composite indexes for better query performance
    __table_args__ = (
        db.UniqueConstraint('title', 'posted_by', name='unique_event_constraint'),
        db.Index('idx_event_city_state', 'city', 'state'),
        db.Index('idx_event_timestamp', 'timestamp'),
        db.Index('idx_event_active', 'is_active'),
        db.Index('idx_event_posted_by', 'posted_by'),
        db.Index('idx_event_is_paid', 'is_paid'),
    )
    
    def __repr__(self):
        return f'<Event {self.title}>'
    
    def update_participant_count(self):
        """Update the cached participant count for performance"""
        self.current_participants = self.participations.filter(
            Participation.status.in_(['going', 'interested'])
        ).count()
        db.session.commit()
    
    def to_dict(self):
        return {
            'event_id': str(self.event_id),
            'posted_by': str(self.posted_by),
            'creator_name': self.creator.name if self.creator else None,
            'title': self.title,
            'description': self.description,
            'timestamp': self.timestamp.isoformat(),
            'date': self.timestamp.date().isoformat(),  # Computed from timestamp
            'time': self.timestamp.time().isoformat(),  # Computed from timestamp
            'place': self.place,
            'location': self.location,
            'city': self.city,
            'state': self.state,
            'is_paid': self.is_paid,
            'price': float(self.price) if self.price else None,
            'source_type': self.source_type,
            'max_participants': self.max_participants,
            'current_participants': self.current_participants,  # Use cached count for performance
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Participation(db.Model):
    __tablename__ = 'participations'
    
    participation_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.event_id'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='interested')  # interested, going
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint to prevent duplicate participations
    __table_args__ = (
        db.UniqueConstraint('event_id', 'user_id', name='unique_event_user_participation'),
        db.Index('idx_participation_status', 'status'),
        db.Index('idx_participation_joined_at', 'joined_at'),
    )
    
    def __repr__(self):
        user_name = getattr(self.user, 'name', 'Unknown User') if hasattr(self, 'user') and self.user else 'Unknown User'
        event_title = getattr(self.event, 'title', 'Unknown Event') if hasattr(self, 'event') and self.event else 'Unknown Event'
        return f'<Participation {self.participation_id}: {user_name} -> {event_title} ({self.status})>'
    
    def to_dict(self):
        return {
            'participation_id': str(self.participation_id),
            'event_id': str(self.event_id),
            'user_id': str(self.user_id),
            'status': self.status,
            'joined_at': self.joined_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    notification_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id'), nullable=False)
    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.event_id'), nullable=True)  # Optional
    type = db.Column(db.String(50), nullable=False)  # 'event_reminder', 'event_update', 'new_participant', etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='notifications', lazy='select')
    event = db.relationship('Event', backref='notifications', lazy='select')
    
    # Add indexes for notification queries
    __table_args__ = (
        db.Index('idx_notification_user_id', 'user_id'),
        db.Index('idx_notification_is_read', 'is_read'),
        db.Index('idx_notification_type', 'type'),
        db.Index('idx_notification_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f'<Notification {self.notification_id}: {self.title}>'
    
    def to_dict(self):
        return {
            'notification_id': str(self.notification_id),
            'user_id': str(self.user_id),
            'event_id': str(self.event_id) if self.event_id else None,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Tag(db.Model):
    __tablename__ = 'tags'
    
    tag_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7))  # Hex color codes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Tag {self.name}>'
    
    def to_dict(self):
        return {
            'tag_id': str(self.tag_id),
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class UserTag(db.Model):
    __tablename__ = 'user_tags'
    
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.user_id'), primary_key=True)
    tag_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tags.tag_id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EventTag(db.Model):
    __tablename__ = 'event_tags'
    
    event_id = db.Column(UUID(as_uuid=True), db.ForeignKey('events.event_id'), primary_key=True)
    tag_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tags.tag_id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)