"""
validators.py - Input Validation and Sanitization

Why: Validates and sanitizes user input for security and data integrity.
The user-facing rules (email, password, username, name) are mirrored in
frontend/src/utils/validators.ts - keep both files in sync.

Request helpers:
- get_json_body(): Parsed JSON object body, or 400 for a missing/invalid body

User validation (return bool):
- validate_email(email): Email format
- validate_password(password): 8-128 chars, upper, lower, digit, special char, no weak patterns
- validate_username(username): 3-20 chars, letters/digits/underscore
- validate_name(name): Letters (any language), spaces, hyphens, apostrophes, dots
- validate_http_url(url): Empty, or an http(s) URL
- validate_preferences(value): List of short strings
- validate_hex_color(color): Empty, or '#RRGGBB'
- validate_uuid(uuid_string): UUID format check

Event validation (return (valid, error_message)):
- validate_event_title(title), validate_event_timestamp(ts),
  validate_price(price), validate_max_participants(value)

Search helpers:
- sanitize_search_query(query): Trim and length-limit a search query
- like_pattern(query): Escape LIKE wildcards and wrap in %...%
"""

import re
import unicodedata
from flask import current_app, request
from werkzeug.exceptions import BadRequest

# Special character = anything that isn't a letter, digit or whitespace
_SPECIAL_CHAR = re.compile(r'[^A-Za-z0-9\s]')
_WEAK_PASSWORD_PATTERNS = ['password', '12345', 'qwerty', 'admin']
_EMAIL = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
_USERNAME = re.compile(r'^[a-zA-Z0-9_]{3,20}$')
_HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
_UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')


def get_json_body():
    """Return the request body as a dict.

    Raises BadRequest (-> 400 "Invalid request body" via error_response) when the
    body is missing, isn't JSON, or isn't a JSON object, so every route handles
    bad bodies the same way instead of crashing on data.get(...).
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest('Request body must be a JSON object')
    return data


def validate_email(email):
    """Validate email format (plus-addressing like name+tag@gmail.com is allowed)."""
    if not email or len(email) > current_app.config.get('MAX_EMAIL_LENGTH', 254):
        return False
    if not _EMAIL.match(email):
        return False
    # Consecutive dots are invalid in the local part and domain
    return '..' not in email


def validate_password(password):
    """Validate password strength (same rules as the frontend's validatePassword)."""
    if not password or len(password) < 8 or len(password) > 128:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not _SPECIAL_CHAR.search(password):
        return False
    password_lower = password.lower()
    return not any(pattern in password_lower for pattern in _WEAK_PASSWORD_PATTERNS)


def validate_username(username):
    """3-20 characters: letters, digits and underscores."""
    return isinstance(username, str) and _USERNAME.match(username) is not None


def validate_name(name):
    """Letters from any language (incl. combining marks, e.g. Tamil), spaces, - ' and ."""
    if not isinstance(name, str) or not name.strip():
        return False
    if len(name) > current_app.config.get('MAX_NAME_LENGTH', 100):
        return False
    for ch in name:
        if ch in " -'.":
            continue
        # L* = letters, M* = combining marks (needed for Indic scripts)
        if not unicodedata.category(ch).startswith(('L', 'M')):
            return False
    return True


def validate_http_url(url):
    """Allow empty, or an absolute http(s) URL (blocks javascript:/data: URLs)."""
    if url in (None, ''):
        return True
    return isinstance(url, str) and len(url) <= 500 and re.match(r'^https?://\S+$', url) is not None


def validate_preferences(value):
    """Preferences must be a list of non-empty strings (max 50 items, 50 chars each)."""
    if not isinstance(value, list) or len(value) > 50:
        return False
    return all(isinstance(item, str) and 0 < len(item) <= 50 for item in value)


def validate_hex_color(color):
    """Allow empty, or a '#RRGGBB' colour."""
    return color in (None, '') or (isinstance(color, str) and _HEX_COLOR.match(color) is not None)


def validate_uuid(uuid_string):
    """Validate UUID format"""
    return _UUID.match(str(uuid_string).lower()) is not None


def sanitize_search_query(query):
    """Trim and limit a search query.

    Note: SQL injection is prevented by SQLAlchemy's bound parameters, not by this
    function. LIKE wildcards are escaped separately by like_pattern().
    """
    if not query:
        return ''
    return query.strip()[:100]


def like_pattern(query):
    """Build a '%query%' pattern with LIKE wildcards escaped.

    Use with column.ilike(like_pattern(q), escape='\\') so that searching for
    '50%' or 'a_b' matches those characters literally.
    """
    escaped = query.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return f'%{escaped}%'


def validate_event_title(title):
    """Validate event title: 1-200 chars, not blank."""
    if not isinstance(title, str) or not title.strip():
        return False, 'Title is required'
    if len(title) > 200:
        return False, 'Title must be 200 characters or fewer'
    return True, None


def validate_event_timestamp(timestamp_str):
    """Validate event timestamp: valid ISO format, must be in the future."""
    from datetime import datetime, timezone
    try:
        ts = datetime.fromisoformat(str(timestamp_str).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return False, 'Invalid timestamp format. Use ISO format.'
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    if ts <= datetime.now(timezone.utc):
        return False, 'Event timestamp must be in the future'
    return True, None


def validate_price(price):
    """Validate price: must be >= 0 if provided."""
    if price is None:
        return True, None
    try:
        p = float(price)
    except (ValueError, TypeError):
        return False, 'Price must be a number'
    if p < 0:
        return False, 'Price must not be negative'
    return True, None


def validate_max_participants(value):
    """Validate max_participants: must be > 0 if provided."""
    if value is None:
        return True, None
    try:
        v = int(value)
    except (ValueError, TypeError):
        return False, 'max_participants must be an integer'
    if v <= 0:
        return False, 'max_participants must be greater than 0'
    return True, None
