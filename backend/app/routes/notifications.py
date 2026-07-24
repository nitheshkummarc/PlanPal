"""
notifications.py - Notification Management Routes

Why: Manages user notifications and preferences

Routes/Functions:
- get_notifications(): GET /api/notifications/ - List user notifications (JWT required)
- create_notification(): POST /api/notifications/ - Create notification (JWT required)
- mark_notification_read(): PUT /api/notifications/<id>/mark-read - Mark as read (JWT required)
- mark_all_notifications_read(): PUT /api/notifications/mark-all-read - Mark all read (JWT required)
- delete_notification(): DELETE /api/notifications/<id> - Delete one (JWT required)
- delete_all_notifications(): DELETE /api/notifications/ - Delete all (JWT required)
- get_notification_types(): GET /api/notifications/types - List types (JWT required)
- get_unread_count(): GET /api/notifications/unread_count - Get unread count (JWT required)
- subscribe_push(): POST /api/notifications/push/subscribe - Subscribe push (JWT required)
- unsubscribe_push(): DELETE /api/notifications/push/unsubscribe - Unsubscribe push (JWT required)
- send_test_notification(): POST /api/notifications/test - Send test (JWT required)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification, User, Event
from app.utils.responses import error_response
from datetime import datetime
import uuid as _uuid

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        current_user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', request.args.get('limit', 20), type=int)

        # Support both legacy and new filter semantics
        filter_value = request.args.get('filter', '').strip().lower()
        unread_only = request.args.get('unread_only', 'false').lower() == 'true' or filter_value == 'unread'
        read_only = filter_value == 'read'
        
        # Build query
        query = Notification.query.filter_by(user_id=current_user_id)
        
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
            'unread_count': Notification.query.filter_by(
                user_id=current_user_id,
                is_read=False
            ).count()
        }), 200
        
    except Exception as e:
        return error_response('Failed to fetch notifications', exc=e)

@notifications_bp.route('/', methods=['POST'])
@jwt_required()
def create_notification():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['type', 'title', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate event exists if provided
        if data.get('event_id'):
            event = Event.query.get(data['event_id'])
            if not event:
                return jsonify({'error': 'Event not found'}), 404
        
        # Create notification
        notification = Notification(
            user_id=_uuid.UUID(current_user_id),
            event_id=data.get('event_id'),
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
        current_user_id = get_jwt_identity()
        
        # Get notification
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if str(notification.user_id) != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
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
        current_user_id = get_jwt_identity()

        # Get notification
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404

        # Verify ownership
        if str(notification.user_id) != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403

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
        current_user_id = get_jwt_identity()
        
        # Mark all unread notifications as read
        Notification.query.filter_by(
            user_id=current_user_id,
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
        current_user_id = get_jwt_identity()
        
        # Get notification
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if str(notification.user_id) != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
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
        current_user_id = get_jwt_identity()
        
        # Delete all notifications for the user
        deleted_count = Notification.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        
        return jsonify({
            'message': f'All notifications deleted successfully',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return error_response('Failed to delete all notifications', exc=e)

@notifications_bp.route('/types', methods=['GET'])
@jwt_required()
def get_notification_types():
    """Get available notification types"""
    types = [
        'welcome',
        'event_reminder',
        'event_update',
        'new_participant',
        'participant_left',
        'event_cancelled',
        'system_announcement'
    ]
    
    return jsonify({
        'types': types
    }), 200

@notifications_bp.route('/unread_count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for badge display"""
    try:
        current_user_id = get_jwt_identity()
        
        unread_count = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).count()
        
        return jsonify({
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        return error_response('Failed to get unread count', exc=e)

@notifications_bp.route('/push/subscribe', methods=['POST'])
@jwt_required()
def subscribe_push():
    """Subscribe to push notifications"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Store push subscription data (implement based on your push service)
        return jsonify({
            'message': 'Push notifications subscription successful'
        }), 200
        
    except Exception as e:
        return error_response('Failed to subscribe to push notifications', exc=e)

@notifications_bp.route('/push/unsubscribe', methods=['DELETE'])
@jwt_required()
def unsubscribe_push():
    """Unsubscribe from push notifications"""
    try:
        current_user_id = get_jwt_identity()
        
        # Remove push subscription data (implement based on your push service)
        return jsonify({
            'message': 'Push notifications unsubscribed successfully'
        }), 200
        
    except Exception as e:
        return error_response('Failed to unsubscribe from push notifications', exc=e)

@notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def send_test_notification():
    """Send a test notification to the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Create test notification
        notification = Notification(
            user_id=current_user_id,
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
