import pytest
from app import create_app, db
from app.models import User, Event, Participation
from datetime import datetime, timezone

@pytest.fixture
def transaction_client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        u1 = User(name='User 1', username='user1', email='1@a.com', password_hash='hash')
        u2 = User(name='User 2', username='user2', email='2@a.com', password_hash='hash')
        db.session.add_all([u1, u2])
        db.session.flush()
        
        e = Event(title='Event', timestamp=datetime.now(timezone.utc), place='place', location='loc', city='city', state='state', source_type='text', posted_by=u1.user_id)
        db.session.add(e)
        db.session.commit()
        
        yield app, u1.user_id, u2.user_id, e.event_id
        
        db.session.remove()
        db.drop_all()

def test_update_participant_count_does_not_commit(transaction_client):
    app, u1_id, u2_id, event_id = transaction_client
    with app.app_context():
        event = db.session.get(Event, event_id)
        # Add a participation
        p = Participation(event_id=event_id, user_id=u2_id, status='going')
        db.session.add(p)
        db.session.flush()
        
        event.update_participant_count()
        assert event.current_participants == 1
        
        # Rollback should undo both the participation and the count
        db.session.rollback()
        
        event = db.session.get(Event, event_id)
        # Re-calculate to see state in db
        event.update_participant_count()
        assert event.current_participants == 0

def test_join_then_leave_event(transaction_client):
    app, u1_id, u2_id, event_id = transaction_client
    with app.app_context():
        event = db.session.get(Event, event_id)
        p = Participation(event_id=event_id, user_id=u2_id, status='going')
        db.session.add(p)
        db.session.commit()
        event.update_participant_count()
        db.session.commit()
        assert event.current_participants == 1
        
        # Leave
        p = Participation.query.filter_by(event_id=event_id, user_id=u2_id).first()
        db.session.delete(p)
        db.session.commit()
        event.update_participant_count()
        db.session.commit()
        
        assert event.current_participants == 0
