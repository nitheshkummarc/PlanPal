"""
Tags: event categories and user interests.

Routes (all require a JWT; changes require the admin role):
- GET    /api/tags/        All tags, alphabetical
- POST   /api/tags/        Create (admin)
- PUT    /api/tags/<id>    Update (admin)
- DELETE /api/tags/<id>    Delete (admin); event and interest links are removed by ON DELETE CASCADE
"""

from flask import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Tag
from app.routes.auth import current_user
from app.utils.responses import error_response, success_response
from app.utils.validators import (
    MAX_TAG_NAME_LENGTH, ValidationError, get_json_body, parse_uuid, validate_hex_color,
)

tags_bp = Blueprint('tags', __name__)

DUPLICATE_TAG_MESSAGE = 'Tag already exists'


def _require_admin():
    """The role is read from the database, so demoting an admin takes effect immediately."""
    if current_user().role != 'admin':
        return error_response('Admin access required', 403)
    return None


def _get_tag(raw_id):
    tag_id = parse_uuid(raw_id)
    if tag_id is None:
        raise ValidationError('Invalid tag ID format')
    tag = db.session.get(Tag, tag_id)
    if tag is None:
        return None, error_response('Tag not found', 404)
    return tag, None


def _clean_tag_fields(data, partial):
    cleaned = {}
    if not partial or 'name' in data:
        name = data.get('name')
        if not isinstance(name, str) or not name.strip():
            raise ValidationError('Tag name is required')
        if len(name.strip()) > MAX_TAG_NAME_LENGTH:
            raise ValidationError(f'Tag name must be {MAX_TAG_NAME_LENGTH} characters or fewer')
        cleaned['name'] = name.strip()
    if 'description' in data:
        description = data.get('description')
        if description is not None and not isinstance(description, str):
            raise ValidationError('Tag description must be text')
        cleaned['description'] = description or None
    if 'color' in data:
        if not validate_hex_color(data.get('color')):
            raise ValidationError("Color must be a hex value like '#FF5733'")
        cleaned['color'] = data.get('color') or None
    return cleaned


def _name_taken(name, exclude_tag_id=None):
    """Tag names are unique ignoring case ('Music' and 'music' cannot both exist)."""
    query = Tag.query.filter(func.lower(Tag.name) == name.lower())
    if exclude_tag_id is not None:
        query = query.filter(Tag.tag_id != exclude_tag_id)
    return query.first() is not None


@tags_bp.route('/', methods=['GET'])
@jwt_required()
def list_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return success_response({'tags': [tag.to_dict() for tag in tags]})


@tags_bp.route('/', methods=['POST'])
@jwt_required()
def create_tag():
    error = _require_admin()
    if error:
        return error
    fields = _clean_tag_fields(get_json_body(), partial=False)
    if _name_taken(fields['name']):
        return error_response(DUPLICATE_TAG_MESSAGE, 409)

    tag = Tag(**fields)
    db.session.add(tag)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(DUPLICATE_TAG_MESSAGE, 409)
    return success_response({'message': 'Tag created successfully', 'tag': tag.to_dict()}, 201)


@tags_bp.route('/<tag_id>', methods=['PUT'])
@jwt_required()
def update_tag(tag_id):
    error = _require_admin()
    if error:
        return error
    tag, error = _get_tag(tag_id)
    if error:
        return error
    fields = _clean_tag_fields(get_json_body(), partial=True)
    if 'name' in fields and _name_taken(fields['name'], exclude_tag_id=tag.tag_id):
        return error_response(DUPLICATE_TAG_MESSAGE, 409)

    for field, value in fields.items():
        setattr(tag, field, value)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(DUPLICATE_TAG_MESSAGE, 409)
    return success_response({'message': 'Tag updated successfully', 'tag': tag.to_dict()})


@tags_bp.route('/<tag_id>', methods=['DELETE'])
@jwt_required()
def delete_tag(tag_id):
    error = _require_admin()
    if error:
        return error
    tag, error = _get_tag(tag_id)
    if error:
        return error
    db.session.delete(tag)
    db.session.commit()
    return success_response({'message': 'Tag deleted successfully'})
