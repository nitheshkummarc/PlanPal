"""
tags.py - Tag Management Routes

Why: Handles tag CRUD for categorizing events and user interests

Routes/Functions:
- get_all_tags(): GET /api/tags/ - List all tags
- search_tags(): GET /api/tags/search?q= - Search tags by name/description
- get_popular_tags(): GET /api/tags/popular - Most used tags
- get_tag(): GET /api/tags/<id> - Tag details
- create_tag(): POST /api/tags/ - Create tag (admin only, JWT required)
- update_tag(): PUT /api/tags/<id> - Update tag (admin only, JWT required)
- delete_tag(): DELETE /api/tags/<id> - Delete tag (admin only, JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import Tag, User, UserTag, EventTag
from app.utils.validators import get_json_body, validate_uuid, validate_hex_color, like_pattern
from app.utils.responses import error_response
import uuid

tags_bp = Blueprint('tags', __name__)

MAX_TAG_NAME_LENGTH = 50


def _require_admin():
    """Return an error response tuple unless the current user is an admin.

    The role is read from the database (not the token), so demoting an admin
    takes effect immediately.
    """
    user = db.session.get(User, uuid.UUID(get_jwt_identity()))
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return None


def _validate_tag_fields(data, require_name):
    """Return an error message for invalid tag fields, or None."""
    if require_name or 'name' in data:
        name = data.get('name')
        if not isinstance(name, str) or not name.strip():
            return 'Tag name is required'
        if len(name.strip()) > MAX_TAG_NAME_LENGTH:
            return f'Tag name must be {MAX_TAG_NAME_LENGTH} characters or fewer'
    if 'color' in data and not validate_hex_color(data.get('color')):
        return "Color must be a hex value like '#FF5733'"
    return None


def _tag_name_taken(name, exclude_tag_id=None):
    """Tag names are unique case-insensitively ('Music' and 'music' can't both exist)."""
    query = Tag.query.filter(func.lower(Tag.name) == name.strip().lower())
    if exclude_tag_id is not None:
        query = query.filter(Tag.tag_id != exclude_tag_id)
    return query.first() is not None


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
        query = request.args.get('q', '').strip()[:100]
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        pattern = like_pattern(query)
        tags = Tag.query.filter(
            db.or_(
                Tag.name.ilike(pattern, escape='\\'),
                Tag.description.ilike(pattern, escape='\\')
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
        error = _require_admin()
        if error:
            return error

        data = get_json_body()

        # Validate fields
        message = _validate_tag_fields(data, require_name=True)
        if message:
            return jsonify({'error': message}), 400

        # Check if tag already exists
        if _tag_name_taken(data['name']):
            return jsonify({'error': 'Tag already exists'}), 400

        # Create tag
        tag = Tag(
            name=data['name'].strip(),
            description=data.get('description'),
            color=data.get('color') or None
        )

        db.session.add(tag)
        db.session.commit()

        return jsonify({
            'message': 'Tag created successfully',
            'tag': tag.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Tag already exists'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to create tag', exc=e)

@tags_bp.route('/<tag_id>', methods=['GET'])
def get_tag(tag_id):
    """Get tag details"""
    try:
        if not validate_uuid(tag_id):
            return jsonify({'error': 'Invalid tag ID format'}), 400
        tag_id = uuid.UUID(tag_id)

        tag = db.session.get(Tag, tag_id)
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
        if not validate_uuid(tag_id):
            return jsonify({'error': 'Invalid tag ID format'}), 400
        tag_id = uuid.UUID(tag_id)

        error = _require_admin()
        if error:
            return error

        tag = db.session.get(Tag, tag_id)
        if not tag:
            return jsonify({'error': 'Tag not found'}), 404

        data = get_json_body()

        # Validate before changing anything
        message = _validate_tag_fields(data, require_name=False)
        if message:
            return jsonify({'error': message}), 400
        if 'name' in data and _tag_name_taken(data['name'], exclude_tag_id=tag_id):
            return jsonify({'error': 'Tag name already exists'}), 400

        # Update allowed fields
        if 'name' in data:
            tag.name = data['name'].strip()
        if 'description' in data:
            tag.description = data['description']
        if 'color' in data:
            tag.color = data['color'] or None

        db.session.commit()

        return jsonify({
            'message': 'Tag updated successfully',
            'tag': tag.to_dict()
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Tag name already exists'}), 400
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to update tag', exc=e)

@tags_bp.route('/<tag_id>', methods=['DELETE'])
@jwt_required()
def delete_tag(tag_id):
    """Delete a tag (admin only)"""
    try:
        if not validate_uuid(tag_id):
            return jsonify({'error': 'Invalid tag ID format'}), 400
        tag_id = uuid.UUID(tag_id)

        error = _require_admin()
        if error:
            return error

        tag = db.session.get(Tag, tag_id)
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
        limit = min(max(request.args.get('limit', 10, type=int) or 10, 1), 100)

        # Count user links and event links separately, then add them.
        # (Outer-joining both tables at once multiplies rows: u*e instead of u+e.)
        user_counts = db.session.query(
            UserTag.tag_id, db.func.count().label('n')
        ).group_by(UserTag.tag_id).subquery()
        event_counts = db.session.query(
            EventTag.tag_id, db.func.count().label('n')
        ).group_by(EventTag.tag_id).subquery()
        usage_count = (
            db.func.coalesce(user_counts.c.n, 0) + db.func.coalesce(event_counts.c.n, 0)
        ).label('usage_count')

        popular_tags = db.session.query(Tag, usage_count).outerjoin(
            user_counts, Tag.tag_id == user_counts.c.tag_id
        ).outerjoin(
            event_counts, Tag.tag_id == event_counts.c.tag_id
        ).order_by(
            db.desc('usage_count'), Tag.name.asc()
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
