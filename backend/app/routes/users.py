"""
users.py - User Profile and Search Routes

Why: Handles user profile viewing and user search

Routes/Functions:
- get_profile(): GET /api/users/profile - Get current user profile (JWT required)
- search_users(): GET /api/users/search - Search users by name/email (JWT required)
- get_user(): GET /api/users/<user_id> - Get user's public profile (JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.utils.validators import sanitize_search_query, validate_uuid
from app.utils.responses import error_response
from datetime import datetime

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
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
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        # SECURITY: Sanitize search query
        query = sanitize_search_query(query)
        if len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search users by name or email
        users = User.query.filter(
            db.or_(
                User.name.ilike(f'%{query}%'),
                User.email.ilike(f'%{query}%')
            ),
            User.is_active == True
        ).limit(20).all()
        
        return jsonify({
            'users': [user.to_dict() for user in users]
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
        
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's public information only
        user_data = user.to_dict()
        # SECURITY: Remove sensitive information for other users
        current_user_id = get_jwt_identity()
        if str(user.user_id) != current_user_id:
            user_data.pop('email', None)
        
        return jsonify({
            'user': user_data
        }), 200
        
    except Exception as e:
        return error_response('Failed to get user', exc=e)
