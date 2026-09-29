"""
Background jobs, run in a daemon thread when ENABLE_TASK_SCHEDULER is set.

Jobs (every TICK_SECONDS):
- Event reminders: one per participant for events starting within 24 hours.
- Revoked-token cleanup: denylist rows are only needed until the token expires.

Safe with several workers and restarts:
- A reminder is created only if the participant has none for the event's current
  schedule, so repeated ticks never duplicate one, and moving an event to a later
  time produces a new reminder for the new time.
- On PostgreSQL each job takes a transaction-level advisory lock, so when several
  Gunicorn workers run the scheduler only one of them does the work per tick.

The thread only runs while the process is up; on hosts that sleep idle services
(e.g. Render's free tier), reminders are sent on the first tick after waking.
"""

import logging
import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app import db
from app.models import Event, Notification, Participation, RevokedToken
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

TICK_SECONDS = 300
REMINDER_WINDOW = timedelta(hours=24)

# Arbitrary constant keys for pg_try_advisory_xact_lock, one per job
LOCK_REMINDERS = 810002
LOCK_REVOKED_TOKENS = 810003


def _as_utc(value):
    return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)


class TaskScheduler:
    def __init__(self):
        self.app = None
        self.thread = None
        self._stop = threading.Event()

    def init_app(self, app):
        self.app = app

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        self._stop.clear()
        self.thread = threading.Thread(target=self._loop, name='task-scheduler', daemon=True)
        self.thread.start()

    def stop(self):
        self._stop.set()
        if self.thread:
            self.thread.join()

    def _loop(self):
        while not self._stop.is_set():
            try:
                self.run_once()
            except Exception:
                logger.exception('Scheduler tick failed')
            self._stop.wait(TICK_SECONDS)

    def run_once(self):
        """Run every job once, each in its own transaction."""
        if not self.app:
            return
        with self.app.app_context():
            self._run_job('event reminders', LOCK_REMINDERS, self.create_event_reminders)
            self._run_job('revoked token cleanup', LOCK_REVOKED_TOKENS, self.delete_expired_revoked_tokens)

    def _run_job(self, name, lock_id, job):
        try:
            if self._try_lock(lock_id):
                job()
                db.session.commit()  # also releases the advisory lock
            else:
                db.session.rollback()  # another worker holds the lock this tick
        except Exception:
            db.session.rollback()
            logger.exception("Scheduled job '%s' failed", name)

    @staticmethod
    def _try_lock(lock_id):
        """Transaction-level advisory lock on PostgreSQL; always granted elsewhere."""
        if db.engine.dialect.name != 'postgresql':
            return True
        return bool(db.session.execute(
            text('SELECT pg_try_advisory_xact_lock(:lock_id)'), {'lock_id': lock_id}
        ).scalar())

    @staticmethod
    def create_event_reminders():
        now = datetime.now(timezone.utc)
        upcoming = Event.query.filter(
            Event.timestamp > now,
            Event.timestamp <= now + REMINDER_WINDOW,
        ).all()

        created = 0
        for event in upcoming:
            # Reminders created before this window belong to an earlier schedule
            window_start = _as_utc(event.timestamp) - REMINDER_WINDOW
            already_reminded = db.select(Notification.user_id).where(
                Notification.event_id == event.event_id,
                Notification.type == 'event_reminder',
                Notification.created_at >= window_start,
            )
            user_ids = db.session.scalars(
                db.select(Participation.user_id).where(
                    Participation.event_id == event.event_id,
                    Participation.user_id.not_in(already_reminded),
                )
            ).all()
            for user_id in user_ids:
                NotificationService.notify_event_reminder(event, user_id)
            created += len(user_ids)

        if created:
            logger.info('Created %d event reminders', created)

    @staticmethod
    def delete_expired_revoked_tokens():
        RevokedToken.query.filter(
            RevokedToken.expires_at < datetime.now(timezone.utc)
        ).delete(synchronize_session=False)


scheduler = TaskScheduler()
