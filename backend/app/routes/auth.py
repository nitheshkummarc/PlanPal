"""
auth.py - Authentication Routes

Why: Handles user registration, login, logout, and profile management

Routes/Functions:
- register(): POST /api/auth/register - Create new user account
- login(): POST /api/auth/login - Authenticate user with email/password
- logout(): POST /api/auth/logout - End user session
- refresh(): POST /api/auth/refresh - Get new access token
- get_profile(): GET /api/auth/profile - Get current user data (JWT required)
- update_profile(): PUT /api/auth/profile - Update user info (JWT required)
- change_password(): POST /api/auth/change-password - Change password (JWT required)
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app import db, bcrypt
from app.models import User
from app.utils.validators import validate_email, validate_password, validate_name, validate_text_length
from app.utils.responses import error_response
from app.utils.supabase_client import supabase_client
from app.services.notification_service import NotificationService
from datetime import datetime
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user account.
    
    Request Body:
        name (str): User's full name
        email (str): Valid email address
        username (str): Unique username
        password (str): Strong password (8+ chars, upper, lower, number, special)
        bio (str, optional): User biography
        profile_image_url (str, optional): URL to profile picture
        preferences (list, optional): Array of user interests/tags
    
    Returns:
        201: User created successfully with JWT tokens
        400: Validation error or duplicate email/username
        500: Server error
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'username', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # SECURITY: Enhanced validation
        if not validate_name(data['name']):
            return jsonify({'error': 'Invalid name format or length'}), 400
        
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        if not validate_password(data['password']):
            return jsonify({'error': 'Password must be 8-128 characters with uppercase, lowercase, number, and special character'}), 400
        
        # SECURITY: Validate preferences if provided
        preferences = data.get('preferences', [])
        if preferences and not isinstance(preferences, list):
            return jsonify({'error': 'Preferences must be an array'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Email already registered'}), 400
            
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Create new user
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        user = User(
            name=data['name'],
            email=data['email'].lower(),
            username=data['username'],
            password_hash=password_hash,
            bio=data.get('bio'),
            profile_image_url=data.get('profile_image_url'),
            preferences=data.get('preferences', [])
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create welcome notification for new user
        NotificationService.create_notification(
            user_id=user.user_id,
            notification_type='welcome',
            title='Welcome to PlanPal!',
            message=f'Welcome to PlanPal, {user.name}! Start exploring events and connecting with like-minded people.'
        )
        
        # Create tokens
        access_token = create_access_token(identity=str(user.user_id))
        refresh_token = create_refresh_token(identity=str(user.user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error_response('Registration failed', exc=e)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=data['email'].lower()).first()
        
        if not user or not bcrypt.check_password_hash(user.password_hash, data['password']):
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
    try:
        jti = get_jwt()['jti']
        current_user_id = get_jwt_identity()
        
        # Note: Token blacklisting removed for simplicity
        
        return jsonify({'message': 'Successfully logged out'}), 200
        
    except Exception as e:
        return error_response('Logout failed', exc=e)

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
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
        user = User.query.get(current_user_id)
        
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
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name']
        if 'username' in data:
            # Check if username is already taken by another user
            existing_user = User.query.filter_by(username=data['username']).first()
            if existing_user and str(existing_user.user_id) != current_user_id:
                return jsonify({'error': 'Username already taken'}), 400
            user.username = data['username']
        if 'bio' in data:
            user.bio = data['bio']
        if 'profile_image_url' in data:
            user.profile_image_url = data['profile_image_url']
        if 'preferences' in data:
            user.preferences = data['preferences']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update profile', exc=e)

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Verify current password
        if not bcrypt.check_password_hash(user.password_hash, data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        if not validate_password(data['new_password']):
            return jsonify({'error': 'Password must be 8-128 characters with uppercase, lowercase, number, and special character'}), 400
        
        # Update password
        user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        db.session.commit()
        
        return jsonify({
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to change password', exc=e)
