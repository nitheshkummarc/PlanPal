"""
users.py - User Profile and Search Routes

Why: Handles user profile viewing and user search

Routes/Functions:
- get_profile(): GET /api/users/profile - Get current user profile (JWT required)
- search_users(): GET /api/users/search - Search users by name/username (JWT required)
- get_user(): GET /api/users/<user_id> - Get a user's public profile (JWT required)

Other users' emails are never returned; you only see your own.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.utils.validators import sanitize_search_query, validate_uuid, like_pattern
from app.utils.responses import error_response
import uuid

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user = db.session.get(User, uuid.UUID(get_jwt_identity()))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return error_response('Failed to get profile', exc=e)

@users_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    try:
        query = sanitize_search_query(request.args.get('q', ''))
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        if len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400

        # Search users by name or username (LIKE wildcards escaped)
        pattern = like_pattern(query)
        users = User.query.filter(
            db.or_(
                User.name.ilike(pattern, escape='\\'),
                User.username.ilike(pattern, escape='\\')
            ),
            User.is_active == True
        ).limit(20).all()

        return jsonify({
            'users': [user.to_public_dict() for user in users]
        }), 200

    except Exception as e:
        return error_response('Failed to search users', exc=e)

@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
        # SECURITY: Validate UUID format
        if not validate_uuid(user_id):
            return jsonify({'error': 'Invalid user ID format'}), 400

        user = db.session.get(User, uuid.UUID(user_id))
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404

        # Your own profile includes your email; other users' profiles don't
        if str(user.user_id) == get_jwt_identity():
            user_data = user.to_dict()
        else:
            user_data = user.to_public_dict()

        return jsonify({
            'user': user_data
        }), 200

    except Exception as e:
        return error_response('Failed to get user', exc=e)
