"""
Search across events (past and upcoming) and people.

GET /api/search/ (JWT required)
    q          Text matched against event title, description, place, location, city, state,
               and user name, username, bio
    type       all | events | users (default all)
    tag_ids    Comma-separated tag UUIDs: events with any of the tags, users with any as an interest
    location   Event place, location, city or state
    date_from, date_to   Event time range (ISO 8601; a date-only value means that UTC day)
    sort_by    date (upcoming first, soonest first; then past events) | created_at (newest first)
    limit      1-100 results per type (default 50)

People are only searched when q or tag_ids is given, so the endpoint never lists
every user. Results never include email addresses.
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import selectinload

from app import db
from app.models import User, user_tags
from app.services.event_queries import (
    EVENT_SORTS, apply_event_filters, apply_event_sort, base_event_query, ilike_any,
)
from app.utils.query_params import choice_arg, date_range_args, uuid_list_arg
from app.utils.responses import success_response
from app.utils.validators import sanitize_search_query

search_bp = Blueprint('search', __name__)

SEARCH_TYPES = ('all', 'events', 'users')
MAX_LIMIT = 100


@search_bp.route('/', methods=['GET'])
@jwt_required()
def search():
    query = sanitize_search_query(request.args.get('q'))
    search_type = choice_arg('type', SEARCH_TYPES, 'all')
    sort_by = choice_arg('sort_by', EVENT_SORTS, 'date')
    limit = min(max(request.args.get('limit', 50, type=int) or 50, 1), MAX_LIMIT)
    tag_ids = uuid_list_arg('tag_ids')
    location = sanitize_search_query(request.args.get('location'))
    date_from, date_to = date_range_args()

    results = {}
    if search_type in ('all', 'events'):
        events = apply_event_filters(
            base_event_query(), text=query, tag_ids=tag_ids, location=location,
            date_from=date_from, date_to=date_to,
        )
        events = apply_event_sort(events, sort_by, upcoming_first=True).limit(limit).all()
        results['events'] = [event.to_dict() for event in events]

    if search_type in ('all', 'users'):
        users = []
        if query or tag_ids:
            user_query = User.query.options(selectinload(User.interests)).filter(User.is_active.is_(True))
            if query:
                user_query = user_query.filter(ilike_any((User.name, User.username, User.bio), query))
            if tag_ids:
                user_query = user_query.filter(User.user_id.in_(
                    db.select(user_tags.c.user_id).where(user_tags.c.tag_id.in_(tag_ids))
                ))
            users = user_query.order_by(User.name, User.user_id).limit(limit).all()
        results['users'] = [user.to_public_dict() for user in users]

    return success_response({
        'query': query,
        'tag_ids': [str(tag_id) for tag_id in tag_ids],
        'results': results,
    })
