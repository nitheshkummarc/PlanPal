"""
task_scheduler.py - Background Task Scheduler

Why: Runs periodic maintenance tasks in a background thread (enabled with
ENABLE_TASK_SCHEDULER=true)

Class: TaskScheduler

Methods:
- start() / stop(): Start or stop the background thread
- run_once(): Run every job once (also used by tests)
- _mark_expired_events(): Mark events that have ended as inactive (expired)
- _create_event_reminders(): One reminder per participant for events starting within 24h
- _delete_expired_revoked_tokens(): Clean up the logout denylist

Safe with several workers / restarts:
- Reminders are idempotent: a reminder is only created if that participant has
  none for that event yet, so a missed tick or a restart never skips or repeats one.
- On PostgreSQL each job takes a transaction-level advisory lock, so when several
  Gunicorn workers each run a scheduler, only one of them does the work per tick.
"""

import threading
import time
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app import db
from app.models import Event, Notification, Participation, RevokedToken
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

TICK_SECONDS = 300        # run every 5 minutes
ERROR_RETRY_SECONDS = 60  # wait 1 minute after an unexpected error
REMINDER_WINDOW = timedelta(hours=24)

# Arbitrary constant ids for pg_try_advisory_xact_lock (one per job)
LOCK_EXPIRE_EVENTS = 810001
LOCK_REMINDERS = 810002
LOCK_REVOKED_TOKENS = 810003


class TaskScheduler:
    def __init__(self):
        self.running = False
        self.thread = None
        self.app = None

    def init_app(self, app):
        self.app = app

    def start(self):
        """Start the background task scheduler"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
            self.thread.start()

    def stop(self):
        """Stop the background task scheduler"""
        self.running = False
        if self.thread:
            self.thread.join()

    def _run_scheduler(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self.run_once()
                time.sleep(TICK_SECONDS)
            except Exception as e:
                logger.error("Scheduler error: %s", e)
                time.sleep(ERROR_RETRY_SECONDS)

    def run_once(self):
        """Run every job once. Each job runs in its own transaction."""
        if not self.app:
            return
        with self.app.app_context():
            self._run_job('mark expired events', LOCK_EXPIRE_EVENTS, self._mark_expired_events)
            self._run_job('create event reminders', LOCK_REMINDERS, self._create_event_reminders)
            self._run_job('delete expired revoked tokens', LOCK_REVOKED_TOKENS, self._delete_expired_revoked_tokens)

    def _run_job(self, name, lock_id, job):
        """Run one job in a transaction; log and roll back on failure."""
        try:
            if not self._try_lock(lock_id):
                return  # another worker is running this job right now
            job()
            db.session.commit()  # also releases the advisory lock
        except Exception as e:
            db.session.rollback()
            logger.error("Error in scheduled job '%s': %s", name, e)

    @staticmethod
    def _try_lock(lock_id):
        """Take a transaction-level advisory lock on PostgreSQL (no-op elsewhere)."""
        if db.engine.dialect.name != 'postgresql':
            return True
        return bool(db.session.execute(
            text('SELECT pg_try_advisory_xact_lock(:lock_id)'), {'lock_id': lock_id}
        ).scalar())

    def _mark_expired_events(self):
        """Mark events that have already started as inactive (one UPDATE)."""
        now = datetime.now(timezone.utc)
        count = Event.query.filter(
            Event.is_active == True,
            Event.timestamp < now
        ).update({'is_active': False}, synchronize_session=False)
        if count:
            logger.info("Marked %d events as expired at %s", count, now)

    def _create_event_reminders(self):
        """Create one reminder per participant for events starting within 24 hours."""
        now = datetime.now(timezone.utc)
        upcoming_events = Event.query.filter(
            Event.is_active == True,
            Event.timestamp > now,
            Event.timestamp <= now + REMINDER_WINDOW
        ).all()

        created = 0
        for event in upcoming_events:
            # Participants who already got a reminder for this event
            already_reminded = {
                user_id for (user_id,) in db.session.query(Notification.user_id).filter(
                    Notification.event_id == event.event_id,
                    Notification.type == 'event_reminder'
                )
            }
            participants = Participation.query.filter(
                Participation.event_id == event.event_id,
                Participation.status.in_(['going', 'interested'])
            ).all()

            for participation in participants:
                if participation.user_id in already_reminded:
                    continue
                NotificationService.create_notification(
                    user_id=participation.user_id,
                    notification_type='event_reminder',
                    title='Upcoming event within 24 hours',
                    message=f"Reminder: '{event.title}' starts on "
                            f"{NotificationService.format_event_time(event)}.",
                    event_id=event.event_id
                )
                created += 1

        if created:
            logger.info("Created %d reminders at %s", created, now)

    def _delete_expired_revoked_tokens(self):
        """Revoked tokens only matter until they expire; delete older rows."""
        RevokedToken.query.filter(
            RevokedToken.expires_at < datetime.now(timezone.utc)
        ).delete(synchronize_session=False)


scheduler = TaskScheduler()
