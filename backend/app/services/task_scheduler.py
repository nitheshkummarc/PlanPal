"""
task_scheduler.py - Background Task Scheduler

Why: Runs periodic maintenance tasks in background thread

Class: TaskScheduler

Methods:
- __init__(): Initialize scheduler
- start(): Start background thread
- stop(): Stop background thread gracefully
- _run_scheduler(): Main loop (runs every 5 minutes)
- _mark_expired_events(): Mark past events as inactive

Tasks: Marks expired events inactive every 5 minutes
"""

import threading
import time
from datetime import datetime, timezone, timedelta
from app import db
from app.models import Event, Notification, Participation
import logging

logger = logging.getLogger(__name__)

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
                # Mark expired events every 5 minutes
                self._mark_expired_events()
                # Create event reminders every 5 minutes
                self._create_event_reminders()
                # Sleep for 5 minutes
                time.sleep(300)
            except Exception as e:
                logger.error("Scheduler error: %s", e)
                time.sleep(60)  # Wait 1 minute on error
    
    def _create_event_reminders(self):
        """Create notifications for events happening exactly tomorrow"""
        try:
            if not self.app:
                return
            with self.app.app_context():
                try:
                    now = datetime.now(timezone.utc)
                    tomorrow_start = now + timedelta(days=1)
                    # Look for events starting in exactly 24 hours (within a 5 min window to match scheduler loop)
                    tomorrow_end = tomorrow_start + timedelta(minutes=5)

                    upcoming_events = Event.query.filter(
                        Event.is_active == True,
                        Event.timestamp >= tomorrow_start,
                        Event.timestamp < tomorrow_end
                    ).all()

                    notifications_created = 0
                    for event in upcoming_events:
                        # Find all users going or interested
                        participations = Participation.query.filter(
                            Participation.event_id == event.event_id,
                            Participation.status.in_(['going', 'interested'])
                        ).all()

                        for p in participations:
                            # Create a notification
                            notification = Notification(
                                user_id=p.user_id,
                                event_id=event.event_id,
                                type='event_reminder',
                                title='Upcoming Event Tomorrow!',
                                message=f"Reminder: {event.title} is happening tomorrow at {event.timestamp.strftime('%I:%M %p')}!"
                            )
                            db.session.add(notification)
                            notifications_created += 1

                    if notifications_created > 0:
                        db.session.commit()
                        logger.info("Created %d reminders at %s", notifications_created, now)
                except Exception as db_err:
                    db.session.rollback()
                    raise db_err
        except Exception as e:
            logger.error("Error creating event reminders: %s", e)

    def _mark_expired_events(self):
        """Mark all expired events as inactive"""
        try:
            if not self.app:
                return
            with self.app.app_context():
                try:
                    expired_events = Event.query.filter(
                        Event.is_active == True,
                        Event.timestamp < datetime.now(timezone.utc)
                    ).all()
                    
                    count = 0
                    for event in expired_events:
                        event.is_active = False
                        count += 1
                    
                    if count > 0:
                        db.session.commit()
                        logger.info("Marked %d events as expired at %s", count, datetime.now(timezone.utc))
                except Exception as db_err:
                    db.session.rollback()
                    raise db_err
                
        except Exception as e:
            logger.error("Error marking expired events: %s", e)

scheduler = TaskScheduler()
