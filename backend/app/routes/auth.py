"""
Authentication and the current user's account.

Routes:
- POST /api/auth/register         Create an account; returns tokens and the user
- POST /api/auth/login            Returns tokens and the user
- POST /api/auth/logout           Revoke the access token (and the refresh token if sent)
- POST /api/auth/refresh          New access token from a refresh token
- GET  /api/auth/profile          Current user
- PUT  /api/auth/profile          Update name, username, bio, image URL, interests
- POST /api/auth/change-password  Change password; ends all other sessions

Tokens carry the user's token_version ('ver' claim). Changing the password
increments it, which invalidates every token issued before.
"""

from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token, create_refresh_token, decode_token, get_jwt, get_jwt_identity, jwt_required,
)
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import bcrypt, db, limiter
from app.models import RevokedToken, Tag, User
from app.services.notification_service import NotificationService
from app.utils.responses import error_response, success_response
from app.utils.validators import (
    MAX_BIO_LENGTH, ValidationError, get_json_body, parse_uuid, parse_uuid_list, validate_email,
    validate_http_url, validate_name, validate_password, validate_username,
)

auth_bp = Blueprint('auth', __name__)

PASSWORD_RULES_MESSAGE = (
    'Password must be 8-128 characters with uppercase, lowercase, number, and special character, '
    "and must not contain common patterns like 'password' or '12345'"
)
USERNAME_RULES_MESSAGE = 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
NAME_RULES_MESSAGE = 'Name may only contain letters, spaces, hyphens, apostrophes and dots (max 100 characters)'

# Compared against when the email is unknown, so login takes the same time either way
_dummy_password_hash = None


def _get_dummy_hash():
    global _dummy_password_hash
    if _dummy_password_hash is None:
        _dummy_password_hash = bcrypt.generate_password_hash('dummy-password-for-timing').decode('utf-8')
    return _dummy_password_hash


def current_user():
    """The authenticated user (the JWT callback has already checked that it exists and is active)."""
    return db.session.get(User, parse_uuid(get_jwt_identity()))


def issue_tokens(user):
    claims = {'ver': user.token_version}
    identity = str(user.user_id)
    return {
        'access_token': create_access_token(identity=identity, additional_claims=claims),
        'refresh_token': create_refresh_token(identity=identity, additional_claims=claims),
    }


def _username_taken(username, exclude_user_id=None):
    """Usernames are unique ignoring case ('Bob' and 'bob' cannot both exist)."""
    query = User.query.filter(func.lower(User.username) == username.lower())
    if exclude_user_id is not None:
        query = query.filter(User.user_id != exclude_user_id)
    return query.first() is not None


def _load_interests(values):
    """Tags for interest_tag_ids; every id must exist."""
    tag_ids = parse_uuid_list(values, 'interest_tag_ids')
    tags = Tag.query.filter(Tag.tag_id.in_(tag_ids)).all() if tag_ids else []
    if len(tags) != len(tag_ids):
        raise ValidationError('One or more interest tags were not found')
    return tags


def _validate_profile_fields(data):
    """Validate the optional profile fields shared by register and profile update."""
    if 'name' in data and not validate_name(data['name']):
        raise ValidationError(NAME_RULES_MESSAGE)
    if 'username' in data and not validate_username(data['username']):
        raise ValidationError(USERNAME_RULES_MESSAGE)
    bio = data.get('bio')
    if bio is not None and (not isinstance(bio, str) or len(bio) > MAX_BIO_LENGTH):
        raise ValidationError(f'Bio must be text of at most {MAX_BIO_LENGTH} characters')
    if 'profile_image_url' in data and not validate_http_url(data['profile_image_url']):
        raise ValidationError('Profile image URL must be an http(s) URL')


def _revoke(jti, expires_ts):
    if not db.session.get(RevokedToken, jti):
        db.session.add(RevokedToken(jti=jti, expires_at=datetime.fromtimestamp(expires_ts, tz=timezone.utc)))


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5/minute')
def register():
    data = get_json_body()
    for field in ('name', 'email', 'username', 'password'):
        if not isinstance(data.get(field), str) or not data[field].strip():
            raise ValidationError(f'{field} is required')
    if not validate_email(data['email']):
        raise ValidationError('Invalid email format')
    if not validate_password(data['password']):
        raise ValidationError(PASSWORD_RULES_MESSAGE)
    _validate_profile_fields(data)
    interests = _load_interests(data.get('interest_tag_ids') or [])

    email = data['email'].lower()
    if User.query.filter_by(email=email).first():
        return error_response('Email already registered', 409)
    if _username_taken(data['username']):
        return error_response('Username already taken', 409)

    user = User(
        name=data['name'].strip(),
        email=email,
        username=data['username'],
        password_hash=bcrypt.generate_password_hash(data['password']).decode('utf-8'),
        bio=data.get('bio') or None,
        profile_image_url=data.get('profile_image_url') or None,
        interests=interests,
    )
    db.session.add(user)
    db.session.flush()
    NotificationService.notify_welcome(user)
    try:
        db.session.commit()
    except IntegrityError:
        # A concurrent registration took the email or username first
        db.session.rollback()
        return error_response('Email or username already registered', 409)

    return success_response({
        'message': 'User registered successfully',
        **issue_tokens(user),
        'user': user.to_dict(),
    }, 201)


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('5/minute')
def login():
    data = get_json_body()
    email, password = data.get('email'), data.get('password')
    if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
        raise ValidationError('Email and password are required')

    user = User.query.filter_by(email=email.strip().lower()).first()
    # Always run one bcrypt check so unknown emails take as long as known ones
    password_ok = bcrypt.check_password_hash(user.password_hash if user else _get_dummy_hash(), password)
    if not user or not password_ok:
        return error_response('Invalid email or password', 401)
    if not user.is_active:
        return error_response('Account is deactivated', 401)

    return success_response({'message': 'Login successful', **issue_tokens(user), 'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Revoke the access token used for this request, and the refresh token if sent in the body."""
    claims = get_jwt()
    _revoke(claims['jti'], claims['exp'])

    body = request.get_json(silent=True)
    refresh_token = body.get('refresh_token') if isinstance(body, dict) else None
    if isinstance(refresh_token, str) and refresh_token:
        try:
            refresh_claims = decode_token(refresh_token)
        except Exception:
            refresh_claims = None  # invalid or expired: nothing to revoke
        if refresh_claims and refresh_claims.get('sub') == claims.get('sub'):
            _revoke(refresh_claims['jti'], refresh_claims['exp'])

    db.session.commit()
    return success_response({'message': 'Successfully logged out'})


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit('30/minute')
def refresh():
    user = current_user()
    access_token = create_access_token(identity=str(user.user_id), additional_claims={'ver': user.token_version})
    return success_response({'access_token': access_token})


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    return success_response({'user': current_user().to_dict()})


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = current_user()
    data = get_json_body()

    # Validate everything before changing anything
    _validate_profile_fields(data)
    interests = _load_interests(data['interest_tag_ids'] or []) if 'interest_tag_ids' in data else None
    if 'username' in data and _username_taken(data['username'], exclude_user_id=user.user_id):
        return error_response('Username already taken', 409)

    if 'name' in data:
        user.name = data['name'].strip()
    if 'username' in data:
        user.username = data['username']
    if 'bio' in data:
        user.bio = data['bio'] or None
    if 'profile_image_url' in data:
        user.profile_image_url = data['profile_image_url'] or None
    if interests is not None:
        user.interests = interests

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('Username already taken', 409)

    return success_response({'message': 'Profile updated successfully', 'user': user.to_dict()})


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def change_password():
    user = current_user()
    data = get_json_body()
    current_password, new_password = data.get('current_password'), data.get('new_password')
    if not isinstance(current_password, str) or not isinstance(new_password, str) \
            or not current_password or not new_password:
        raise ValidationError('Current password and new password are required')
    if not bcrypt.check_password_hash(user.password_hash, current_password):
        raise ValidationError('Current password is incorrect')
    if not validate_password(new_password):
        raise ValidationError(PASSWORD_RULES_MESSAGE)

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    # Invalidate every existing session, then give this client fresh tokens
    user.token_version += 1
    db.session.commit()

    return success_response({'message': 'Password changed successfully', **issue_tokens(user)})
