"""
auth.py - Authentication Routes

Why: Handles user registration, login, logout, and profile management

Routes/Functions:
- register(): POST /api/auth/register - Create new user account
- login(): POST /api/auth/login - Authenticate user with email/password
- logout(): POST /api/auth/logout - Revoke the current tokens (JWT required)
- refresh(): POST /api/auth/refresh - Get new access token
- get_profile(): GET /api/auth/profile - Get current user data (JWT required)
- update_profile(): PUT /api/auth/profile - Update user info (JWT required)
- change_password(): POST /api/auth/change-password - Change password (JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, decode_token,
    jwt_required, get_jwt_identity, get_jwt,
)
from app import db, bcrypt
from app.models import User, RevokedToken
from app.utils.validators import (
    get_json_body, validate_email, validate_password, validate_name,
    validate_username, validate_http_url, validate_preferences,
)
from app.utils.responses import error_response
from app.services.notification_service import NotificationService
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app import limiter
import uuid

auth_bp = Blueprint('auth', __name__)

PASSWORD_RULES_MESSAGE = (
    'Password must be 8-128 characters with uppercase, lowercase, number, and special character, '
    "and must not contain common patterns like 'password' or '12345'"
)
USERNAME_RULES_MESSAGE = 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
MAX_BIO_LENGTH = 500

# Hash compared against when the email doesn't exist, so login takes the same time
# for unknown and known emails (prevents discovering accounts by timing).
_dummy_password_hash = None


def _get_dummy_hash():
    global _dummy_password_hash
    if _dummy_password_hash is None:
        _dummy_password_hash = bcrypt.generate_password_hash('dummy-password-for-timing').decode('utf-8')
    return _dummy_password_hash


def _username_taken(username, exclude_user_id=None):
    """Usernames are unique case-insensitively ('Bob' and 'bob' can't both exist)."""
    query = User.query.filter(func.lower(User.username) == username.lower())
    if exclude_user_id is not None:
        query = query.filter(User.user_id != exclude_user_id)
    return query.first() is not None


def _validate_profile_fields(data):
    """Validate optional profile fields shared by register and profile update.

    Returns an error message, or None when everything present is valid.
    """
    if 'name' in data and not validate_name(data['name']):
        return 'Name may only contain letters, spaces, hyphens, apostrophes and dots (max 100 characters)'
    if 'username' in data and not validate_username(data['username']):
        return USERNAME_RULES_MESSAGE
    if data.get('bio') is not None and (not isinstance(data['bio'], str) or len(data['bio']) > MAX_BIO_LENGTH):
        return f'Bio must be text of at most {MAX_BIO_LENGTH} characters'
    if 'profile_image_url' in data and not validate_http_url(data['profile_image_url']):
        return 'Profile image URL must be an http(s) URL'
    if data.get('preferences') is not None and not validate_preferences(data['preferences']):
        return 'Preferences must be a list of short text values'
    return None


def _revoke(jti, expires_ts):
    """Store a token id in the denylist (no-op if it's already there)."""
    if not db.session.get(RevokedToken, jti):
        db.session.add(RevokedToken(jti=jti, expires_at=datetime.fromtimestamp(expires_ts, tz=timezone.utc)))


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5/minute')
def register():
    """
    Register a new user account.

    Request Body:
        name (str): User's full name
        email (str): Valid email address
        username (str): Unique username (3-20 chars: letters, digits, underscore)
        password (str): Strong password (8+ chars, upper, lower, number, special)
        bio (str, optional): User biography
        profile_image_url (str, optional): http(s) URL to profile picture
        preferences (list, optional): Array of user interests/tags

    Returns:
        201: User created successfully with JWT tokens
        400: Validation error or duplicate email/username
        500: Server error
    """
    try:
        data = get_json_body()

        # Validate required fields
        required_fields = ['name', 'email', 'username', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400

        if not validate_password(data['password']):
            return jsonify({'error': PASSWORD_RULES_MESSAGE}), 400

        error = _validate_profile_fields(data)
        if error:
            return jsonify({'error': error}), 400

        # Check if user already exists
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Email already registered'}), 400

        if _username_taken(data['username']):
            return jsonify({'error': 'Username already taken'}), 400

        # Create new user
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        user = User(
            name=data['name'].strip(),
            email=data['email'].lower(),
            username=data['username'],
            password_hash=password_hash,
            bio=data.get('bio'),
            profile_image_url=data.get('profile_image_url') or None,
            preferences=data.get('preferences') or []
        )

        db.session.add(user)
        db.session.flush()  # assigns user.user_id

        # Create welcome notification for new user (same transaction as the user)
        NotificationService.create_notification(
            user_id=user.user_id,
            notification_type='welcome',
            title='Welcome to PlanPal!',
            message=f'Welcome to PlanPal, {user.name}! Start exploring events and connecting with like-minded people.'
        )
        db.session.commit()

        # Create tokens
        access_token = create_access_token(identity=str(user.user_id))
        refresh_token = create_refresh_token(identity=str(user.user_id))

        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 201

    except IntegrityError:
        # Concurrent registration with the same email/username hit the UNIQUE constraint
        db.session.rollback()
        return jsonify({'error': 'Email or username already registered'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Registration failed', exc=e)

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('5/minute')
def login():
    try:
        data = get_json_body()

        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        # Find user
        user = User.query.filter_by(email=str(data['email']).lower()).first()

        # Always run one bcrypt check so unknown emails take as long as known ones
        password_hash = user.password_hash if user else _get_dummy_hash()
        password_ok = bcrypt.check_password_hash(password_hash, data['password'])

        if not user or not password_ok:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        # Create tokens
        access_token = create_access_token(identity=str(user.user_id))
        refresh_token = create_refresh_token(identity=str(user.user_id))

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return error_response('Login failed', exc=e)

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Revoke the access token used for this request, and the refresh token if sent.

    Request Body (optional):
        refresh_token (str): The refresh token to revoke as well
    """
    try:
        claims = get_jwt()
        _revoke(claims['jti'], claims['exp'])

        # Also revoke the refresh token so it can't mint new access tokens
        body = request.get_json(silent=True) or {}
        refresh_token = body.get('refresh_token') if isinstance(body, dict) else None
        if refresh_token:
            try:
                refresh_claims = decode_token(refresh_token)
                # Only revoke refresh tokens that belong to the same user
                if refresh_claims.get('sub') == claims.get('sub'):
                    _revoke(refresh_claims['jti'], refresh_claims['exp'])
            except Exception:
                pass  # Invalid/expired refresh token: nothing to revoke

        db.session.commit()
        return jsonify({'message': 'Successfully logged out'}), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Logout failed', exc=e)

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, uuid.UUID(current_user_id))

        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 404

        new_access_token = create_access_token(identity=str(user.user_id))

        return jsonify({
            'access_token': new_access_token
        }), 200

    except Exception as e:
        return error_response('Token refresh failed', exc=e)

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, uuid.UUID(current_user_id))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return error_response('Failed to get profile', exc=e)

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, uuid.UUID(current_user_id))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = get_json_body()

        # Validate everything before changing anything (same rules as register)
        error = _validate_profile_fields(data)
        if error:
            return jsonify({'error': error}), 400
        if 'username' in data and _username_taken(data['username'], exclude_user_id=user.user_id):
            return jsonify({'error': 'Username already taken'}), 400

        # Update allowed fields
        if 'name' in data:
            user.name = data['name'].strip()
        if 'username' in data:
            user.username = data['username']
        if 'bio' in data:
            user.bio = data['bio']
        if 'profile_image_url' in data:
            user.profile_image_url = data['profile_image_url'] or None
        if 'preferences' in data:
            user.preferences = data['preferences'] or []

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username already taken'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update profile', exc=e)

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@limiter.limit('10/minute')
def change_password():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, uuid.UUID(current_user_id))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = get_json_body()

        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400

        # Verify current password
        if not bcrypt.check_password_hash(user.password_hash, data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400

        # Validate new password
        if not validate_password(data['new_password']):
            return jsonify({'error': PASSWORD_RULES_MESSAGE}), 400

        # Update password
        user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        db.session.commit()

        return jsonify({
            'message': 'Password changed successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to change password', exc=e)
