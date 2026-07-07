"""
tags.py - Tag Management Routes

Why: Handles tag CRUD for categorizing events and user interests

Routes/Functions:
- get_all_tags(): GET /api/tags/ - List all tags
- create_tag(): POST /api/tags/ - Create tag (admin only, JWT required)
- update_tag(): PUT /api/tags/<id> - Update tag (admin only, JWT required)
- delete_tag(): DELETE /api/tags/<id> - Delete tag (admin only, JWT required)
- get_popular_tags(): GET /api/tags/popular - Most used tags
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Tag, User, UserTag, EventTag
from app.utils.validators import validate_uuid
from app.utils.responses import error_response
from datetime import datetime

tags_bp = Blueprint('tags', __name__)

@tags_bp.route('/', methods=['GET'])
def get_all_tags():
    """Get all available tags"""
    try:
        tags = Tag.query.order_by(Tag.name.asc()).all()
        
        return jsonify({
            'tags': [tag.to_dict() for tag in tags]
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch tags', exc=e)

@tags_bp.route('/search', methods=['GET'])
def search_tags():
    """Search tags by name or description"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        tags = Tag.query.filter(
            db.or_(
                Tag.name.ilike(f'%{query}%'),
                Tag.description.ilike(f'%{query}%')
            )
        ).order_by(Tag.name.asc()).limit(20).all()

        return jsonify({
            'tags': [tag.to_dict() for tag in tags]
        }), 200

    except Exception as e:
        return error_response('Failed to search tags', exc=e)

@tags_bp.route('/', methods=['POST'])
@jwt_required()
def create_tag():
    """Create a new tag (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Tag name is required'}), 400
        
        # Check if tag already exists
        existing_tag = Tag.query.filter_by(name=data['name']).first()
        if existing_tag:
            return jsonify({'error': 'Tag already exists'}), 400
        
        # Create tag
        tag = Tag(
            name=data['name'],
            description=data.get('description'),
            color=data.get('color')
        )
        
        db.session.add(tag)
        db.session.commit()
        
        return jsonify({
            'message': 'Tag created successfully',
            'tag': tag.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to create tag', exc=e)

@tags_bp.route('/<tag_id>', methods=['GET'])
def get_tag(tag_id):
    """Get tag details"""
    try:
        if not validate_uuid(tag_id):
            return jsonify({'error': 'Invalid tag ID format'}), 400

        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({'error': 'Tag not found'}), 404

        return jsonify({
            'tag': tag.to_dict()
        }), 200

    except Exception as e:
        return error_response('Failed to fetch tag', exc=e)

@tags_bp.route('/<tag_id>', methods=['PUT'])
@jwt_required()
def update_tag(tag_id):
    """Update a tag (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({'error': 'Tag not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            # Check if name is taken by another tag
            existing_tag = Tag.query.filter(Tag.name == data['name'], Tag.tag_id != tag_id).first()
            if existing_tag:
                return jsonify({'error': 'Tag name already exists'}), 400
            tag.name = data['name']
        
        if 'description' in data:
            tag.description = data['description']
        
        if 'color' in data:
            tag.color = data['color']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tag updated successfully',
            'tag': tag.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update tag', exc=e)

@tags_bp.route('/<tag_id>', methods=['DELETE'])
@jwt_required()
def delete_tag(tag_id):
    """Delete a tag (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        tag = Tag.query.get(tag_id)
        if not tag:
            return jsonify({'error': 'Tag not found'}), 404
        
        # Delete associated relationships first
        UserTag.query.filter_by(tag_id=tag_id).delete()
        EventTag.query.filter_by(tag_id=tag_id).delete()
        
        # Delete the tag
        db.session.delete(tag)
        db.session.commit()
        
        return jsonify({
            'message': 'Tag deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to delete tag', exc=e)

@tags_bp.route('/popular', methods=['GET'])
def get_popular_tags():
    """Get most used tags"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # Get tags with most usage (both user and event tags)
        popular_tags = db.session.query(
            Tag,
            (db.func.count(UserTag.tag_id) + db.func.count(EventTag.tag_id)).label('usage_count')
        ).outerjoin(
            UserTag, Tag.tag_id == UserTag.tag_id
        ).outerjoin(
            EventTag, Tag.tag_id == EventTag.tag_id
        ).group_by(Tag.tag_id).order_by(
            db.desc('usage_count')
        ).limit(limit).all()
        
        return jsonify({
            'tags': [
                {
                    **tag.to_dict(),
                    'usage_count': usage_count
                }
                for tag, usage_count in popular_tags
            ]
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch popular tags', exc=e)
