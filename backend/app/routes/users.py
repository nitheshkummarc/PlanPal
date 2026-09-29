"""
User profiles.

Routes:
- GET /api/users/<id>   A user's profile (JWT required). The email address is only
                        included when viewing your own profile.

The current user's own account is managed under /api/auth/profile.
"""

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import User
from app.utils.responses import error_response, success_response
from app.utils.validators import ValidationError, parse_uuid

users_bp = Blueprint('users', __name__)


@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    parsed_id = parse_uuid(user_id)
    if parsed_id is None:
        raise ValidationError('Invalid user ID format')

    user = db.session.get(User, parsed_id)
    if user is None or not user.is_active:
        return error_response('User not found', 404)

    is_self = str(user.user_id) == get_jwt_identity()
    return success_response({'user': user.to_dict() if is_self else user.to_public_dict()})
