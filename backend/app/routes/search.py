"""
search.py - Unified Search Routes

Why: Provides search across events, users, and tags

Routes/Functions:
- unified_search(): GET /api/search/ - Search events, users, tags
  Query params: q (query), type (all/events/users/tags), limit (1-100),
  tag_ids (comma-separated UUIDs), location, date_from, date_to,
  sort_by ('relevance'/'date' = upcoming first, soonest first; 'created_at' = newest first)

Searches in:
- Events: title, description, city, state, place (past events included)
- Users: name, username, bio (public fields only - no email)
- Tags: name, description
"""

from flask import Blueprint, request, jsonify
from sqlalchemy.orm import joinedload
from app import db
from app.models import Event, User, Tag, EventTag, UserTag
from app.utils.validators import validate_uuid, sanitize_search_query, like_pattern
from app.utils.responses import error_response
from app.routes.events import apply_date_filters, serialize_events
from datetime import datetime, timezone
import uuid

search_bp = Blueprint('search', __name__)

MAX_LIMIT = 100


def _ilike_any(columns, text):
    """OR of case-insensitive 'contains' matches, with LIKE wildcards escaped."""
    pattern = like_pattern(text)
    return db.or_(*[column.ilike(pattern, escape='\\') for column in columns])


@search_bp.route('/', methods=['GET'])
def unified_search():
    """Unified search across users, events, and tags"""
    try:
        query = sanitize_search_query(request.args.get('q', ''))
        search_type = request.args.get('type', 'all')  # all, events, users, tags
        limit = min(max(request.args.get('limit', 50, type=int) or 50, 1), MAX_LIMIT)
        tag_ids = request.args.get('tag_ids', '').strip()
        location = sanitize_search_query(request.args.get('location', ''))
        sort_by = request.args.get('sort_by', 'relevance')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        results = {}

        # Parse tag IDs
        tag_filter_ids = []
        if tag_ids:
            raw_tag_ids = [tid.strip() for tid in tag_ids.split(',') if tid.strip()]
            invalid_tag_ids = [tid for tid in raw_tag_ids if not validate_uuid(tid)]
            if invalid_tag_ids:
                return jsonify({'error': 'tag_ids must be comma-separated UUID values'}), 400
            tag_filter_ids = [uuid.UUID(tid) for tid in raw_tag_ids]

        if search_type in ['all', 'events']:
            # Search events - past events are included so users can find them again
            event_query = Event.query.options(joinedload(Event.creator))

            # Add text search if query provided
            if query:
                event_query = event_query.filter(_ilike_any(
                    [Event.title, Event.description, Event.city, Event.state, Event.place], query
                ))

            # Add tag filtering
            if tag_filter_ids:
                # Subquery instead of a join so an event matching several tags is returned once
                event_query = event_query.filter(
                    Event.event_id.in_(
                        db.select(EventTag.event_id).where(EventTag.tag_id.in_(tag_filter_ids))
                    )
                )

            # Add location filtering
            if location:
                event_query = event_query.filter(_ilike_any([Event.city, Event.state, Event.place], location))

            # Add date filtering
            try:
                event_query = apply_date_filters(event_query, date_from, date_to)
            except ValueError:
                return jsonify({'error': 'date_from/date_to must be ISO dates'}), 400

            # Apply sorting
            if sort_by == 'created_at':
                event_query = event_query.order_by(Event.created_at.desc())
            else:
                # Upcoming events first (soonest first), then past events
                is_past = db.case((Event.timestamp < datetime.now(timezone.utc), 1), else_=0)
                event_query = event_query.order_by(is_past.asc(), Event.timestamp.asc())

            events = event_query.limit(limit).all()
            results['events'] = serialize_events(events)

        if search_type in ['all', 'users']:
            # Search users
            user_query = User.query.filter(User.is_active == True)

            # Add text search if query provided
            if query:
                user_query = user_query.filter(_ilike_any([User.name, User.username, User.bio], query))

            # Add tag filtering for users
            if tag_filter_ids:
                user_query = user_query.filter(
                    User.user_id.in_(
                        db.select(UserTag.user_id).where(UserTag.tag_id.in_(tag_filter_ids))
                    )
                )

            users = user_query.limit(limit).all()
            # Public endpoint: never expose email addresses
            results['users'] = [user.to_public_dict() for user in users]

        if search_type in ['all', 'tags']:
            # Search tags (only with query, not tag filtering)
            if query:
                tags = Tag.query.filter(
                    _ilike_any([Tag.name, Tag.description], query)
                ).limit(limit).all()

                results['tags'] = [tag.to_dict() for tag in tags]
            else:
                results['tags'] = []

        return jsonify({
            'query': query,
            'tag_ids': [str(tag_id) for tag_id in tag_filter_ids],
            'results': results
        }), 200

    except Exception as e:
        return error_response('Search failed', exc=e)
