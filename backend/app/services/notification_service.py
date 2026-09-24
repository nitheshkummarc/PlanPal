"""
notification_service.py - Notification Business Logic Service

Why: Creates notifications for event activity in one consistent way

Transaction rule: these helpers only ADD notifications to the current session;
they never commit. The calling route commits once, so a notification is saved
atomically with the change that triggered it (join, leave, update, delete...).

Methods/Functions (all static):
- create_notification(): Add a single notification for a user
- notify_event_participants(): Notify all participants of an event
- notify_new_participant(): Notify event creator when someone joins
- notify_user_joined_event(): Confirm to user they joined event
- notify_participant_left(): Notify creator when someone leaves
- notify_event_update(): Notify participants about event changes
- notify_event_cancelled(): Notify participants that the event was deleted
- format_event_time(): Event time as text (times are stored and shown in UTC)
"""

from app import db
from app.models import Notification


class NotificationService:
    """Service for creating notifications"""

    @staticmethod
    def format_event_time(event):
        """e.g. 'September 30, 2026 at 12:30 PM UTC'.

        Notifications are plain text, so the timezone is stated explicitly;
        the frontend shows the event itself in the viewer's local time.
        """
        return event.timestamp.strftime('%B %d, %Y at %I:%M %p') + ' UTC'

    @staticmethod
    def create_notification(user_id, notification_type, title, message, event_id=None):
        """Add a notification to the current session.

        Does not commit: the calling route commits once, so the notification is
        saved atomically with the change that triggered it (e.g. a join).
        """
        notification = Notification(
            user_id=user_id,
            event_id=event_id,
            type=notification_type,
            title=title,
            message=message
        )
        db.session.add(notification)
        return notification

    @staticmethod
    def notify_event_participants(event, notification_type, title, message, exclude_creator=False):
        """Add a notification for every participant of an event. Returns the count."""
        created_count = 0
        for participation in event.participations:
            # Skip event creator if requested
            if exclude_creator and participation.user_id == event.posted_by:
                continue
            NotificationService.create_notification(
                user_id=participation.user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                event_id=event.event_id
            )
            created_count += 1
        return created_count

    @staticmethod
    def notify_new_participant(event, new_participant):
        """Notify event creator about new participant"""
        if str(event.posted_by) == str(new_participant.user_id):
            return None  # Don't notify creator about themselves

        return NotificationService.create_notification(
            user_id=event.posted_by,
            notification_type='new_participant',
            title='New participant joined your event',
            message=f"{new_participant.user.name} has joined your event '{event.title}'",
            event_id=event.event_id
        )

    @staticmethod
    def notify_user_joined_event(event, user):
        """Notify user that they successfully joined an event"""
        return NotificationService.create_notification(
            user_id=user.user_id,
            notification_type='event_joined',
            title='Successfully joined event',
            message=f"You have successfully joined '{event.title}' scheduled for "
                    f"{NotificationService.format_event_time(event)}.",
            event_id=event.event_id
        )

    @staticmethod
    def notify_participant_left(event, left_participant):
        """Notify event creator about participant leaving"""
        if str(event.posted_by) == str(left_participant.user_id):
            return None  # Don't notify creator about themselves

        return NotificationService.create_notification(
            user_id=event.posted_by,
            notification_type='participant_left',
            title='Participant left your event',
            message=f"{left_participant.user.name} has left your event '{event.title}'",
            event_id=event.event_id
        )

    @staticmethod
    def notify_event_update(event):
        """Notify all participants (except the creator) about event updates"""
        return NotificationService.notify_event_participants(
            event=event,
            notification_type='event_update',
            title=f'Event Updated: {event.title}',
            message=f"The event '{event.title}' has been updated. Check the latest details!",
            exclude_creator=True
        )

    @staticmethod
    def notify_event_cancelled(event):
        """Notify participants (except the creator) that the event was deleted"""
        return NotificationService.notify_event_participants(
            event=event,
            notification_type='event_cancelled',
            title=f'Event Cancelled: {event.title}',
            message=f"Unfortunately, the event '{event.title}' scheduled for "
                    f"{NotificationService.format_event_time(event)} has been cancelled.",
            exclude_creator=True
        )
