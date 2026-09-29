"""
The current user's notifications. Notifications are created by the application
(see NotificationService and the task scheduler), never directly by clients.

Routes (all require a JWT and only touch the caller's own notifications):
- GET    /api/notifications/                 List, newest first. Query: filter=all|unread|read, page, per_page
- GET    /api/notifications/unread_count     Unread count for the badge
- PUT    /api/notifications/<id>/mark-read   Mark one as read
- PUT    /api/notifications/<id>/mark-unread Mark one as unread
- PUT    /api/notifications/mark-all-read    Mark all as read
- DELETE /api/notifications/<id>             Delete one
- DELETE /api/notifications/                 Delete all
"""

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import Notification
from app.utils.query_params import choice_arg, page_args, paginate
from app.utils.responses import error_response, success_response
from app.utils.validators import ValidationError, parse_uuid

notifications_bp = Blueprint('notifications', __name__)

FILTERS = ('all', 'unread', 'read')


def _user_id():
    return parse_uuid(get_jwt_identity())


def _unread_count(user_id):
    return Notification.query.filter_by(user_id=user_id, is_read=False).count()


def _get_own_notification(raw_id):
    """Returns (notification, error_response)."""
    notification_id = parse_uuid(raw_id)
    if notification_id is None:
        raise ValidationError('Invalid notification ID format')
    notification = db.session.get(Notification, notification_id)
    if notification is None:
        return None, error_response('Notification not found', 404)
    if notification.user_id != _user_id():
        return None, error_response('You can only access your own notifications', 403)
    return notification, None


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = _user_id()
    page, per_page = page_args(default_per_page=20)
    selected = choice_arg('filter', FILTERS, 'all')

    query = Notification.query.filter_by(user_id=user_id)
    if selected != 'all':
        query = query.filter_by(is_read=(selected == 'read'))
    query = query.order_by(Notification.created_at.desc(), Notification.notification_id)

    notifications, pagination = paginate(query, page, per_page)
    return success_response({
        'notifications': [notification.to_dict() for notification in notifications],
        'pagination': pagination,
        'unread_count': _unread_count(user_id),
    })


@notifications_bp.route('/unread_count', methods=['GET'])
@jwt_required()
def get_unread_count():
    return success_response({'unread_count': _unread_count(_user_id())})


def _set_read(raw_id, is_read):
    notification, error = _get_own_notification(raw_id)
    if error:
        return error
    notification.is_read = is_read
    db.session.commit()
    return success_response({
        'message': f"Notification marked as {'read' if is_read else 'unread'}",
        'notification': notification.to_dict(),
    })


@notifications_bp.route('/<notification_id>/mark-read', methods=['PUT'])
@jwt_required()
def mark_read(notification_id):
    return _set_read(notification_id, True)


@notifications_bp.route('/<notification_id>/mark-unread', methods=['PUT'])
@jwt_required()
def mark_unread(notification_id):
    return _set_read(notification_id, False)


@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_read():
    updated = Notification.query.filter_by(user_id=_user_id(), is_read=False).update(
        {'is_read': True}, synchronize_session=False,
    )
    db.session.commit()
    return success_response({'message': 'All notifications marked as read', 'updated_count': updated})


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    notification, error = _get_own_notification(notification_id)
    if error:
        return error
    db.session.delete(notification)
    db.session.commit()
    return success_response({'message': 'Notification deleted successfully'})


@notifications_bp.route('/', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    deleted = Notification.query.filter_by(user_id=_user_id()).delete(synchronize_session=False)
    db.session.commit()
    return success_response({'message': 'All notifications deleted successfully', 'deleted_count': deleted})
