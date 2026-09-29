"""
Events and participation.

Routes (all require a JWT):
- GET    /api/events/                    Upcoming events (Discover) with filters and pagination
- POST   /api/events/                    Create an event; the organiser joins it as 'going'
- GET    /api/events/<id>                Event detail with participants and the viewer's status
- PUT    /api/events/<id>                Update (organiser only, upcoming events only)
- DELETE /api/events/<id>                Delete (organiser or admin)
- POST   /api/events/<id>/join           Join as 'interested'
- DELETE /api/events/<id>/leave          Leave
- PUT    /api/events/<id>/update-status  Switch between 'interested' and 'going'
- GET    /api/events/my                  Events the user organises
- GET    /api/events/joined              Events the user joined, excluding their own

An event is upcoming while its timestamp is in the future; past events stay
viewable but cannot be edited, joined or left.

Participant counts: joins, leaves and capacity changes lock the event row
(SELECT ... FOR UPDATE) before reading or recounting current_participants, so
concurrent requests are serialised and the cached count stays exact.
"""

from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import PARTICIPATION_STATUSES, Event, Participation, Tag, User
from app.routes.auth import current_user
from app.services.event_queries import EVENT_SORTS, apply_event_filters, apply_event_sort, base_event_query
from app.services.notification_service import NotificationService
from app.utils.query_params import choice_arg, date_range_args, page_args, paginate, uuid_list_arg
from app.utils.responses import error_response, success_response
from app.utils.validators import (
    ValidationError, check_event_price, clean_event_fields, get_json_body, parse_uuid, require_future,
    sanitize_search_query,
)

events_bp = Blueprint('events', __name__)

DUPLICATE_EVENT_MESSAGE = 'You already have an event with this title at this time'


def _as_utc(value):
    return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _is_past(event):
    return _as_utc(event.timestamp) <= datetime.now(timezone.utc)


def _event_id_or_error(raw_id):
    event_id = parse_uuid(raw_id)
    if event_id is None:
        raise ValidationError('Invalid event ID format')
    return event_id


def _get_event(raw_id, lock=False):
    """Load an event (optionally locking its row). Returns (event, error_response)."""
    event = db.session.get(Event, _event_id_or_error(raw_id), with_for_update=lock)
    if event is None:
        return None, error_response('Event not found', 404)
    return event, None


def _load_tags(tag_ids):
    tags = Tag.query.filter(Tag.tag_id.in_(tag_ids)).all() if tag_ids else []
    if len(tags) != len(tag_ids):
        raise ValidationError('One or more tags were not found')
    return tags


def _owned_events_response(query):
    """Shared by /my and /joined: optional date range, 'upcoming' flag, pagination."""
    date_from, date_to = date_range_args()
    query = apply_event_filters(query, date_from=date_from, date_to=date_to)
    if request.args.get('upcoming') == 'true':
        query = query.filter(Event.timestamp > datetime.now(timezone.utc)).order_by(Event.timestamp, Event.event_id)
    else:
        query = query.order_by(Event.timestamp.desc(), Event.event_id)
    page, per_page = page_args()
    events, pagination = paginate(query, page, per_page)
    return success_response({'events': [event.to_dict() for event in events], 'pagination': pagination})


@events_bp.route('/', methods=['GET'])
@jwt_required()
def list_events():
    """Upcoming events. Query: q, tag_ids, location, date_from, date_to, sort_by, page, per_page."""
    date_from, date_to = date_range_args()
    query = base_event_query().filter(Event.timestamp > datetime.now(timezone.utc))
    query = apply_event_filters(
        query,
        text=sanitize_search_query(request.args.get('q')),
        tag_ids=uuid_list_arg('tag_ids'),
        location=sanitize_search_query(request.args.get('location')),
        date_from=date_from,
        date_to=date_to,
    )
    query = apply_event_sort(query, choice_arg('sort_by', EVENT_SORTS, 'date'))
    page, per_page = page_args()
    events, pagination = paginate(query, page, per_page)
    return success_response({'events': [event.to_dict() for event in events], 'pagination': pagination})


@events_bp.route('/', methods=['POST'])
@jwt_required()
def create_event():
    user = current_user()
    data = get_json_body()
    fields = clean_event_fields(data)
    require_future(fields['timestamp'])
    price = check_event_price(fields['is_paid'], fields['price'])

    if Event.query.filter_by(posted_by=user.user_id, title=fields['title'], timestamp=fields['timestamp']).first():
        return error_response(DUPLICATE_EVENT_MESSAGE, 409)

    event = Event(
        posted_by=user.user_id,
        title=fields['title'],
        description=fields['description'],
        timestamp=fields['timestamp'],
        place=fields['place'],
        location=fields['location'],
        city=fields['city'],
        state=fields['state'],
        is_paid=fields['is_paid'],
        price=price,
        max_participants=fields['max_participants'],
        tags=_load_tags(fields['tag_ids']),
        current_participants=1,  # the organiser
    )
    db.session.add(event)
    db.session.flush()
    db.session.add(Participation(event_id=event.event_id, user_id=user.user_id, status='going'))

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(DUPLICATE_EVENT_MESSAGE, 409)

    return success_response({'message': 'Event created successfully', 'event': event.to_dict()}, 201)


@events_bp.route('/<event_id>', methods=['GET'])
@jwt_required()
def get_event(event_id):
    """Event detail, participants (organiser first) and the viewer's participation."""
    event, error = _get_event(event_id)
    if error:
        return error
    viewer = current_user()

    rows = db.session.query(Participation, User).join(User, User.user_id == Participation.user_id).filter(
        Participation.event_id == event.event_id
    ).order_by(Participation.joined_at).all()
    participants = [{
        'user_id': str(user.user_id),
        'name': user.name,
        'profile_image_url': user.profile_image_url,
        'status': participation.status,
    } for participation, user in rows]
    participants.sort(key=lambda p: p['user_id'] != str(event.posted_by))  # organiser first

    viewer_status = next(
        (participation.status for participation, user in rows if user.user_id == viewer.user_id), 'not_joined',
    )
    data = event.to_dict()
    data['participants'] = participants
    data['viewer'] = {'status': viewer_status, 'is_creator': event.posted_by == viewer.user_id}
    return success_response({'event': data})


@events_bp.route('/<event_id>', methods=['PUT'])
@jwt_required()
def update_event(event_id):
    # Locked so a concurrent join cannot slip past a lowered capacity
    event, error = _get_event(event_id, lock=True)
    if error:
        return error
    if event.posted_by != current_user().user_id:
        return error_response('You can only edit your own events', 403)
    if _is_past(event):
        return error_response('Past events cannot be edited', 400)

    data = get_json_body()
    fields = clean_event_fields(data, partial=True)

    if 'timestamp' in fields and fields['timestamp'] != _as_utc(event.timestamp):
        require_future(fields['timestamp'])
    if 'max_participants' in fields and fields['max_participants'] is not None \
            and fields['max_participants'] < event.current_participants:
        raise ValidationError('max_participants cannot be lower than the current number of participants')
    is_paid = fields.get('is_paid', event.is_paid)
    price = fields['price'] if 'price' in fields else event.price
    fields['price'] = check_event_price(is_paid, price)
    tags = _load_tags(fields.pop('tag_ids')) if 'tag_ids' in fields else None

    if fields.get('timestamp') == _as_utc(event.timestamp):
        del fields['timestamp']  # unchanged; avoids a spurious naive/aware difference
    for field, value in fields.items():
        setattr(event, field, value)
    if tags is not None and {t.tag_id for t in tags} != {t.tag_id for t in event.tags}:
        event.tags = tags

    # Only notify participants when something actually changed
    if db.session.is_modified(event):
        NotificationService.notify_event_update(event)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(DUPLICATE_EVENT_MESSAGE, 409)

    return success_response({'message': 'Event updated successfully', 'event': event.to_dict()})


@events_bp.route('/<event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    event, error = _get_event(event_id)
    if error:
        return error
    user = current_user()
    if event.posted_by != user.user_id and user.role != 'admin':
        return error_response('You can only delete your own events', 403)

    if not _is_past(event):
        NotificationService.notify_event_cancelled(event)
        # Insert the notifications before the delete; the database then sets their event_id to NULL
        db.session.flush()
    # Participations and tag links are removed by ON DELETE CASCADE
    db.session.delete(event)
    db.session.commit()
    return success_response({'message': 'Event deleted successfully'})


@events_bp.route('/<event_id>/join', methods=['POST'])
@jwt_required()
def join_event(event_id):
    event, error = _get_event(event_id, lock=True)
    if error:
        return error
    user = current_user()

    if Participation.query.filter_by(event_id=event.event_id, user_id=user.user_id).first():
        return error_response('Already joined this event', 409)
    if _is_past(event):
        return error_response('Cannot join an event that has already passed', 400)
    if event.max_participants is not None and event.current_participants >= event.max_participants:
        return error_response('Event is full', 409)

    participation = Participation(event_id=event.event_id, user_id=user.user_id, status='interested')
    db.session.add(participation)
    event.refresh_participant_count()
    NotificationService.notify_new_participant(event, user)
    NotificationService.notify_user_joined_event(event, user)

    try:
        db.session.commit()
    except IntegrityError:
        # UNIQUE(event_id, user_id): a concurrent duplicate join by the same user
        db.session.rollback()
        return error_response('Already joined this event', 409)

    return success_response({'message': 'Successfully joined event', 'participation': participation.to_dict()}, 201)


@events_bp.route('/<event_id>/leave', methods=['DELETE'])
@jwt_required()
def leave_event(event_id):
    event, error = _get_event(event_id, lock=True)
    if error:
        return error
    user = current_user()

    participation = Participation.query.filter_by(event_id=event.event_id, user_id=user.user_id).first()
    if not participation:
        return error_response('Not joined to this event', 404)
    if event.posted_by == user.user_id:
        return error_response('The organiser cannot leave their own event', 400)
    if _is_past(event):
        return error_response('Cannot leave an event that has already passed', 400)

    db.session.delete(participation)
    event.refresh_participant_count()
    NotificationService.notify_participant_left(event, user)
    db.session.commit()
    return success_response({'message': 'Successfully left event'})


@events_bp.route('/<event_id>/update-status', methods=['PUT'])
@jwt_required()
def update_participation_status(event_id):
    event, error = _get_event(event_id)
    if error:
        return error
    user = current_user()
    data = get_json_body()

    status = data.get('status')
    if status not in PARTICIPATION_STATUSES:
        raise ValidationError(f"status must be one of: {', '.join(PARTICIPATION_STATUSES)}")

    participation = Participation.query.filter_by(event_id=event.event_id, user_id=user.user_id).first()
    if not participation:
        return error_response('Not joined to this event', 404)
    if event.posted_by == user.user_id:
        return error_response('The organiser is always going to their own event', 400)
    if _is_past(event):
        return error_response('Cannot change your status for an event that has already passed', 400)

    # Both statuses count as participants, so the cached count does not change
    participation.status = status
    db.session.commit()
    return success_response({
        'message': 'Participation status updated successfully',
        'participation': participation.to_dict(),
    })


@events_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_events():
    """Events the user organises. Query: upcoming=true, date_from, date_to, page, per_page."""
    query = base_event_query().filter(Event.posted_by == current_user().user_id)
    return _owned_events_response(query)


@events_bp.route('/joined', methods=['GET'])
@jwt_required()
def get_joined_events():
    """Events the user joined as a participant (their own events are in /my)."""
    user_id = current_user().user_id
    query = base_event_query().join(Participation, Participation.event_id == Event.event_id).filter(
        Participation.user_id == user_id,
        Event.posted_by != user_id,
    )
    return _owned_events_response(query)
