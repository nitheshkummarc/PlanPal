"""
notification_service.py - Notification Business Logic Service

Why: Creates and sends notifications to users for various event activities

Methods/Functions (all static):
- create_notification(): Create single notification for user
- notify_event_participants(): Send notification to all event participants
- notify_new_participant(): Notify event creator when someone joins
- notify_user_joined_event(): Confirm to user they joined event
- notify_participant_left(): Notify creator when someone leaves
- notify_event_update(): Notify participants about event changes
- notify_event_reminder(): Send reminder before event (hours_before parameter)
- notify_event_cancelled(): Notify all about cancellation
- clean_old_notifications(): Delete old read notifications (30+ days)
"""

from app import db
from app.models import Notification, User, Event
from datetime import datetime, timedelta, timezone
import logging

class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    def create_notification(user_id, notification_type, title, message, event_id=None):
        """Create a new notification for a user"""
        try:
            notification = Notification(
                user_id=user_id,
                event_id=event_id,
                type=notification_type,
                title=title,
                message=message
            )
            db.session.add(notification)
            db.session.commit()
            return notification
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error creating notification: {str(e)}")
            return None
    
    @staticmethod
    def notify_event_participants(event, notification_type, title, message, exclude_creator=False):
        """Send notification to all participants of an event"""
        try:
            participants = event.participations
            created_count = 0
            
            for participation in participants:
                # Skip event creator if requested
                if exclude_creator and participation.user_id == event.posted_by:
                    continue
                    
                notification = NotificationService.create_notification(
                    user_id=participation.user_id,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    event_id=event.event_id
                )
                if notification:
                    created_count += 1
            
            return created_count
        except Exception as e:
            logging.error(f"Error notifying event participants: {str(e)}")
            return 0
    
    @staticmethod
    def notify_new_participant(event, new_participant):
        """Notify event creator about new participant"""
        try:
            if str(event.posted_by) == str(new_participant.user_id):
                return  # Don't notify creator about themselves
                
            title = f"New participant joined your event"
            message = f"{new_participant.user.name} has joined your event '{event.title}'"
            
            return NotificationService.create_notification(
                user_id=event.posted_by,
                notification_type='new_participant',
                title=title,
                message=message,
                event_id=event.event_id
            )
        except Exception as e:
            logging.error(f"Error creating new participant notification: {str(e)}")
            return None
    
    @staticmethod
    def notify_user_joined_event(event, user):
        """Notify user that they successfully joined an event"""
        try:
            title = f"Successfully joined event"
            message = f"You have successfully joined '{event.title}' scheduled for {event.timestamp.strftime('%B %d, %Y at %I:%M %p')}."
            
            return NotificationService.create_notification(
                user_id=user.user_id,
                notification_type='event_joined',
                title=title,
                message=message,
                event_id=event.event_id
            )
        except Exception as e:
            logging.error(f"Error creating user joined event notification: {str(e)}")
            return None
    
    @staticmethod
    def notify_participant_left(event, left_participant):
        """Notify event creator about participant leaving"""
        try:
            if str(event.posted_by) == str(left_participant.user_id):
                return  # Don't notify creator about themselves
                
            title = f"Participant left your event"
            message = f"{left_participant.user.name} has left your event '{event.title}'"
            
            return NotificationService.create_notification(
                user_id=event.posted_by,
                notification_type='participant_left',
                title=title,
                message=message,
                event_id=event.event_id
            )
        except Exception as e:
            logging.error(f"Error creating participant left notification: {str(e)}")
            return None
    
    @staticmethod
    def notify_event_update(event):
        """Notify all participants about event updates"""
        try:
            title = f"Event Updated: {event.title}"
            message = f"The event '{event.title}' has been updated. Check the latest details!"
            
            return NotificationService.notify_event_participants(
                event=event,
                notification_type='event_update',
                title=title,
                message=message,
                exclude_creator=True
            )
        except Exception as e:
            logging.error(f"Error creating event update notification: {str(e)}")
            return 0
    
    @staticmethod
    def notify_event_reminder(event, hours_before=24):
        """Create event reminder notifications"""
        try:
            title = f"Event Reminder: {event.title}"
            message = f"Don't forget! Your event '{event.title}' starts in {hours_before} hours at {event.place}."
            
            return NotificationService.notify_event_participants(
                event=event,
                notification_type='event_reminder',
                title=title,
                message=message,
                exclude_creator=False
            )
        except Exception as e:
            logging.error(f"Error creating event reminder notification: {str(e)}")
            return 0
    
    @staticmethod
    def notify_event_cancelled(event):
        """Notify all participants about event cancellation"""
        try:
            title = f"Event Cancelled: {event.title}"
            message = f"Unfortunately, the event '{event.title}' scheduled for {event.timestamp.strftime('%B %d, %Y')} has been cancelled."
            
            return NotificationService.notify_event_participants(
                event=event,
                notification_type='event_cancelled',
                title=title,
                message=message,
                exclude_creator=False
            )
        except Exception as e:
            logging.error(f"Error creating event cancellation notification: {str(e)}")
            return 0
    
    @staticmethod
    def clean_old_notifications(days_old=30):
        """Clean up old read notifications"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
            old_notifications = Notification.query.filter(
                Notification.is_read == True,
                Notification.created_at < cutoff_date
            ).all()
            
            count = len(old_notifications)
            for notification in old_notifications:
                db.session.delete(notification)
            
            db.session.commit()
            return count
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error cleaning old notifications: {str(e)}")
            return 0
