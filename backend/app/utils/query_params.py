"""Parsing of common query-string parameters (pagination, UUID lists, date ranges)."""

from flask import request

from app.utils.validators import ValidationError, parse_time_bound, parse_uuid

MAX_PER_PAGE = 100


def page_args(default_per_page=10):
    """page and per_page from the query string, clamped to 1..MAX_PER_PAGE."""
    page = max(request.args.get('page', 1, type=int) or 1, 1)
    per_page = request.args.get('per_page', default_per_page, type=int) or default_per_page
    return page, min(max(per_page, 1), MAX_PER_PAGE)


def uuid_list_arg(name):
    """A comma-separated list of UUIDs, e.g. ?tag_ids=a,b."""
    raw = request.args.get(name, '')
    values = []
    for part in raw.split(','):
        part = part.strip()
        if not part:
            continue
        value = parse_uuid(part)
        if value is None:
            raise ValidationError(f'{name} must be comma-separated UUID values')
        values.append(value)
    return values


def date_range_args():
    """(date_from, date_to) as aware UTC datetimes, or None when not given."""
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    return (
        parse_time_bound(date_from) if date_from else None,
        parse_time_bound(date_to, upper=True) if date_to else None,
    )


def choice_arg(name, choices, default):
    value = request.args.get(name, default)
    if value not in choices:
        raise ValidationError(f"{name} must be one of: {', '.join(choices)}")
    return value


def paginate(query, page, per_page):
    """Run a paginated query. Returns (items, pagination dict)."""
    total = query.order_by(None).count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, {
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': (total + per_page - 1) // per_page,
    }
