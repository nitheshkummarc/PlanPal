"""
events.py - Event Management Routes

Why: Handles all event CRUD operations and user participation

Routes/Functions:
- get_events(): GET /api/events/ - List all events with filters
- create_event(): POST /api/events/ - Create new event (JWT required)
- get_event_details(): GET /api/events/<id> - Get event with participants
- update_event(): PUT /api/events/<id> - Update event (creator only, JWT required)
- join_event(): POST /api/events/<id>/join - Join event (JWT required)
- leave_event(): DELETE /api/events/<id>/leave - Leave event (JWT required)
- update_participation_status(): PUT /api/events/<id>/update-status - Update status (JWT required)
- get_my_events(): GET /api/events/my - Get user's created events (JWT required)
- get_joined_events(): GET /api/events/joined - Get events user joined (JWT required)
- get_my_events_legacy(): GET /api/events/my-events - Both created & joined (JWT required)
- get_participation_status(): GET /api/events/<id>/participation_status - Check if joined (JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Event, User, Participation, Tag, EventTag
from app.services.notification_service import NotificationService
from app.utils.validators import validate_uuid, validate_event_title, validate_event_timestamp, validate_price, validate_max_participants
from app.utils.responses import error_response
from datetime import datetime, timezone
import os
import uuid

events_bp = Blueprint('events', __name__)

def _validate_tag_ids(tag_ids):
    """Validate tag IDs and return the matching Tag rows."""
    if tag_ids is None:
        return []
    if not isinstance(tag_ids, list):
        raise ValueError('tag_ids must be an array')

    normalized_ids = []
    for tag_id in tag_ids:
        tag_id = str(tag_id)
        if not validate_uuid(tag_id):
            raise ValueError('Each tag_id must be a valid UUID')
        normalized_ids.append(uuid.UUID(tag_id))

    if not normalized_ids:
        return []

    tags = Tag.query.filter(Tag.tag_id.in_(normalized_ids)).all()
    if len(tags) != len(set(normalized_ids)):
        raise ValueError('One or more tags were not found')
    return tags

def _replace_event_tags(event_id, tag_ids):
    """Replace all tag associations for an event."""
    tags = _validate_tag_ids(tag_ids)
    EventTag.query.filter_by(event_id=event_id).delete()
    for tag in tags:
        db.session.add(EventTag(event_id=event_id, tag_id=tag.tag_id))
    return tags

def _get_event_tags(event_id):
    return db.session.query(Tag).join(EventTag).filter(
        EventTag.event_id == event_id
    ).order_by(Tag.name.asc()).all()

@events_bp.route('/', methods=['GET'])
def get_events():
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        city = request.args.get('city')
        state = request.args.get('state')
        location = request.args.get('location')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = Event.query.filter_by(is_active=True)
        
        if city:
            query = query.filter(Event.city.ilike(f'%{city}%'))
        if state:
            query = query.filter(Event.state.ilike(f'%{state}%'))
        if location:
            query = query.filter(Event.location.ilike(f'%{location}%'))
        if date_from:
            query = query.filter(Event.timestamp >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(Event.timestamp <= datetime.fromisoformat(date_to))
        
        # Order by timestamp
        query = query.order_by(Event.timestamp.asc())
        
        # Count total
        total = query.count()
        
        # Get events for this page
        events_list = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'events': [event.to_dict() for event in events_list],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return error_response('Failed to fetch events', exc=e)

@events_bp.route('/', methods=['POST'])
@jwt_required()
def create_event():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'timestamp', 'place', 'location', 'city', 'state']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Validate title
        valid, err = validate_event_title(data.get('title'))
        if not valid:
            return jsonify({'error': err}), 400

        # Validate timestamp (must be future)
        valid, err = validate_event_timestamp(data.get('timestamp'))
        if not valid:
            return jsonify({'error': err}), 400

        # Validate price
        valid, err = validate_price(data.get('price'))
        if not valid:
            return jsonify({'error': err}), 400

        # Validate max_participants
        valid, err = validate_max_participants(data.get('max_participants'))
        if not valid:
            return jsonify({'error': err}), 400

        # Backward-compatible source type handling
        source_type = (data.get('source_type') or 'text').strip().lower()
        if source_type != 'text':
            return jsonify({'error': "Invalid source_type. Allowed value: 'text'"}), 400
        
        # Parse timestamp
        try:
            event_timestamp = datetime.fromisoformat(data['timestamp'])
        except ValueError:
            return jsonify({'error': 'Invalid timestamp format. Use ISO format.'}), 400
        
        # Create event with new schema
        event = Event(
            posted_by=uuid.UUID(current_user_id),
            title=data['title'],
            description=data.get('description'),
            timestamp=event_timestamp,
            place=data['place'],
            location=data['location'],
            city=data['city'],
            state=data['state'],
            is_paid=data.get('is_paid', False),
            price=data.get('price'),
            source_type=source_type,
            max_participants=data.get('max_participants')
        )
        
        try:
            tags = _validate_tag_ids(data.get('tag_ids', []))
        except ValueError as error:
            return jsonify({'error': str(error)}), 400

        db.session.add(event)
        db.session.flush()

        for tag in tags:
            db.session.add(EventTag(event_id=event.event_id, tag_id=tag.tag_id))
        
        # Auto-join creator to the event
        participation = Participation(
            event_id=event.event_id,
            user_id=uuid.UUID(current_user_id),
            status='going'
        )
        db.session.add(participation)
        
        # Include the creator without calling update_participant_count(), which commits internally.
        event.current_participants = 1

        db.session.commit()

        event_data = event.to_dict()
        event_data['tags'] = [tag.to_dict() for tag in tags]
        
        return jsonify({
            'message': 'Event created successfully',
            'event': event_data
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to create event', exc=e)

@events_bp.route('/<event_id>', methods=['GET'])
def get_event_details(event_id):
    try:
        if not validate_uuid(event_id):
            return jsonify({'error': 'Invalid event ID format'}), 400
        
        event = db.session.get(Event, event_id)
        if not event or not event.is_active:
            return jsonify({'error': 'Event not found'}), 404
        
        # Get participants
        participants = db.session.query(Participation, User).join(User).filter(
            Participation.event_id == event_id,
            Participation.status.in_(['going', 'interested'])
        ).all()
        
        # Get the event creator/organizer
        creator = db.session.query(User).filter(User.user_id == event.posted_by).first()
        
        event_data = event.to_dict()
        event_data['tags'] = [tag.to_dict() for tag in _get_event_tags(event_id)]
        
        # Build participants list with creator first (if not already in participants)
        participants_list = []
        creator_already_in_list = False
        
        # Check if creator is already in participants list
        for participation, user in participants:
            if user.user_id == event.posted_by:
                creator_already_in_list = True
                break
        
        # Add creator as first participant if not already in list
        if creator and not creator_already_in_list:
            participants_list.append({
                'user_id': str(creator.user_id),
                'name': creator.name,
                'profile_image_url': getattr(creator, 'profile_image_url', None),
                'status': 'going'
            })
        
        # Add other participants, with creator first if they're in the list
        for participation, user in participants:
            participant_data = {
                'user_id': str(user.user_id),
                'name': user.name,
                'profile_image_url': getattr(user, 'profile_image_url', None),
                'status': participation.status
            }
            
            if user.user_id == event.posted_by:
                # Insert creator at the beginning
                participants_list.insert(0, participant_data)
            else:
                participants_list.append(participant_data)
        
        event_data['participants'] = participants_list
        
        return jsonify({
            'event': event_data
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch event details', exc=e)

@events_bp.route('/<event_id>/join', methods=['POST'])
@jwt_required()
def join_event(event_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event or not event.is_active:
            return jsonify({'error': 'Event not found'}), 404
        
        # Check if already joined
        existing_participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=current_user_id
        ).first()
        
        if existing_participation:
            return jsonify({'error': 'Already joined this event'}), 400
        
        # Check if event has max participants limit
        if event.max_participants and event.current_participants >= event.max_participants:
            return jsonify({'error': 'Event is full'}), 400
        
        # Create participation
        participation = Participation(
            event_id=event_id,
            user_id=current_user_id,
            status='interested'
        )
        
        db.session.add(participation)
        
        # Update event participant count
        event.update_participant_count()
        
        # Get user info for notifications
        user = db.session.get(User, current_user_id)
        
        # Create notification for event creator
        NotificationService.notify_new_participant(event, participation)
        
        # Create notification for the user who joined
        NotificationService.notify_user_joined_event(event, user)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully joined event',
            'participation': participation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to join event', exc=e)

@events_bp.route('/<event_id>/leave', methods=['DELETE'])
@jwt_required()
def leave_event(event_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Find participation
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=current_user_id
        ).first()
        
        if not participation:
            return jsonify({'error': 'Not joined to this event'}), 404
        
        # Check if user is the event creator
        event = db.session.get(Event, event_id)
        if str(event.posted_by) == current_user_id:
            return jsonify({'error': 'Event creator cannot leave the event'}), 400
        
        # Delete participation
        db.session.delete(participation)
        
        # Update event participant count
        event.update_participant_count()
        
        # Create notification for event creator
        NotificationService.notify_participant_left(event, participation)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully left event'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to leave event', exc=e)

@events_bp.route('/<event_id>', methods=['PUT'])
@jwt_required()
def update_event(event_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event or not event.is_active:
            return jsonify({'error': 'Event not found'}), 404
        
        # Check if user owns this event
        if str(event.posted_by) != current_user_id:
            return jsonify({'error': 'You can only edit your own events'}), 403
        
        # Update event fields
        if 'title' in data:
            event.title = data['title']
        if 'description' in data:
            event.description = data['description']
        if 'timestamp' in data:
            try:
                event.timestamp = datetime.fromisoformat(data['timestamp'])
            except ValueError:
                return jsonify({'error': 'Invalid timestamp format'}), 400
        if 'place' in data:
            event.place = data['place']
        if 'location' in data:
            event.location = data['location']
        if 'city' in data:
            event.city = data['city']
        if 'state' in data:
            event.state = data['state']
        if 'max_participants' in data:
            event.max_participants = data['max_participants']
        if 'is_paid' in data:
            event.is_paid = data['is_paid']
        if 'price' in data:
            event.price = data['price']
        if 'source_type' in data:
            source_type = (data.get('source_type') or 'text').strip().lower()
            if source_type != 'text':
                return jsonify({'error': "Invalid source_type. Allowed value: 'text'"}), 400
            event.source_type = source_type
        if 'tag_ids' in data:
            try:
                _replace_event_tags(event.event_id, data.get('tag_ids') or [])
            except ValueError as error:
                return jsonify({'error': str(error)}), 400
        
        event.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        # Notify all participants about event update
        NotificationService.notify_event_update(event)

        event_data = event.to_dict()
        event_data['tags'] = [tag.to_dict() for tag in _get_event_tags(event.event_id)]
        
        return jsonify({
            'message': 'Event updated successfully',
            'event': event_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update event', exc=e)

@events_bp.route('/<event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    try:
        current_user_id = get_jwt_identity()

        event = db.session.get(Event, event_id)
        if not event or not event.is_active:
            return jsonify({'error': 'Event not found'}), 404

        current_user = db.session.get(User, current_user_id)
        if str(event.posted_by) != current_user_id and (not current_user or current_user.role != 'admin'):
            return jsonify({'error': 'You can only delete your own events'}), 403

        db.session.delete(event)
        db.session.commit()

        return jsonify({
            'message': 'Event deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to delete event', exc=e)

@events_bp.route('/<event_id>/update-status', methods=['PUT'])
@jwt_required()
def update_participation_status(event_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        # Validate status
        valid_statuses = ['interested', 'going']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        
        # Find participation
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=current_user_id
        ).first()
        
        if not participation:
            return jsonify({'error': 'Not joined to this event'}), 404
        
        # Update status
        participation.status = data['status']
        
        # Update event participant count if status changed
        event = participation.event
        event.update_participant_count()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Participation status updated successfully',
            'participation': participation.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update participation status', exc=e)

@events_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_events():
    try:
        current_user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get events created by user
        query = Event.query.filter_by(
            posted_by=current_user_id,
            is_active=True
        ).order_by(Event.timestamp.desc())
        
        # Count total
        total = query.count()
        
        # Get events for this page
        events_list = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'events': [event.to_dict() for event in events_list],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch your events', exc=e)

@events_bp.route('/joined', methods=['GET'])
@jwt_required()
def get_joined_events():
    try:
        current_user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get events user is participating in
        query = db.session.query(Event).join(Participation).filter(
            Participation.user_id == current_user_id,
            Event.is_active == True,
            Participation.status.in_(['going', 'interested'])
        ).order_by(Event.timestamp.desc())
        
        # Count total
        total = query.count()
        
        # Get events for this page
        events_list = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            'events': [event.to_dict() for event in events_list],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch joined events', exc=e)


@events_bp.route('/<event_id>/participation_status', methods=['GET'])
@jwt_required()
def get_participation_status(event_id):
    """Check user's participation status for an event"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event or not event.is_active:
            return jsonify({'error': 'Event not found'}), 404
        
        # Check participation status
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=current_user_id
        ).first()
        
        status = 'not_joined'
        if participation:
            status = participation.status
        
        return jsonify({
            'status': status,
            'is_creator': str(event.posted_by) == current_user_id
        }), 200
        
    except Exception as e:
        return error_response('Failed to check participation status', exc=e)
