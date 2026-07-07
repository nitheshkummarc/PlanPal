# PlanPal - Event Routes ORM to SQL Reference Guide

**Complete mapping of Event API routes from SQLAlchemy ORM to PostgreSQL queries**

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Database Schema](#database-schema)
3. [Route 1: GET /api/events/ - List Events](#route-1-get-apievents---list-events)
4. [Route 2: POST /api/events/ - Create Event](#route-2-post-apievents---create-event)
5. [Route 3: GET /api/events/<id> - Get Event Details](#route-3-get-apieventsid---get-event-details)
6. [Route 4: POST /api/events/<id>/join - Join Event](#route-4-post-apieventsidjoin---join-event)
7. [Route 5: DELETE /api/events/<id>/leave - Leave Event](#route-5-delete-apieventsidleave---leave-event)
8. [Route 6: PUT /api/events/<id> - Update Event](#route-6-put-apieventsid---update-event)
9. [Route 7: PUT /api/events/<id>/update-status - Update Status](#route-7-put-apieventsidupdate-status---update-participation-status)
10. [Route 8: GET /api/events/my - Get My Events](#route-8-get-apieventsmy---get-my-created-events)
11. [Route 9: GET /api/events/joined - Get Joined Events](#route-9-get-apieventsjoined---get-joined-events)
12. [Route 10: GET /api/events/my-events - Legacy Route](#route-10-get-apieventsmy-events---legacy-route)
13. [Route 11: GET /api/events/<id>/participation_status - Check Status](#route-11-get-apieventsidparticipation_status---check-participation-status)
14. [Summary Table](#summary-table)

---

## 📖 Introduction

This document provides a comprehensive reference for all Event API routes in the PlanPal application. For each route, you'll find:

- **File Location**: Exact file path and line numbers
- **HTTP Method & Endpoint**: REST API details
- **Authentication**: JWT requirements
- **ORM Code**: Python SQLAlchemy code
- **Generated SQL**: Actual PostgreSQL queries executed
- **Explanation**: Detailed breakdown of what happens

**Technologies Used:**
- **Backend**: Flask (Python web framework)
- **ORM**: SQLAlchemy (Object-Relational Mapping)
- **Database**: PostgreSQL (hosted on Supabase)
- **Authentication**: JWT (JSON Web Tokens)

---

## 🗄️ Database Schema

### Tables Used

**1. events**
```sql
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP NOT NULL,
    place VARCHAR(200) NOT NULL,
    location VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    price NUMERIC(10, 2),
    source_type VARCHAR(20) NOT NULL,
    posted_by UUID NOT NULL REFERENCES users(user_id),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. participations**
```sql
CREATE TABLE participations (
    participation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(event_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    status VARCHAR(20) NOT NULL DEFAULT 'interested',
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

**3. users**
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(500),
    preferences JSONB,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Route 1: GET /api/events/ - List Events

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 28-75  
**Function**: `get_events()`

### 🔐 Authentication
Not required (public endpoint)

### 📥 Request Parameters
```
Query Parameters:
- page (optional, default: 1) - Page number
- per_page (optional, default: 10) - Items per page
- city (optional) - Filter by city
- state (optional) - Filter by state
- location (optional) - Filter by location
- date_from (optional) - Filter events from date
- date_to (optional) - Filter events to date
```

### 💻 ORM Code

```python
# Line 43: Build base query
query = Event.query.filter_by(is_active=True)

# Line 46-47: Apply city filter
if city:
    query = query.filter(Event.city.ilike(f'%{city}%'))

# Line 48-49: Apply state filter
if state:
    query = query.filter(Event.state.ilike(f'%{state}%'))

# Line 50-51: Apply location filter
if location:
    query = query.filter(Event.location.ilike(f'%{location}%'))

# Line 52-53: Apply date_from filter
if date_from:
    query = query.filter(Event.timestamp >= datetime.fromisoformat(date_from))

# Line 54-55: Apply date_to filter
if date_to:
    query = query.filter(Event.timestamp <= datetime.fromisoformat(date_to))

# Line 58: Order by timestamp
query = query.order_by(Event.timestamp.asc())

# Line 61: Count total results
total = query.count()

# Line 64: Apply pagination and fetch results
events_list = query.offset((page - 1) * per_page).limit(per_page).all()
```

### 🗃️ Generated SQL Queries

**Query 1: Count Total Events**
```sql
SELECT COUNT(*) AS count 
FROM events 
WHERE is_active = true
  AND city ILIKE '%San Francisco%'
  AND state ILIKE '%California%'
  AND timestamp >= '2025-10-15 00:00:00'
  AND timestamp <= '2025-12-31 23:59:59';
```

**Query 2: Fetch Paginated Events**
```sql
SELECT 
    event_id, 
    title, 
    description, 
    timestamp, 
    place, 
    location, 
    city, 
    state, 
    is_paid, 
    price, 
    source_type, 
    posted_by, 
    max_participants, 
    current_participants, 
    is_active, 
    created_at, 
    updated_at
FROM events
WHERE is_active = true
  AND city ILIKE '%San Francisco%'
  AND state ILIKE '%California%'
  AND timestamp >= '2025-10-15 00:00:00'
  AND timestamp <= '2025-12-31 23:59:59'
ORDER BY timestamp ASC
LIMIT 10 OFFSET 0;
```

### 📝 Explanation

1. **Line 43**: Starts building a SELECT query that filters for active events only
2. **Lines 46-55**: Dynamically adds WHERE clauses based on provided filters
   - `ILIKE` operator performs case-insensitive pattern matching in PostgreSQL
   - `%pattern%` matches any string containing the pattern
3. **Line 58**: Adds ORDER BY clause to sort events chronologically
4. **Line 61**: Executes a COUNT(*) query to get total matching events for pagination
5. **Line 64**: 
   - `offset((page - 1) * per_page)`: Skips records (e.g., page 2 with 10 per_page skips first 10)
   - `limit(per_page)`: Limits results to page size
   - `all()`: Executes query and returns list of Event objects

**Performance Notes:**
- Uses indexes on `is_active`, `city`, `state` for faster filtering
- Pagination prevents loading too many records at once

---

## Route 2: POST /api/events/ - Create Event

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 77-137  
**Function**: `create_event()`

### 🔐 Authentication
Required (JWT token)

### 📥 Request Body
```json
{
  "title": "Tech Meetup",
  "description": "Join us for coding discussions",
  "timestamp": "2025-10-20T18:00:00",
  "place": "Tech Hub",
  "location": "123 Main St, San Francisco, CA",
  "city": "San Francisco",
  "state": "California",
  "is_paid": false,
  "price": null,
  "source_type": "text",
  "max_participants": 50
}
```

### 💻 ORM Code

```python
# Line 79: Get authenticated user ID from JWT
current_user_id = get_jwt_identity()

# Lines 97-109: Create Event object
event = Event(
    posted_by=current_user_id,
    title=data['title'],
    description=data.get('description'),
    timestamp=event_timestamp,
    place=data['place'],
    location=data['location'],
    city=data['city'],
    state=data['state'],
    is_paid=data.get('is_paid', False),
    price=data.get('price'),
    source_type=data['source_type'],
    max_participants=data.get('max_participants')
)

# Line 111: Stage event for insertion
db.session.add(event)

# Line 112: Execute INSERT
db.session.commit()

# Lines 115-119: Auto-join creator
participation = Participation(
    event_id=event.event_id,
    user_id=current_user_id,
    status='going'
)
db.session.add(participation)

# Line 122: Update participant count
event.update_participant_count()

# Line 124: Commit all changes
db.session.commit()
```

### 🗃️ Generated SQL Queries

**Query 1: Insert Event**
```sql
INSERT INTO events (
    event_id,
    posted_by,
    title,
    description,
    timestamp,
    place,
    location,
    city,
    state,
    is_paid,
    price,
    source_type,
    max_participants,
    current_participants,
    is_active,
    created_at,
    updated_at
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- Auto-generated UUID
    'user-uuid-here',
    'Tech Meetup',
    'Join us for coding discussions',
    '2025-10-20 18:00:00',
    'Tech Hub',
    '123 Main St, San Francisco, CA',
    'San Francisco',
    'California',
    false,
    NULL,
    'text',
    50,
    0,
    true,
    NOW(),
    NOW()
) RETURNING event_id;
```

**Query 2: Insert Participation (Auto-join creator)**
```sql
INSERT INTO participations (
    participation_id,
    event_id,
    user_id,
    status,
    joined_at,
    created_at,
    updated_at
) VALUES (
    'participation-uuid-here',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'user-uuid-here',
    'going',
    NOW(),
    NOW(),
    NOW()
) RETURNING participation_id;
```

**Query 3: Count Participants**
```sql
SELECT COUNT(*) AS count
FROM participations
WHERE event_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND status IN ('going', 'interested');
```

**Query 4: Update Participant Count**
```sql
UPDATE events
SET current_participants = 1,
    updated_at = NOW()
WHERE event_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### 📝 Explanation

1. **Line 79**: Extracts user ID from JWT token to identify who's creating the event
2. **Lines 97-109**: Creates an in-memory Event object with provided data
3. **Line 111**: `db.session.add()` stages the object for insertion (doesn't hit DB yet)
4. **Line 112**: First `commit()` executes INSERT and returns the auto-generated event_id
5. **Lines 115-119**: Automatically creates a participation record for the creator
6. **Line 122**: Calls `update_participant_count()` which:
   - Counts all participants with 'going' or 'interested' status
   - Updates the cached `current_participants` field
7. **Line 124**: Final commit saves the participation and updated count

**Transaction Safety:**
- All operations wrapped in a transaction
- If any step fails, `db.session.rollback()` (line 132) undoes all changes
- Ensures data consistency

---

## Route 3: GET /api/events/<id> - Get Event Details

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 139-206  
**Function**: `get_event_details(event_id)`

### 🔐 Authentication
Not required (public endpoint)

### 💻 ORM Code

```python
# Line 141: Fetch event by ID
event = Event.query.get(event_id)

# Lines 145-149: Get participants with JOIN
participants = db.session.query(Participation, User).join(User).filter(
    Participation.event_id == event_id,
    Participation.status.in_(['going', 'interested'])
).all()

# Line 152: Get event creator
creator = db.session.query(User).filter(User.user_id == event.posted_by).first()
```

### 🗃️ Generated SQL Queries

**Query 1: Get Event**
```sql
SELECT *
FROM events
WHERE event_id = 'event-uuid-here'
LIMIT 1;
```

**Query 2: Get Participants (with JOIN)**
```sql
SELECT 
    participations.participation_id,
    participations.event_id,
    participations.user_id,
    participations.status,
    participations.joined_at,
    participations.created_at,
    participations.updated_at,
    users.user_id,
    users.name,
    users.email,
    users.username,
    users.bio,
    users.profile_image_url,
    users.role,
    users.is_active
FROM participations
INNER JOIN users ON users.user_id = participations.user_id
WHERE participations.event_id = 'event-uuid-here'
  AND participations.status IN ('going', 'interested');
```

**Query 3: Get Creator**
```sql
SELECT *
FROM users
WHERE user_id = 'creator-user-id'
LIMIT 1;
```

### 📝 Explanation

1. **Line 141**: `Event.query.get(event_id)` performs SELECT with WHERE on primary key
2. **Lines 145-149**: Complex query that:
   - Joins `participations` and `users` tables
   - Filters by event_id and status
   - Returns tuples of (Participation, User) objects
3. **Line 152**: Fetches the user who created the event
4. **Lines 154-200**: Python code builds response with participants list
   - Ensures creator appears first
   - Includes full user details for each participant

**JOIN Operation:**
- `INNER JOIN` means only participants with matching user records are returned
- More efficient than fetching participations first, then users separately

---

## Route 4: POST /api/events/<id>/join - Join Event

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 208-268  
**Function**: `join_event(event_id)`

### 🔐 Authentication
Required (JWT token)

### 💻 ORM Code

```python
# Line 210: Get authenticated user
current_user_id = get_jwt_identity()

# Line 213: Check if event exists
event = Event.query.get(event_id)

# Lines 218-221: Check if already joined
existing_participation = Participation.query.filter_by(
    event_id=event_id,
    user_id=current_user_id
).first()

# Lines 228-232: Create participation
participation = Participation(
    event_id=event_id,
    user_id=current_user_id,
    status='interested'
)

# Line 234: Add to session
db.session.add(participation)

# Line 237: Update participant count
event.update_participant_count()

# Lines 240-241: Get user for notifications
user = User.query.get(current_user_id)

# Line 244: Notify event creator
NotificationService.notify_new_participant(event, participation)

# Line 247: Notify user who joined
NotificationService.notify_user_joined_event(event, user)

# Line 249: Commit all changes
db.session.commit()
```

### 🗃️ Generated SQL Queries

**Query 1: Get Event**
```sql
SELECT * FROM events WHERE event_id = 'event-uuid' LIMIT 1;
```

**Query 2: Check Existing Participation**
```sql
SELECT *
FROM participations
WHERE event_id = 'event-uuid'
  AND user_id = 'user-uuid'
LIMIT 1;
```

**Query 3: Insert Participation**
```sql
INSERT INTO participations (
    participation_id,
    event_id,
    user_id,
    status,
    joined_at,
    created_at,
    updated_at
) VALUES (
    'participation-uuid',
    'event-uuid',
    'user-uuid',
    'interested',
    NOW(),
    NOW(),
    NOW()
);
```

**Query 4: Count Participants**
```sql
SELECT COUNT(*) AS count
FROM participations
WHERE event_id = 'event-uuid'
  AND status IN ('going', 'interested');
```

**Query 5: Update Event**
```sql
UPDATE events
SET current_participants = 3,
    updated_at = NOW()
WHERE event_id = 'event-uuid';
```

**Query 6: Get User Info**
```sql
SELECT * FROM users WHERE user_id = 'user-uuid' LIMIT 1;
```

**Query 7: Create Notification for Creator**
```sql
INSERT INTO notifications (
    notification_id,
    user_id,
    event_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at
) VALUES (
    'notification-uuid',
    'creator-user-id',
    'event-uuid',
    'new_participant',
    'New participant joined your event',
    'John Doe joined "Tech Meetup"',
    false,
    NOW(),
    NOW()
);
```

**Query 8: Create Notification for User**
```sql
INSERT INTO notifications (
    notification_id,
    user_id,
    event_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at
) VALUES (
    'notification-uuid-2',
    'user-uuid',
    'event-uuid',
    'event_joined',
    'Successfully joined event',
    'You joined "Tech Meetup"',
    false,
    NOW(),
    NOW()
);
```

### 📝 Explanation

1. **Lines 218-221**: Checks if user already joined to prevent duplicates
   - Uses UNIQUE constraint on (event_id, user_id)
2. **Lines 224-226**: Validates max_participants limit
3. **Lines 228-234**: Creates participation with 'interested' status
4. **Line 237**: Updates cached participant count for performance
5. **Lines 244-247**: Creates notifications:
   - One for event creator (someone joined your event)
   - One for user (confirmation of joining)
6. **Line 249**: Commits everything as atomic transaction

**Business Logic:**
- New participants start as 'interested' (can upgrade to 'going' later)
- Creator gets notified of new participants
- Participant count is cached for quick access

---

## Route 5: DELETE /api/events/<id>/leave - Leave Event

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 270-311  
**Function**: `leave_event(event_id)`

### 🔐 Authentication
Required (JWT token)

### 💻 ORM Code

```python
# Line 272: Get authenticated user
current_user_id = get_jwt_identity()

# Lines 275-278: Find participation
participation = Participation.query.filter_by(
    event_id=event_id,
    user_id=current_user_id
).first()

# Lines 284-286: Check if user is creator
event = Event.query.get(event_id)
if str(event.posted_by) == current_user_id:
    return jsonify({'error': 'Event creator cannot leave'}), 400

# Line 289: Delete participation
db.session.delete(participation)

# Line 292: Update participant count
event.update_participant_count()

# Line 295: Notify creator
NotificationService.notify_participant_left(event, participation)

# Line 297: Commit changes
db.session.commit()
```

### 🗃️ Generated SQL Queries

**Query 1: Find Participation**
```sql
SELECT *
FROM participations
WHERE event_id = 'event-uuid'
  AND user_id = 'user-uuid'
LIMIT 1;
```

**Query 2: Get Event**
```sql
SELECT * FROM events WHERE event_id = 'event-uuid' LIMIT 1;
```

**Query 3: Delete Participation**
```sql
DELETE FROM participations
WHERE participation_id = 'participation-uuid';
```

**Query 4: Count Remaining Participants**
```sql
SELECT COUNT(*) AS count
FROM participations
WHERE event_id = 'event-uuid'
  AND status IN ('going', 'interested');
```

**Query 5: Update Event**
```sql
UPDATE events
SET current_participants = 2,
    updated_at = NOW()
WHERE event_id = 'event-uuid';
```

**Query 6: Create Notification**
```sql
INSERT INTO notifications (
    notification_id,
    user_id,
    event_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at
) VALUES (
    'notification-uuid',
    'creator-user-id',
    'event-uuid',
    'participant_left',
    'Participant left your event',
    'John Doe left "Tech Meetup"',
    false,
    NOW(),
    NOW()
);
```

### 📝 Explanation

1. **Lines 275-278**: Finds the participation record to delete
2. **Lines 284-286**: Prevents event creator from leaving their own event
   - Creator must always be associated with their event
3. **Line 289**: `db.session.delete()` removes participation record
4. **Line 292**: Decrements participant count
5. **Line 295**: Notifies creator that someone left
6. **Line 297**: Commits deletion and updates

**Data Integrity:**
- Creator cannot leave (business rule)
- Participant count stays synchronized
- Notification keeps creator informed

---

## Route 6: PUT /api/events/<id> - Update Event

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 313-374  
**Function**: `update_event(event_id)`

### 🔐 Authentication
Required (JWT token) - Must be event creator

### 📥 Request Body
```json
{
  "title": "Updated Tech Meetup",
  "description": "New description",
  "city": "Los Angeles",
  "state": "California",
  "max_participants": 100
}
```

### 💻 ORM Code

```python
# Line 315: Get authenticated user
current_user_id = get_jwt_identity()

# Line 319: Get event
event = Event.query.get(event_id)

# Lines 324-325: Check ownership
if str(event.posted_by) != current_user_id:
    return jsonify({'error': 'You can only edit your own events'}), 403

# Lines 328-349: Update fields
if 'title' in data:
    event.title = data['title']
if 'description' in data:
    event.description = data['description']
if 'timestamp' in data:
    event.timestamp = datetime.fromisoformat(data['timestamp'])
if 'place' in data:
    event.place = data['place']
if 'location' in data:
    event.location = data['location']
if 'city' in data:
    event.city = data['city']
if 'state' in data:
    event.state = data['state']
# ... more fields

# Line 351: Update timestamp
event.updated_at = datetime.utcnow()

# Line 353: Commit changes
db.session.commit()

# Line 356: Notify all participants
NotificationService.notify_event_update(event)
```

### 🗃️ Generated SQL Queries

**Query 1: Get Event**
```sql
SELECT * FROM events WHERE event_id = 'event-uuid' LIMIT 1;
```

**Query 2: Update Event**
```sql
UPDATE events
SET title = 'Updated Tech Meetup',
    description = 'New description',
    city = 'Los Angeles',
    state = 'California',
    max_participants = 100,
    updated_at = NOW()
WHERE event_id = 'event-uuid';
```

**Query 3: Get All Participants for Notifications**
```sql
SELECT participations.*, users.*
FROM participations
INNER JOIN users ON users.user_id = participations.user_id
WHERE participations.event_id = 'event-uuid'
  AND participations.status IN ('going', 'interested');
```

**Query 4: Create Notifications (for each participant)**
```sql
INSERT INTO notifications (
    notification_id,
    user_id,
    event_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at
) VALUES 
('notif-uuid-1', 'participant-1-uuid', 'event-uuid', 'event_update', 
 'Event updated', '"Tech Meetup" has been updated', false, NOW(), NOW()),
('notif-uuid-2', 'participant-2-uuid', 'event-uuid', 'event_update', 
 'Event updated', '"Tech Meetup" has been updated', false, NOW(), NOW()),
('notif-uuid-3', 'participant-3-uuid', 'event-uuid', 'event_update', 
 'Event updated', '"Tech Meetup" has been updated', false, NOW(), NOW());
```

### 📝 Explanation

1. **Lines 324-325**: Authorization check - only creator can update
2. **Lines 328-349**: Updates only fields present in request (partial update)
3. **Line 351**: Always updates `updated_at` timestamp
4. **Line 353**: Commits changes to database
5. **Line 356**: Sends notifications to ALL participants about the update
   - Important for changes to time, location, etc.

**Security:**
- Only event creator can update
- Returns 403 Forbidden if unauthorized
- Validates timestamp format before updating

---

## Route 7: PUT /api/events/<id>/update-status - Update Participation Status

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 376-419  
**Function**: `update_participation_status(event_id)`

### 🔐 Authentication
Required (JWT token)

### 📥 Request Body
```json
{
  "status": "going"
}
```

### 💻 ORM Code

```python
# Line 378: Get authenticated user
current_user_id = get_jwt_identity()

# Lines 390-393: Find participation
participation = Participation.query.filter_by(
    event_id=event_id,
    user_id=current_user_id
).first()

# Line 399: Update status
participation.status = data['status']

# Lines 402-403: Update participant count
event = participation.event
event.update_participant_count()

# Line 405: Commit changes
db.session.commit()
```

### 🗃️ Generated SQL Queries

**Query 1: Get Participation**
```sql
SELECT *
FROM participations
WHERE event_id = 'event-uuid'
  AND user_id = 'user-uuid'
LIMIT 1;
```

**Query 2: Update Participation Status**
```sql
UPDATE participations
SET status = 'going',
    updated_at = NOW()
WHERE participation_id = 'participation-uuid';
```

**Query 3: Count Participants**
```sql
SELECT COUNT(*) AS count
FROM participations
WHERE event_id = 'event-uuid'
  AND status IN ('going', 'interested');
```

**Query 4: Update Event Participant Count**
```sql
UPDATE events
SET current_participants = 5,
    updated_at = NOW()
WHERE event_id = 'event-uuid';
```

### 📝 Explanation

1. **Lines 381-387**: Validates status is one of: 'interested' or 'going'
2. **Line 399**: Changes user's participation status
3. **Lines 402-403**: Recalculates and updates participant count
   - Count may stay same if both statuses are counted
   - But keeps data consistent
4. **Line 405**: Commits both updates atomically

**Use Case:**
- User initially marks as 'interested'
- Later upgrades to 'going' when they confirm attendance

---

## Route 8: GET /api/events/my - Get My Created Events

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 421-454  
**Function**: `get_my_events()`

### 🔐 Authentication
Required (JWT token)

### 📥 Request Parameters
```
Query Parameters:
- page (optional, default: 1)
- per_page (optional, default: 10)
```

### 💻 ORM Code

```python
# Line 423: Get authenticated user
current_user_id = get_jwt_identity()

# Lines 429-432: Query events created by user
query = Event.query.filter_by(
    posted_by=current_user_id,
    is_active=True
).order_by(Event.timestamp.desc())

# Line 435: Count total
total = query.count()

# Line 438: Get paginated events
events_list = query.offset((page - 1) * per_page).limit(per_page).all()
```

### 🗃️ Generated SQL Queries

**Query 1: Count Events**
```sql
SELECT COUNT(*) AS count
FROM events
WHERE posted_by = 'user-uuid'
  AND is_active = true;
```

**Query 2: Get Events**
```sql
SELECT *
FROM events
WHERE posted_by = 'user-uuid'
  AND is_active = true
ORDER BY timestamp DESC
LIMIT 10 OFFSET 0;
```

### 📝 Explanation

1. **Lines 429-432**: Filters events where current user is the creator
2. **Line 432**: Orders by timestamp descending (newest first)
3. **Line 435**: Counts total for pagination metadata
4. **Line 438**: Fetches only requested page

**Use Case:**
- User's profile page showing their created events
- Event management dashboard

---

## Route 9: GET /api/events/joined - Get Joined Events

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 456-489  
**Function**: `get_joined_events()`

### 🔐 Authentication
Required (JWT token)

### 💻 ORM Code

```python
# Line 458: Get authenticated user
current_user_id = get_jwt_identity()

# Lines 464-469: Query events user joined (with JOIN)
query = db.session.query(Event).join(Participation).filter(
    Participation.user_id == current_user_id,
    Event.is_active == True,
    Participation.status.in_(['going', 'interested'])
).order_by(Event.timestamp.desc())

# Line 472: Count total
total = query.count()

# Line 475: Get paginated events
events_list = query.offset((page - 1) * per_page).limit(per_page).all()
```

### 🗃️ Generated SQL Queries

**Query 1: Count Joined Events**
```sql
SELECT COUNT(*) AS count
FROM events
INNER JOIN participations ON participations.event_id = events.event_id
WHERE participations.user_id = 'user-uuid'
  AND events.is_active = true
  AND participations.status IN ('going', 'interested');
```

**Query 2: Get Joined Events**
```sql
SELECT events.*
FROM events
INNER JOIN participations ON participations.event_id = events.event_id
WHERE participations.user_id = 'user-uuid'
  AND events.is_active = true
  AND participations.status IN ('going', 'interested')
ORDER BY events.timestamp DESC
LIMIT 10 OFFSET 0;
```

### 📝 Explanation

1. **Lines 464-469**: Complex query with JOIN:
   - Joins `events` and `participations` tables
   - Filters by current user's participations
   - Only includes active events
   - Only 'going' and 'interested' statuses (excludes cancelled/declined)
2. **Line 469**: Orders by timestamp descending (upcoming events first)
3. **Lines 472-475**: Standard pagination

**Use Case:**
- User's dashboard showing events they're attending
- "My Events" page

---

## Route 10: GET /api/events/my-events - Legacy Route

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 492-519  
**Function**: `get_my_events_legacy()`

### 🔐 Authentication
Required (JWT token)

### 💻 ORM Code

```python
# Line 494: Get authenticated user
current_user_id = get_jwt_identity()

# Lines 497-500: Get created events
created_events = Event.query.filter_by(
    posted_by=current_user_id,
    is_active=True
).order_by(Event.timestamp.desc()).all()

# Lines 503-508: Get participated events
participated_events = db.session.query(Event).join(Participation).filter(
    Participation.user_id == current_user_id,
    Event.is_active == True,
    Participation.status.in_(['going', 'interested'])
).order_by(Event.timestamp.desc()).all()
```

### 🗃️ Generated SQL Queries

**Query 1: Get Created Events**
```sql
SELECT *
FROM events
WHERE posted_by = 'user-uuid'
  AND is_active = true
ORDER BY timestamp DESC;
```

**Query 2: Get Participated Events**
```sql
SELECT events.*
FROM events
INNER JOIN participations ON participations.event_id = events.event_id
WHERE participations.user_id = 'user-uuid'
  AND events.is_active = true
  AND participations.status IN ('going', 'interested')
ORDER BY events.timestamp DESC;
```

### 📝 Explanation

1. Combines functionality of routes 8 and 9
2. Returns both created and participated events in one response
3. No pagination (returns all events)
4. Kept for backward compatibility with older clients

**Response Structure:**
```json
{
  "created_events": [...],
  "participated_events": [...]
}
```

---

## Route 11: GET /api/events/<id>/participation_status - Check Participation Status

### 📍 Location
**File**: `backend/app/routes/events.py`  
**Lines**: 521-551  
**Function**: `get_participation_status(event_id)`

### 🔐 Authentication
Required (JWT token)

### 💻 ORM Code

```python
# Line 524: Get authenticated user
current_user_id = get_jwt_identity()

# Line 527: Get event
event = Event.query.get(event_id)

# Lines 532-535: Check participation
participation = Participation.query.filter_by(
    event_id=event_id,
    user_id=current_user_id
).first()

# Lines 537-540: Determine status
status = 'not_joined'
if participation:
    status = participation.status
```

### 🗃️ Generated SQL Queries

**Query 1: Get Event**
```sql
SELECT * FROM events WHERE event_id = 'event-uuid' LIMIT 1;
```

**Query 2: Check Participation**
```sql
SELECT *
FROM participations
WHERE event_id = 'event-uuid'
  AND user_id = 'user-uuid'
LIMIT 1;
```

### 📝 Explanation

1. **Line 527**: Validates event exists
2. **Lines 532-535**: Checks if user has participation record
3. **Lines 537-540**: Returns status:
   - 'not_joined' if no participation found
   - 'interested' or 'going' if participation exists
4. **Line 545**: Also returns if user is the creator

**Response:**
```json
{
  "status": "going",
  "is_creator": false
}
```

**Use Case:**
- UI needs to know whether to show "Join" or "Leave" button
- Displaying user's current status on event page

---

## 📊 Summary Table

### All Event Routes Quick Reference

| # | Method | Endpoint | Function | Auth | Lines | Primary SQL Operations |
|---|--------|----------|----------|------|-------|----------------------|
| 1 | GET | `/api/events/` | `get_events()` | No | 28-75 | SELECT with filters, COUNT, LIMIT/OFFSET |
| 2 | POST | `/api/events/` | `create_event()` | Yes | 77-137 | INSERT event, INSERT participation, UPDATE count |
| 3 | GET | `/api/events/<id>` | `get_event_details()` | No | 139-206 | SELECT event, SELECT with JOIN for participants |
| 4 | POST | `/api/events/<id>/join` | `join_event()` | Yes | 208-268 | INSERT participation, UPDATE count, INSERT notifications |
| 5 | DELETE | `/api/events/<id>/leave` | `leave_event()` | Yes | 270-311 | DELETE participation, UPDATE count, INSERT notification |
| 6 | PUT | `/api/events/<id>` | `update_event()` | Yes | 313-374 | UPDATE event, INSERT notifications (bulk) |
| 7 | PUT | `/api/events/<id>/update-status` | `update_participation_status()` | Yes | 376-419 | UPDATE participation, UPDATE event count |
| 8 | GET | `/api/events/my` | `get_my_events()` | Yes | 421-454 | SELECT with WHERE posted_by, pagination |
| 9 | GET | `/api/events/joined` | `get_joined_events()` | Yes | 456-489 | SELECT with JOIN, WHERE user_id, pagination |
| 10 | GET | `/api/events/my-events` | `get_my_events_legacy()` | Yes | 492-519 | Two SELECTs (created + joined), no pagination |
| 11 | GET | `/api/events/<id>/participation_status` | `get_participation_status()` | Yes | 521-551 | SELECT event, SELECT participation |

### SQL Operation Types by Route

| SQL Operation | Routes Using It |
|--------------|-----------------|
| **SELECT** | All routes (1-11) |
| **INSERT** | 2, 4, 6 |
| **UPDATE** | 2, 4, 5, 6, 7 |
| **DELETE** | 5 |
| **JOIN** | 3, 9, 10 |
| **COUNT** | 1, 2, 4, 5, 7, 8, 9 |
| **LIMIT/OFFSET** | 1, 8, 9 |

### Common SQL Patterns

**Pattern 1: Pagination**
```sql
-- Count total
SELECT COUNT(*) FROM table WHERE conditions;

-- Get page
SELECT * FROM table WHERE conditions 
ORDER BY column 
LIMIT 10 OFFSET 0;
```
Used in: Routes 1, 8, 9

**Pattern 2: Participant Count Cache**
```sql
-- Count participants
SELECT COUNT(*) FROM participations 
WHERE event_id = ? AND status IN ('going', 'interested');

-- Update cached count
UPDATE events SET current_participants = ? WHERE event_id = ?;
```
Used in: Routes 2, 4, 5, 7

**Pattern 3: JOIN for Related Data**
```sql
SELECT events.*, users.*
FROM events
INNER JOIN participations ON participations.event_id = events.event_id
INNER JOIN users ON users.user_id = participations.user_id
WHERE conditions;
```
Used in: Routes 3, 9, 10

**Pattern 4: Notification Creation**
```sql
INSERT INTO notifications (
    notification_id, user_id, event_id, type, 
    title, message, is_read, created_at, updated_at
) VALUES (uuid, ?, ?, ?, ?, ?, false, NOW(), NOW());
```
Used in: Routes 4, 5, 6

---

## 🎯 Key Takeaways

### ORM Benefits
1. **Security**: Prevents SQL injection automatically
2. **Portability**: Same code works with different databases
3. **Maintainability**: Python objects easier to work with than raw SQL
4. **Relationships**: Automatic JOIN handling through relationships

### Performance Considerations
1. **Indexes**: All foreign keys and frequently filtered columns have indexes
2. **Caching**: `current_participants` is cached to avoid counting on every request
3. **Pagination**: Prevents loading excessive data
4. **SELECT N+1**: Avoided by using JOIN instead of separate queries

### Transaction Safety
1. **Atomic Operations**: Multiple related changes committed together
2. **Rollback on Error**: `db.session.rollback()` in exception handlers
3. **Consistency**: All or nothing - prevents partial updates

### Security Features
1. **JWT Authentication**: 7 out of 11 routes require authentication
2. **Authorization**: Ownership checks before updates/deletes
3. **Input Validation**: Required fields, format validation
4. **Parameterized Queries**: ORM prevents SQL injection

---

**Document Version**: 1.0  
**Last Updated**: October 13, 2025  
**File**: `backend/app/routes/events.py` (522 lines)  
**Database**: PostgreSQL (via Supabase)  
**ORM**: SQLAlchemy 2.x  
**Framework**: Flask 3.x
