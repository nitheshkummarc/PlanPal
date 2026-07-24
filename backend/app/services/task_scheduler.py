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
from datetime import datetime, timezone
from app import db
from app.models import Event
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
                # Sleep for 5 minutes
                time.sleep(300)
            except Exception as e:
                logger.error("Scheduler error: %s", e)
                time.sleep(60)  # Wait 1 minute on error
    
    def _mark_expired_events(self):
        """Mark all expired events as inactive"""
        try:
            if not self.app:
                return
            with self.app.app_context():
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
                
        except Exception as e:
            logger.error("Error marking expired events: %s", e)
            db.session.rollback()

scheduler = TaskScheduler()
