"""
Input validation.

The user rules (email, password, username, name, URL) and the event field limits
are mirrored in frontend/src/utils/validators.ts; keep both files in sync. The
length limits match the column sizes in database/init.sql.
"""

import re
import unicodedata
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import request
from werkzeug.exceptions import BadRequest

MAX_EMAIL_LENGTH = 254
MAX_NAME_LENGTH = 100
MAX_BIO_LENGTH = 500
MAX_URL_LENGTH = 500
MAX_TAG_NAME_LENGTH = 50
MAX_EVENT_TITLE_LENGTH = 200
MAX_EVENT_DESCRIPTION_LENGTH = 10000
MAX_PLACE_LENGTH = 200  # place and location
MAX_CITY_LENGTH = 100   # city and state
MAX_PRICE = Decimal('99999999.99')  # NUMERIC(10, 2)
MAX_SEARCH_LENGTH = 100

_SPECIAL_CHAR = re.compile(r'[^A-Za-z0-9\s]')
_WEAK_PASSWORD_PATTERNS = ('password', '12345', 'qwerty', 'admin')
_EMAIL = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
_USERNAME = re.compile(r'^[a-zA-Z0-9_]{3,20}$')
_HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
_HTTP_URL = re.compile(r'^https?://\S+$')
_DATE_ONLY = re.compile(r'^\d{4}-\d{2}-\d{2}$')


class ValidationError(ValueError):
    """Raised for invalid client input; the message is safe to return to the client."""


def get_json_body():
    """Return the request body as a dict, or raise 400 if it is missing or not a JSON object."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest('Invalid request body')
    return data


# --- Primitive checks --------------------------------------------------------------

def is_bool(value):
    return isinstance(value, bool)


def is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def parse_uuid(value):
    """Return value as a UUID, or None if it is not a valid UUID string."""
    if not isinstance(value, str):
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


def parse_uuid_list(values, field):
    """Parse a JSON array of UUID strings (duplicates removed, order kept)."""
    if not isinstance(values, list):
        raise ValidationError(f'{field} must be an array')
    parsed = []
    for value in values:
        item = parse_uuid(value)
        if item is None:
            raise ValidationError(f'Each value in {field} must be a valid UUID')
        if item not in parsed:
            parsed.append(item)
    return parsed


def parse_timestamp(value):
    """Parse an ISO 8601 timestamp. Naive values are treated as UTC. Returns an aware UTC datetime."""
    if not isinstance(value, str):
        raise ValidationError('Invalid timestamp format. Use ISO 8601.')
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise ValidationError('Invalid timestamp format. Use ISO 8601.') from None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_time_bound(value, upper=False):
    """Parse a date_from/date_to filter.

    Full timestamps are used as given. A date-only value ('2026-08-01') means that
    whole UTC day, so as an upper bound it becomes the last microsecond of the day.
    """
    if _DATE_ONLY.match(value or ''):
        try:
            day = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
        except ValueError:
            raise ValidationError('date_from/date_to must be ISO 8601 dates') from None
        return day.replace(hour=23, minute=59, second=59, microsecond=999999) if upper else day
    try:
        return parse_timestamp(value)
    except ValidationError:
        raise ValidationError('date_from/date_to must be ISO 8601 dates') from None


def _required_text(data, field, max_length, label=None):
    value = data.get(field)
    label = label or field
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f'{label} is required')
    value = value.strip()
    if len(value) > max_length:
        raise ValidationError(f'{label} must be {max_length} characters or fewer')
    return value


def _optional_text(data, field, max_length, label=None):
    value = data.get(field)
    label = label or field
    if value is None or value == '':
        return None
    if not isinstance(value, str):
        raise ValidationError(f'{label} must be text')
    if len(value) > max_length:
        raise ValidationError(f'{label} must be {max_length} characters or fewer')
    return value


# --- Users ----------------------------------------------------------------------------

def validate_email(email):
    """Email format; plus-addressing (name+tag@example.com) is allowed."""
    if not isinstance(email, str) or not email or len(email) > MAX_EMAIL_LENGTH:
        return False
    return _EMAIL.match(email) is not None and '..' not in email


def validate_password(password):
    """8-128 characters with upper and lower case, a digit and a special character."""
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        return False
    if not (re.search(r'[A-Z]', password) and re.search(r'[a-z]', password) and re.search(r'\d', password)):
        return False
    if not _SPECIAL_CHAR.search(password):
        return False
    lowered = password.lower()
    return not any(pattern in lowered for pattern in _WEAK_PASSWORD_PATTERNS)


def validate_username(username):
    """3-20 characters: letters, digits and underscores."""
    return isinstance(username, str) and _USERNAME.match(username) is not None


def validate_name(name):
    """Letters from any script (including combining marks), spaces, hyphens, apostrophes and dots."""
    if not isinstance(name, str) or not name.strip() or len(name) > MAX_NAME_LENGTH:
        return False
    for char in name:
        if char in " -'.":
            continue
        if not unicodedata.category(char).startswith(('L', 'M')):
            return False
    return True


def validate_http_url(url):
    """Empty, or an absolute http(s) URL."""
    if url in (None, ''):
        return True
    return isinstance(url, str) and len(url) <= MAX_URL_LENGTH and _HTTP_URL.match(url) is not None


def validate_hex_color(color):
    """Empty, or a '#RRGGBB' colour."""
    return color in (None, '') or (isinstance(color, str) and _HEX_COLOR.match(color) is not None)


# --- Events ---------------------------------------------------------------------------

def clean_event_fields(data, partial=False):
    """Validate event fields and return them normalised.

    With partial=True (updates) only the fields present in data are validated and
    returned. Cross-field rules (price vs is_paid) are checked by the caller once
    the final values are known, see check_event_price().
    """
    cleaned = {}

    def present(field):
        return not partial or field in data

    if present('title'):
        cleaned['title'] = _required_text(data, 'title', MAX_EVENT_TITLE_LENGTH, 'Title')
    if present('description'):
        cleaned['description'] = _optional_text(data, 'description', MAX_EVENT_DESCRIPTION_LENGTH, 'Description')
    if present('timestamp'):
        if data.get('timestamp') in (None, ''):
            raise ValidationError('timestamp is required')
        cleaned['timestamp'] = parse_timestamp(data['timestamp'])
    for field in ('place', 'location'):
        if present(field):
            cleaned[field] = _required_text(data, field, MAX_PLACE_LENGTH)
    for field in ('city', 'state'):
        if present(field):
            cleaned[field] = _required_text(data, field, MAX_CITY_LENGTH)

    if present('is_paid'):
        value = data.get('is_paid', False)
        if not is_bool(value):
            raise ValidationError('is_paid must be true or false')
        cleaned['is_paid'] = value
    if present('price'):
        price = data.get('price')
        if price is not None:
            if not is_number(price):
                raise ValidationError('Price must be a number')
            try:
                price = Decimal(str(price)).quantize(Decimal('0.01'))
            except InvalidOperation:
                raise ValidationError('Price must be a number') from None
            if price < 0:
                raise ValidationError('Price must not be negative')
            if price > MAX_PRICE:
                raise ValidationError('Price is too large')
        cleaned['price'] = price
    if present('max_participants'):
        value = data.get('max_participants')
        if value is not None:
            if not is_int(value):
                raise ValidationError('max_participants must be a whole number')
            if value <= 0:
                raise ValidationError('max_participants must be greater than 0')
        cleaned['max_participants'] = value
    if present('tag_ids'):
        cleaned['tag_ids'] = parse_uuid_list(data.get('tag_ids') or [], 'tag_ids')
    return cleaned


def check_event_price(is_paid, price):
    """Paid events need a price above zero; free events have no price. Returns the price to store."""
    if is_paid:
        if price is None or price <= 0:
            raise ValidationError('Paid events need a price greater than 0')
        return price
    return None


def require_future(timestamp):
    if timestamp <= datetime.now(timezone.utc):
        raise ValidationError('Event timestamp must be in the future')


# --- Search ---------------------------------------------------------------------------

def sanitize_search_query(query):
    """Trim and length-limit a search term. SQL injection is prevented by bound parameters."""
    if not isinstance(query, str):
        return ''
    return query.strip()[:MAX_SEARCH_LENGTH]


def like_pattern(query):
    """'%query%' with LIKE wildcards escaped; use with ilike(..., escape='\\')."""
    escaped = query.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return f'%{escaped}%'
