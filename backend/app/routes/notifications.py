"""
notifications.py - Notification Management Routes

Why: Lets users list and manage their own notifications

Routes/Functions:
- get_notifications(): GET /api/notifications/ - List user notifications (JWT required)
- create_notification(): POST /api/notifications/ - Create notification for yourself (JWT required)
- mark_notification_read(): PUT /api/notifications/<id>/mark-read - Mark as read (JWT required)
- mark_notification_unread(): PUT /api/notifications/<id>/mark-unread - Mark as unread (JWT required)
- mark_all_notifications_read(): PUT /api/notifications/mark-all-read - Mark all read (JWT required)
- delete_notification(): DELETE /api/notifications/<id> - Delete one (JWT required)
- delete_all_notifications(): DELETE /api/notifications/ - Delete all (JWT required)
- get_notification_types(): GET /api/notifications/types - List types (JWT required)
- get_unread_count(): GET /api/notifications/unread_count - Get unread count (JWT required)
- send_test_notification(): POST /api/notifications/test - Send test (JWT required)

Every route only touches the current user's notifications (user id from the JWT).
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification, Event
from app.utils.responses import error_response
from app.utils.validators import get_json_body, validate_uuid
import uuid as _uuid

notifications_bp = Blueprint('notifications', __name__)

MAX_PER_PAGE = 100

# Types created by the app (see NotificationService and the task scheduler)
NOTIFICATION_TYPES = [
    'welcome',
    'event_joined',
    'event_reminder',
    'event_update',
    'new_participant',
    'participant_left',
    'event_cancelled',
    'system_announcement'
]


def _current_user_uuid():
    return _uuid.UUID(get_jwt_identity())


def _get_own_notification(notification_id):
    """Look up one of the current user's notifications.

    Returns (notification, None) or (None, error_response_tuple).
    """
    if not validate_uuid(notification_id):
        return None, (jsonify({'error': 'Invalid notification ID format'}), 400)
    notification = db.session.get(Notification, _uuid.UUID(notification_id))
    if not notification:
        return None, (jsonify({'error': 'Notification not found'}), 404)
    # Verify ownership
    if str(notification.user_id) != get_jwt_identity():
        return None, (jsonify({'error': 'Unauthorized'}), 403)
    return notification, None


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_uuid = _current_user_uuid()

        # Get pagination parameters (clamped like the events endpoints)
        page = max(request.args.get('page', 1, type=int) or 1, 1)
        per_page = request.args.get('per_page', request.args.get('limit', 20), type=int) or 20
        per_page = min(max(per_page, 1), MAX_PER_PAGE)

        # Support both legacy and new filter semantics
        filter_value = request.args.get('filter', '').strip().lower()
        unread_only = request.args.get('unread_only', 'false').lower() == 'true' or filter_value == 'unread'
        read_only = filter_value == 'read'

        # Build query
        query = Notification.query.filter_by(user_id=user_uuid)

        if unread_only:
            query = query.filter_by(is_read=False)
        elif read_only:
            query = query.filter_by(is_read=True)

        # Order by creation time (newest first)
        query = query.order_by(Notification.created_at.desc())

        # Paginate results
        notifications = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications.items],
            'pagination': {
                'page': notifications.page,
                'pages': notifications.pages,
                'per_page': notifications.per_page,
                'total': notifications.total
            },
            # Total unread across all pages (for badges)
            'unread_count': Notification.query.filter_by(
                user_id=user_uuid,
                is_read=False
            ).count()
        }), 200

    except Exception as e:
        return error_response('Failed to fetch notifications', exc=e)

@notifications_bp.route('/', methods=['POST'])
@jwt_required()
def create_notification():
    """Create a notification for the current user (user_id in the body is ignored)."""
    try:
        user_uuid = _current_user_uuid()
        data = get_json_body()

        # Validate required fields
        required_fields = ['type', 'title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Validate event exists if provided
        event_id = None
        if data.get('event_id'):
            if not validate_uuid(data['event_id']):
                return jsonify({'error': 'Invalid event ID format'}), 400
            event_id = _uuid.UUID(str(data['event_id']))
            if not db.session.get(Event, event_id):
                return jsonify({'error': 'Event not found'}), 404

        # Create notification
        notification = Notification(
            user_id=user_uuid,
            event_id=event_id,
            type=data['type'],
            title=data['title'],
            message=data['message']
        )

        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': 'Notification created successfully',
            'notification': notification.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to create notification', exc=e)

@notifications_bp.route('/<notification_id>/mark-read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        notification, error = _get_own_notification(notification_id)
        if error:
            return error

        # Mark as read
        notification.is_read = True
        db.session.commit()

        return jsonify({
            'message': 'Notification marked as read',
            'notification': notification.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to mark notification as read', exc=e)

@notifications_bp.route('/<notification_id>/mark-unread', methods=['PUT'])
@jwt_required()
def mark_notification_unread(notification_id):
    try:
        notification, error = _get_own_notification(notification_id)
        if error:
            return error

        # Mark as unread
        notification.is_read = False
        db.session.commit()

        return jsonify({
            'message': 'Notification marked as unread',
            'notification': notification.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to mark notification as unread', exc=e)

@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    try:
        # Mark all unread notifications as read
        Notification.query.filter_by(
            user_id=_current_user_uuid(),
            is_read=False
        ).update({'is_read': True})

        db.session.commit()

        return jsonify({
            'message': 'All notifications marked as read'
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to mark all notifications as read', exc=e)

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    try:
        notification, error = _get_own_notification(notification_id)
        if error:
            return error

        # Delete notification
        db.session.delete(notification)
        db.session.commit()

        return jsonify({
            'message': 'Notification deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to delete notification', exc=e)

@notifications_bp.route('/', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    """Delete all notifications for current user"""
    try:
        # Delete all notifications for the user
        deleted_count = Notification.query.filter_by(user_id=_current_user_uuid()).delete()
        db.session.commit()

        return jsonify({
            'message': 'All notifications deleted successfully',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to delete all notifications', exc=e)

@notifications_bp.route('/types', methods=['GET'])
@jwt_required()
def get_notification_types():
    """Get available notification types"""
    return jsonify({
        'types': NOTIFICATION_TYPES
    }), 200

@notifications_bp.route('/unread_count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for badge display"""
    try:
        unread_count = Notification.query.filter_by(
            user_id=_current_user_uuid(),
            is_read=False
        ).count()

        return jsonify({
            'unread_count': unread_count
        }), 200

    except Exception as e:
        return error_response('Failed to get unread count', exc=e)

@notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def send_test_notification():
    """Send a test notification to the current user"""
    try:
        # Create test notification
        notification = Notification(
            user_id=_current_user_uuid(),
            type='system_announcement',
            title='Test Notification',
            message='This is a test notification to verify the system is working correctly.'
        )

        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': 'Test notification sent successfully',
            'notification': notification.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return error_response('Failed to send test notification', exc=e)
