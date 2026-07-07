"""
event_service.py - Event Business Logic Service

Why: Provides complex event operations beyond simple CRUD

Methods/Functions (all static):
- create_event(): Create event with optional tags
- update_event(): Update event (checks authorization)
- delete_event(): Soft delete event (checks authorization)
- get_event_details(): Get event with tags, participants, creator
- search_events(): Advanced search with filters (query, city, tags, date, price)
- get_recommended_events(): Get events based on user's tag preferences
- join_event(): User joins event (validates max participants, creates notifications)
- leave_event(): User leaves event (creates notification)
- get_user_events(): Get events by type ('created' or 'joined')
- add_event_tags(): Associate tags with event
- remove_event_tags(): Remove tag associations
- get_events_by_tags(): Filter events by tag IDs
- get_popular_events(): Get events with most participants
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import and_, or_, func, desc
from app.models import Event, User, Participation, Notification, Tag, EventTag, UserTag
from app import db
import uuid

class EventService:
    
    @staticmethod
    def create_event(posted_by, title, description, timestamp, place, location, city, state, 
                    is_paid=False, price=None, source_type='text', max_participants=None, tag_ids=None):
        """Create a new event with optional tags"""
        try:
            # Create event
            event = Event(
                posted_by=posted_by,
                title=title,
                description=description,
                timestamp=timestamp,
                place=place,
                location=location,
                city=city,
                state=state,
                is_paid=is_paid,
                price=price,
                source_type=source_type,
                max_participants=max_participants
            )
            
            db.session.add(event)
            db.session.flush()  # Get event_id
            
            # Add tags if provided
            if tag_ids:
                for tag_id in tag_ids:
                    event_tag = EventTag(event_id=event.event_id, tag_id=tag_id)
                    db.session.add(event_tag)
            
            db.session.commit()
            return event
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating event: {str(e)}")
    
    @staticmethod
    def update_event(event_id, user_id, **kwargs):
        """Update an event (only by creator or admin)"""
        try:
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                raise Exception("Event not found")
            
            # Check if user is creator or admin
            user = User.query.get(user_id)
            if event.posted_by != user_id and user.role != 'admin':
                raise Exception("Unauthorized to update this event")
            
            # Update allowed fields
            allowed_fields = ['title', 'description', 'timestamp', 'place', 'location', 
                             'city', 'state', 'is_paid', 'price', 'max_participants']
            
            for field, value in kwargs.items():
                if field in allowed_fields and hasattr(event, field):
                    setattr(event, field, value)
            
            db.session.commit()
            return event
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating event: {str(e)}")
    
    @staticmethod
    def delete_event(event_id, user_id):
        """Soft delete an event (only by creator or admin)"""
        try:
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                raise Exception("Event not found")
            
            # Check if user is creator or admin
            user = User.query.get(user_id)
            if event.posted_by != user_id and user.role != 'admin':
                raise Exception("Unauthorized to delete this event")
            
            event.is_active = False
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting event: {str(e)}")
    
    @staticmethod
    def get_event_details(event_id):
        """Get detailed event information with tags and participants"""
        try:
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                return None
            
            # Get event tags
            event_tags = db.session.query(Tag).join(EventTag).filter(
                EventTag.event_id == event_id
            ).all()
            
            # Get participants
            participants = db.session.query(User, Participation).join(
                Participation, User.user_id == Participation.user_id
            ).filter(
                Participation.event_id == event_id,
                Participation.status.in_(['going', 'interested'])
            ).all()
            
            # Get creator details
            creator = User.query.get(event.posted_by)
            
            # Build participants list with creator first (if not already in participants)
            participants_list = []
            creator_already_in_list = False
            
            # Check if creator is already in participants list
            for user, participation in participants:
                if user.user_id == event.posted_by:
                    creator_already_in_list = True
                    break
            
            # Add creator as first participant if not already in list
            if creator and not creator_already_in_list:
                participants_list.append((creator, None))  # None for participation since they're the creator
            
            # Add other participants, with creator first if they're in the list
            for user, participation in participants:
                if user.user_id == event.posted_by:
                    # Insert creator at the beginning
                    participants_list.insert(0, (user, participation))
                else:
                    participants_list.append((user, participation))
            
            return {
                'event': event,
                'tags': event_tags,
                'participants': participants_list,
                'creator': creator,
                'participant_count': len(participants_list)
            }
            
        except Exception as e:
            raise Exception(f"Error getting event details: {str(e)}")
    
    @staticmethod
    def search_events(query=None, city=None, state=None, tag_ids=None, is_paid=None, 
                     date_from=None, date_to=None, limit=20, offset=0):
        """Search events with various filters"""
        try:
            # Base query
            events_query = Event.query.filter(Event.is_active == True)
            
            # Text search in title and description
            if query:
                events_query = events_query.filter(
                    or_(
                        Event.title.ilike(f'%{query}%'),
                        Event.description.ilike(f'%{query}%'),
                        Event.place.ilike(f'%{query}%')
                    )
                )
            
            # Location filters
            if city:
                events_query = events_query.filter(Event.city.ilike(f'%{city}%'))
            if state:
                events_query = events_query.filter(Event.state.ilike(f'%{state}%'))
            
            # Payment filter
            if is_paid is not None:
                events_query = events_query.filter(Event.is_paid == is_paid)
            
            # Date range filter
            if date_from:
                events_query = events_query.filter(Event.timestamp >= date_from)
            if date_to:
                events_query = events_query.filter(Event.timestamp <= date_to)
            
            # Tag filter
            if tag_ids:
                events_query = events_query.join(EventTag).filter(
                    EventTag.tag_id.in_(tag_ids)
                )
            
            # Order by timestamp (upcoming first)
            events_query = events_query.filter(
                Event.timestamp >= datetime.now()
            ).order_by(Event.timestamp.asc())
            
            # Pagination
            events = events_query.offset(offset).limit(limit).all()
            total_count = events_query.count()
            
            return {
                'events': events,
                'total_count': total_count,
                'has_more': (offset + limit) < total_count
            }
            
        except Exception as e:
            raise Exception(f"Error searching events: {str(e)}")
    
    @staticmethod
    def get_recommended_events(user_id, limit=10):
        """Get recommended events based on user's tags and location"""
        try:
            user = User.query.get(user_id)
            if not user:
                return []
            
            # Get user's tags
            user_tag_ids = db.session.query(UserTag.tag_id).filter(
                UserTag.user_id == user_id
            ).subquery()
            
            # Find events with matching tags
            recommended_events = db.session.query(
                Event, 
                func.count(EventTag.tag_id).label('matching_tags')
            ).join(
                EventTag, Event.event_id == EventTag.event_id
            ).filter(
                Event.is_active == True,
                Event.timestamp >= datetime.now(),
                Event.posted_by != user_id,  # Don't recommend own events
                EventTag.tag_id.in_(user_tag_ids)
            ).group_by(Event.event_id).order_by(
                desc('matching_tags'),
                Event.timestamp.asc()
            ).limit(limit).all()
            
            return [event for event, _ in recommended_events]
            
        except Exception as e:
            raise Exception(f"Error getting recommended events: {str(e)}")
    
    @staticmethod
    def join_event(event_id, user_id):
        """Join an event"""
        try:
            # Check if event exists and is active
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                raise Exception("Event not found")
            
            # Check if event is in the future
            if event.timestamp <= datetime.now():
                raise Exception("Cannot join past events")
            
            # Check if user is already joined
            existing_participation = Participation.query.filter_by(
                event_id=event_id, user_id=user_id
            ).first()
            
            if existing_participation:
                if existing_participation.status == 'confirmed':
                    raise Exception("Already joined this event")
                elif existing_participation.status == 'pending':
                    raise Exception("Join request already pending")
                else:  # cancelled or rejected
                    # Reactivate participation
                    existing_participation.status = 'confirmed'
                    existing_participation.joined_at = datetime.now()
            else:
                # Create new participation
                participation = Participation(
                    event_id=event_id,
                    user_id=user_id,
                    status='confirmed'
                )
                db.session.add(participation)
            
            # Check max participants limit
            if event.max_participants:
                current_participants = Participation.query.filter_by(
                    event_id=event_id, status='confirmed'
                ).count()
                if current_participants >= event.max_participants:
                    raise Exception("Event is full")
            
            # Create notification for event creator
            notification = Notification(
                user_id=event.posted_by,
                type='event_join',
                title='New participant joined',
                message=f'Someone joined your event: {event.title}',
                data={'event_id': event_id, 'participant_id': user_id}
            )
            db.session.add(notification)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error joining event: {str(e)}")
    
    @staticmethod
    def leave_event(event_id, user_id):
        """Leave an event"""
        try:
            participation = Participation.query.filter_by(
                event_id=event_id, user_id=user_id, status='confirmed'
            ).first()
            
            if not participation:
                raise Exception("You haven't joined this event")
            
            participation.status = 'cancelled'
            
            # Create notification for event creator
            event = Event.query.get(event_id)
            notification = Notification(
                user_id=event.posted_by,
                type='event_leave',
                title='Participant left',
                message=f'Someone left your event: {event.title}',
                data={'event_id': event_id, 'participant_id': user_id}
            )
            db.session.add(notification)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error leaving event: {str(e)}")
    
    @staticmethod
    def get_user_events(user_id, event_type='created', limit=20, offset=0):
        """Get events created by or joined by user"""
        try:
            if event_type == 'created':
                # Events created by user
                events = Event.query.filter_by(
                    posted_by=user_id, is_active=True
                ).order_by(Event.created_at.desc()).offset(offset).limit(limit).all()
                
            elif event_type == 'joined':
                # Events joined by user
                events = db.session.query(Event).join(Participation).filter(
                    Participation.user_id == user_id,
                    Participation.status == 'confirmed',
                    Event.is_active == True
                ).order_by(Event.timestamp.asc()).offset(offset).limit(limit).all()
                
            else:
                raise Exception("Invalid event_type. Use 'created' or 'joined'")
            
            return events
            
        except Exception as e:
            raise Exception(f"Error getting user events: {str(e)}")
    
    @staticmethod
    def add_event_tags(event_id, tag_ids, user_id):
        """Add tags to an event"""
        try:
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                raise Exception("Event not found")
            
            # Check if user is creator or admin
            user = User.query.get(user_id)
            if event.posted_by != user_id and user.role != 'admin':
                raise Exception("Unauthorized to modify event tags")
            
            for tag_id in tag_ids:
                # Check if tag exists
                tag = Tag.query.get(tag_id)
                if not tag:
                    continue
                
                # Check if tag is already associated
                existing = EventTag.query.filter_by(
                    event_id=event_id, tag_id=tag_id
                ).first()
                
                if not existing:
                    event_tag = EventTag(event_id=event_id, tag_id=tag_id)
                    db.session.add(event_tag)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error adding event tags: {str(e)}")
    
    @staticmethod
    def remove_event_tags(event_id, tag_ids, user_id):
        """Remove tags from an event"""
        try:
            event = Event.query.filter_by(event_id=event_id, is_active=True).first()
            if not event:
                raise Exception("Event not found")
            
            # Check if user is creator or admin
            user = User.query.get(user_id)
            if event.posted_by != user_id and user.role != 'admin':
                raise Exception("Unauthorized to modify event tags")
            
            EventTag.query.filter(
                EventTag.event_id == event_id,
                EventTag.tag_id.in_(tag_ids)
            ).delete(synchronize_session=False)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error removing event tags: {str(e)}")
    
    @staticmethod
    def get_events_by_tags(tag_ids, limit=20, offset=0):
        """Get events filtered by specific tags"""
        try:
            events = db.session.query(Event).join(EventTag).filter(
                EventTag.tag_id.in_(tag_ids),
                Event.is_active == True,
                Event.timestamp >= datetime.now()
            ).distinct().order_by(Event.timestamp.asc()).offset(offset).limit(limit).all()
            
            return events
            
        except Exception as e:
            raise Exception(f"Error getting events by tags: {str(e)}")
    
    @staticmethod
    def get_popular_events(limit=10, days=7):
        """Get popular events based on participation count"""
        try:
            # Get events with most participants in the last N days
            cutoff_date = datetime.now() - timedelta(days=days)
            
            popular_events = db.session.query(
                Event,
                func.count(Participation.user_id).label('participant_count')
            ).join(
                Participation, Event.event_id == Participation.event_id
            ).filter(
                Event.is_active == True,
                Event.timestamp >= datetime.now(),
                Participation.status == 'confirmed',
                Event.created_at >= cutoff_date
            ).group_by(Event.event_id).order_by(
                desc('participant_count'),
                Event.timestamp.asc()
            ).limit(limit).all()
            
            return [event for event, _ in popular_events]
            
        except Exception as e:
            raise Exception(f"Error getting popular events: {str(e)}")
