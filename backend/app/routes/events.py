"""
events.py - Event Management Routes

Why: Handles all event CRUD operations and user participation

Routes/Functions:
- get_events(): GET /api/events/ - List upcoming events with filters
- create_event(): POST /api/events/ - Create new event (JWT required)
- get_event_details(): GET /api/events/<id> - Get event with tags and participants
- update_event(): PUT /api/events/<id> - Update event (creator only, JWT required)
- delete_event(): DELETE /api/events/<id> - Delete event (creator or admin, JWT required)
- join_event(): POST /api/events/<id>/join - Join event (JWT required)
- leave_event(): DELETE /api/events/<id>/leave - Leave event (JWT required)
- update_participation_status(): PUT /api/events/<id>/update-status - interested/going (JWT required)
- get_my_events(): GET /api/events/my - Events the user created, past and upcoming (JWT required)
- get_joined_events(): GET /api/events/joined - Events the user joined, past and upcoming (JWT required)
- get_participation_status(): GET /api/events/<id>/participation_status - Check if joined (JWT required)

Past events: the scheduler marks events inactive after they end, but past events
stay viewable (detail, calendar, search, "my"/"joined" lists). Only the Discover
list (GET /) is limited to upcoming events, and it filters by timestamp so it is
correct whether or not the scheduler is running.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from app import db
from app.models import Event, User, Participation, Tag, EventTag
from app.services.notification_service import NotificationService
from app.utils.validators import (
    get_json_body, like_pattern, validate_uuid, validate_event_title,
    validate_event_timestamp, validate_price, validate_max_participants,
)
from app.utils.responses import error_response
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError
import uuid

events_bp = Blueprint('events', __name__)

MAX_PER_PAGE = 100

def _parse_uuid(value):
    """Return value as a UUID, or None if it isn't a valid UUID string."""
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None

def _page_args(default_per_page=10):
    """Read page/per_page from the query string, clamped to safe bounds."""
    page = max(request.args.get('page', 1, type=int) or 1, 1)
    per_page = request.args.get('per_page', default_per_page, type=int) or default_per_page
    per_page = min(max(per_page, 1), MAX_PER_PAGE)
    return page, per_page

def _as_utc(dt):
    """Return an aware UTC datetime (naive values are treated as UTC,
    other offsets like +05:30 are converted)."""
    return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def _is_past(event):
    return _as_utc(event.timestamp) < datetime.now(timezone.utc)

def parse_date_filter(value, end_of_day=False):
    """Parse an ISO date/datetime filter.

    A date-only value used as an upper bound ('2026-08-01') covers the whole day,
    so it is returned as the start of the next day for a '<' comparison.
    Raises ValueError on bad input so callers can return 400.
    """
    if len(value) == 10:  # YYYY-MM-DD
        parsed = datetime.fromisoformat(value)
        return parsed + timedelta(days=1) if end_of_day else parsed
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

def apply_date_filters(query, date_from, date_to):
    """Apply date_from/date_to to an Event query (raises ValueError on bad dates)."""
    if date_from:
        query = query.filter(Event.timestamp >= parse_date_filter(date_from))
    if date_to:
        upper = parse_date_filter(date_to, end_of_day=True)
        query = query.filter(Event.timestamp < upper if len(date_to) == 10 else Event.timestamp <= upper)
    return query

def apply_event_sort(query, sort_by):
    """'created_at' = newest first; anything else = soonest event first."""
    # event_id as a final tiebreaker keeps page order stable when values are equal
    if sort_by == 'created_at':
        return query.order_by(Event.created_at.desc(), Event.event_id)
    return query.order_by(Event.timestamp.asc(), Event.event_id)

def serialize_events(events):
    """Serialize events with their tags, using one query for all tags (no N+1)."""
    event_ids = [event.event_id for event in events]
    tags_by_event = {event_id: [] for event_id in event_ids}
    if event_ids:
        rows = db.session.query(EventTag.event_id, Tag).join(
            Tag, Tag.tag_id == EventTag.tag_id
        ).filter(EventTag.event_id.in_(event_ids)).order_by(Tag.name.asc()).all()
        for event_id, tag in rows:
            tags_by_event[event_id].append(tag.to_dict())

    result = []
    for event in events:
        data = event.to_dict()
        data['tags'] = tags_by_event.get(event.event_id, [])
        result.append(data)
    return result

def _paginated_events_response(query, page, per_page):
    """Standard list response: {events, pagination{page, per_page, total, pages}}."""
    total = query.count()
    events_list = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        'events': serialize_events(events_list),
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200

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
    """Discover list: upcoming events only, with optional filters.

    Query params: page, per_page, city, state, location, date_from, date_to,
    sort_by ('date' = soonest first, 'created_at' = newest first)
    """
    try:
        # Get query parameters
        page, per_page = _page_args()
        city = request.args.get('city')
        state = request.args.get('state')
        location = request.args.get('location')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        sort_by = request.args.get('sort_by', 'date')

        # Upcoming events only (by timestamp, so it doesn't depend on the scheduler)
        query = Event.query.options(joinedload(Event.creator)).filter(
            Event.is_active == True,
            Event.timestamp >= datetime.now(timezone.utc)
        )

        if city:
            query = query.filter(Event.city.ilike(like_pattern(city), escape='\\'))
        if state:
            query = query.filter(Event.state.ilike(like_pattern(state), escape='\\'))
        if location:
            query = query.filter(Event.location.ilike(like_pattern(location), escape='\\'))
        try:
            query = apply_date_filters(query, date_from, date_to)
        except ValueError:
            return jsonify({'error': 'date_from/date_to must be ISO dates'}), 400

        query = apply_event_sort(query, sort_by)
        return _paginated_events_response(query, page, per_page)

    except Exception as e:
        return error_response('Failed to fetch events', exc=e)

@events_bp.route('/', methods=['POST'])
@jwt_required()
def create_event():
    try:
        current_user_id = get_jwt_identity()
        data = get_json_body()

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

        # Parse timestamp ('Z' suffix accepted; naive values are treated as UTC)
        event_timestamp = _as_utc(datetime.fromisoformat(str(data['timestamp']).replace('Z', '+00:00')))
        is_paid = bool(data.get('is_paid', False))

        # Create event with new schema
        event = Event(
            posted_by=uuid.UUID(current_user_id),
            title=data['title'].strip(),
            description=data.get('description'),
            timestamp=event_timestamp,
            place=data['place'],
            location=data['location'],
            city=data['city'],
            state=data['state'],
            is_paid=is_paid,
            price=data.get('price') if is_paid else None,  # free events have no price
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

        # The creator is the first participant
        event.current_participants = 1

        db.session.commit()

        event_data = event.to_dict()
        event_data['tags'] = [tag.to_dict() for tag in tags]

        return jsonify({
            'message': 'Event created successfully',
            'event': event_data
        }), 201

    except IntegrityError:
        # unique_event_constraint: same organiser, title and time
        db.session.rollback()
        return jsonify({'error': 'You already have an event with this title at this time'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to create event', exc=e)

@events_bp.route('/<event_id>', methods=['GET'])
def get_event_details(event_id):
    """Event detail with tags and participants. Past events are viewable too."""
    try:
        if not validate_uuid(event_id):
            return jsonify({'error': 'Invalid event ID format'}), 400
        event_id = uuid.UUID(event_id)

        event = db.session.get(Event, event_id)
        if not event:
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
        user_uuid = uuid.UUID(current_user_id)
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400

        # Check if event exists. Lock the row (SELECT ... FOR UPDATE) so concurrent
        # joins are serialized and the capacity check below can't be raced.
        event = db.session.get(Event, event_id, with_for_update=True)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Check if already joined
        existing_participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=user_uuid
        ).first()

        if existing_participation:
            return jsonify({'error': 'Already joined this event'}), 400

        # Check if event has already passed
        if _is_past(event):
            return jsonify({'error': 'Cannot join an event that has already passed'}), 400

        # Check if event has max participants limit
        if event.max_participants and event.current_participants >= event.max_participants:
            return jsonify({'error': 'Event is full'}), 400

        # Create participation
        participation = Participation(
            event_id=event_id,
            user_id=user_uuid,
            status='interested'
        )

        db.session.add(participation)

        # Update event participant count
        event.update_participant_count()

        # Get user info for notifications
        user = db.session.get(User, user_uuid)

        # Create notification for event creator
        NotificationService.notify_new_participant(event, participation)

        # Create notification for the user who joined
        NotificationService.notify_user_joined_event(event, user)

        # One commit: participation, count and notifications are saved together
        db.session.commit()

        return jsonify({
            'message': 'Successfully joined event',
            'participation': participation.to_dict()
        }), 201

    except IntegrityError:
        # UNIQUE(event_id, user_id): a concurrent duplicate join from the same user
        db.session.rollback()
        return jsonify({'error': 'Already joined this event'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to join event', exc=e)

@events_bp.route('/<event_id>/leave', methods=['DELETE'])
@jwt_required()
def leave_event(event_id):
    try:
        current_user_id = get_jwt_identity()
        user_uuid = uuid.UUID(current_user_id)
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400

        # Find participation
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=user_uuid
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

        # One commit: removal, count and notification are saved together
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
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400
        data = get_json_body()

        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Check if user owns this event
        if str(event.posted_by) != current_user_id:
            return jsonify({'error': 'You can only edit your own events'}), 403

        if _is_past(event):
            return jsonify({'error': 'Past events cannot be edited'}), 400

        # Validate before changing anything (same rules as create_event)
        if 'title' in data:
            valid, err = validate_event_title(data.get('title'))
            if not valid:
                return jsonify({'error': err}), 400
        new_timestamp = None
        if 'timestamp' in data:
            try:
                new_timestamp = _as_utc(datetime.fromisoformat(str(data['timestamp']).replace('Z', '+00:00')))
            except ValueError:
                return jsonify({'error': 'Invalid timestamp format. Use ISO format.'}), 400
            if new_timestamp != _as_utc(event.timestamp):
                # Only require a future time when the time is actually being changed
                valid, err = validate_event_timestamp(new_timestamp.isoformat())
                if not valid:
                    return jsonify({'error': err}), 400
        if 'price' in data:
            valid, err = validate_price(data.get('price'))
            if not valid:
                return jsonify({'error': err}), 400
        if 'max_participants' in data:
            valid, err = validate_max_participants(data.get('max_participants'))
            if not valid:
                return jsonify({'error': err}), 400
            if data.get('max_participants') is not None and int(data['max_participants']) < (event.current_participants or 0):
                return jsonify({'error': 'max_participants cannot be lower than the current number of participants'}), 400
        for field in ('place', 'location', 'city', 'state'):
            if field in data and not str(data.get(field) or '').strip():
                return jsonify({'error': f'{field} is required'}), 400
        if 'source_type' in data and (data.get('source_type') or 'text').strip().lower() != 'text':
            return jsonify({'error': "Invalid source_type. Allowed value: 'text'"}), 400

        # Update event fields
        if 'title' in data:
            event.title = data['title'].strip()
        if 'description' in data:
            event.description = data['description']
        if new_timestamp is not None:
            event.timestamp = new_timestamp
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
            event.is_paid = bool(data['is_paid'])
        if 'price' in data:
            event.price = data['price']
        if not event.is_paid:
            # A free event must not keep an old price
            event.price = None
        if 'source_type' in data:
            event.source_type = 'text'
        if 'tag_ids' in data:
            try:
                _replace_event_tags(event.event_id, data.get('tag_ids') or [])
            except ValueError as error:
                return jsonify({'error': str(error)}), 400

        event.updated_at = datetime.now(timezone.utc)

        # Notify all participants about event update (saved in the same commit)
        NotificationService.notify_event_update(event)

        db.session.commit()

        event_data = event.to_dict()
        event_data['tags'] = [tag.to_dict() for tag in _get_event_tags(event.event_id)]

        return jsonify({
            'message': 'Event updated successfully',
            'event': event_data
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'You already have an event with this title at this time'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update event', exc=e)

@events_bp.route('/<event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    try:
        current_user_id = get_jwt_identity()
        user_uuid = uuid.UUID(current_user_id)
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400

        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        current_user = db.session.get(User, user_uuid)
        if str(event.posted_by) != current_user_id and (not current_user or current_user.role != 'admin'):
            return jsonify({'error': 'You can only delete your own events'}), 403

        # Tell participants before the event disappears (upcoming events only).
        # These notifications keep existing; their event_id becomes NULL.
        if not _is_past(event):
            NotificationService.notify_event_cancelled(event)

        # Remove tag links explicitly so deletion works even on a database without
        # ON DELETE CASCADE. Participations are removed by the ORM cascade, and
        # notifications' event_id is set to NULL.
        EventTag.query.filter_by(event_id=event_id).delete()
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
        user_uuid = uuid.UUID(current_user_id)
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400
        data = get_json_body()

        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400

        # Validate status
        valid_statuses = ['interested', 'going']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400

        # Find participation
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=user_uuid
        ).first()

        if not participation:
            return jsonify({'error': 'Not joined to this event'}), 404

        # Update status (both statuses count as participants, so the cached count
        # doesn't change)
        participation.status = data['status']

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
    """Events the user created (past and upcoming), newest event first."""
    try:
        current_user_id = get_jwt_identity()
        user_uuid = uuid.UUID(current_user_id)

        # Get pagination parameters
        page, per_page = _page_args()

        # Get events created by user
        query = Event.query.options(joinedload(Event.creator)).filter_by(
            posted_by=user_uuid
        ).order_by(Event.timestamp.desc())

        return _paginated_events_response(query, page, per_page)

    except Exception as e:
        return error_response('Failed to fetch your events', exc=e)

@events_bp.route('/joined', methods=['GET'])
@jwt_required()
def get_joined_events():
    """Events the user joined (past and upcoming), newest event first."""
    try:
        current_user_id = get_jwt_identity()
        user_uuid = uuid.UUID(current_user_id)

        # Get pagination parameters
        page, per_page = _page_args()

        # Get events user is participating in
        query = db.session.query(Event).options(joinedload(Event.creator)).join(Participation).filter(
            Participation.user_id == user_uuid,
            Participation.status.in_(['going', 'interested'])
        ).order_by(Event.timestamp.desc())

        return _paginated_events_response(query, page, per_page)

    except Exception as e:
        return error_response('Failed to fetch joined events', exc=e)


@events_bp.route('/<event_id>/participation_status', methods=['GET'])
@jwt_required()
def get_participation_status(event_id):
    """Check user's participation status for an event"""
    try:
        current_user_id = get_jwt_identity()
        user_uuid = uuid.UUID(current_user_id)
        event_id = _parse_uuid(event_id)
        if event_id is None:
            return jsonify({'error': 'Invalid event ID format'}), 400

        # Check if event exists
        event = db.session.get(Event, event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Check participation status
        participation = Participation.query.filter_by(
            event_id=event_id,
            user_id=user_uuid
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
