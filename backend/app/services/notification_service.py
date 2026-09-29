"""
Notification creation.

These helpers only add rows to the current session and never commit: the calling
route commits once, so a notification is saved atomically with the change that
caused it (join, leave, update, delete).
"""

from datetime import timezone

from app import db
from app.models import Notification


class NotificationService:

    @staticmethod
    def format_event_time(event):
        """e.g. 'September 30, 2026 at 12:30 PM UTC'. Notifications are plain text, so the zone is stated."""
        timestamp = event.timestamp
        if timestamp.tzinfo is not None:
            timestamp = timestamp.astimezone(timezone.utc)
        return timestamp.strftime('%B %d, %Y at %I:%M %p') + ' UTC'

    @staticmethod
    def create_notification(user_id, notification_type, title, message, event_id=None):
        notification = Notification(
            user_id=user_id,
            event_id=event_id,
            type=notification_type,
            title=title,
            message=message,
        )
        db.session.add(notification)
        return notification

    @staticmethod
    def notify_participants(event, notification_type, title, message):
        """Notify every participant except the organiser. Returns the number of notifications."""
        count = 0
        for participation in event.participations:
            if participation.user_id == event.posted_by:
                continue
            NotificationService.create_notification(
                participation.user_id, notification_type, title, message, event.event_id,
            )
            count += 1
        return count

    @staticmethod
    def notify_welcome(user):
        return NotificationService.create_notification(
            user.user_id, 'welcome', 'Welcome to PlanPal!',
            f'Welcome to PlanPal, {user.name}! Start exploring events and connecting with people who share your interests.',
        )

    @staticmethod
    def notify_new_participant(event, user):
        """Tell the organiser that someone joined."""
        if user.user_id == event.posted_by:
            return None
        return NotificationService.create_notification(
            event.posted_by, 'new_participant', 'New participant joined your event',
            f"{user.name} has joined your event '{event.title}'", event.event_id,
        )

    @staticmethod
    def notify_user_joined_event(event, user):
        """Confirm the join to the participant."""
        return NotificationService.create_notification(
            user.user_id, 'event_joined', 'Successfully joined event',
            f"You have joined '{event.title}' scheduled for {NotificationService.format_event_time(event)}.",
            event.event_id,
        )

    @staticmethod
    def notify_participant_left(event, user):
        """Tell the organiser that someone left."""
        if user.user_id == event.posted_by:
            return None
        return NotificationService.create_notification(
            event.posted_by, 'participant_left', 'Participant left your event',
            f"{user.name} has left your event '{event.title}'", event.event_id,
        )

    @staticmethod
    def notify_event_update(event):
        return NotificationService.notify_participants(
            event, 'event_update', f'Event updated: {event.title}',
            f"The event '{event.title}' has been updated. Check the latest details.",
        )

    @staticmethod
    def notify_event_cancelled(event):
        return NotificationService.notify_participants(
            event, 'event_cancelled', f'Event cancelled: {event.title}',
            f"The event '{event.title}' scheduled for {NotificationService.format_event_time(event)} has been cancelled.",
        )

    @staticmethod
    def notify_event_reminder(event, user_id):
        return NotificationService.create_notification(
            user_id, 'event_reminder', 'Upcoming event within 24 hours',
            f"Reminder: '{event.title}' starts on {NotificationService.format_event_time(event)}.",
            event.event_id,
        )
