"""
Event query building shared by the event list (GET /api/events) and search
(GET /api/search), so both endpoints filter and sort in exactly the same way.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import joinedload, selectinload

from app import db
from app.models import Event, event_tags
from app.utils.validators import like_pattern

EVENT_SORTS = ('date', 'created_at')

# Columns matched by the free-text query and by the location filter
TEXT_COLUMNS = (Event.title, Event.description, Event.place, Event.location, Event.city, Event.state)
LOCATION_COLUMNS = (Event.place, Event.location, Event.city, Event.state)


def ilike_any(columns, text):
    """Case-insensitive 'contains' match on any of the columns, with LIKE wildcards escaped."""
    pattern = like_pattern(text)
    return db.or_(*[column.ilike(pattern, escape='\\') for column in columns])


def base_event_query():
    """Event query with the creator and tags loaded up front (no N+1 on serialization)."""
    return Event.query.options(joinedload(Event.creator), selectinload(Event.tags))


def apply_event_filters(query, text='', tag_ids=(), location='', date_from=None, date_to=None):
    """Filter by text, tags (any of them), location and an inclusive date range."""
    if text:
        query = query.filter(ilike_any(TEXT_COLUMNS, text))
    if tag_ids:
        # Subquery rather than a join, so an event with several matching tags appears once
        query = query.filter(Event.event_id.in_(
            db.select(event_tags.c.event_id).where(event_tags.c.tag_id.in_(tag_ids))
        ))
    if location:
        query = query.filter(ilike_any(LOCATION_COLUMNS, location))
    if date_from:
        query = query.filter(Event.timestamp >= date_from)
    if date_to:
        query = query.filter(Event.timestamp <= date_to)
    return query


def apply_event_sort(query, sort_by, upcoming_first=False):
    """'date': soonest first; 'created_at': newest first.

    upcoming_first puts future events before past ones (used by search, which
    includes past events). event_id is the final tiebreaker so paging is stable.
    """
    if sort_by == 'created_at':
        return query.order_by(Event.created_at.desc(), Event.event_id)
    if upcoming_first:
        is_past = db.case((Event.timestamp < datetime.now(timezone.utc), 1), else_=0)
        return query.order_by(is_past, Event.timestamp, Event.event_id)
    return query.order_by(Event.timestamp, Event.event_id)
