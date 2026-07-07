# Route Documentation - Function Comments Guide

This document provides detailed comments for all route functions in the PlanPal backend.

## Backend Routes

### auth.py - Authentication Routes

```python
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and return JWT tokens.
    
    Request Body:
        email (str): User's email address
        password (str): User's password
    
    Returns:
        200: Login successful with access_token, refresh_token, and user data
        400: Missing email or password
        401: Invalid credentials or inactive account
        500: Server error
    """

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user by invalidating JWT token.
    Note: Token blacklisting is currently disabled for simplicity.
    Client should discard tokens on logout.
    
    Returns:
        200: Successfully logged out
        500: Server error
    """

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token using refresh token.
    
    Headers:
        Authorization: Bearer <refresh_token>
    
    Returns:
        200: New access token
        404: User not found or inactive
        500: Server error
    """

@auth_bp.route('/debug-users', methods=['GET'])
def debug_users():
    """
    Debug endpoint to check users in database (development only).
    Shows first 5 users with basic information.
    
    Returns:
        200: List of users with total count
        500: Server error
    """

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get current user's profile information.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: User profile data
        404: User not found
        500: Server error
    """

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Update current user's profile.
    Email cannot be changed via this endpoint.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Request Body (all optional):
        name (str): Updated name
        username (str): Updated username (must be unique)
        bio (str): Updated bio
        profile_image_url (str): Updated profile image URL
        preferences (list): Updated interests/preferences
    
    Returns:
        200: Profile updated successfully with user data
        400: Username already taken
        404: User not found
        500: Server error
    """

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change user's password.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Request Body:
        current_password (str): Current password for verification
        new_password (str): New password (must meet strength requirements)
    
    Returns:
        200: Password changed successfully
        400: Missing fields, incorrect current password, or weak new password
        404: User not found
        500: Server error
    """
```

### events.py - Event Management Routes

```python
@events_bp.route('/', methods=['GET'])
def get_events():
    """
    Get list of all active events with pagination and filters.
    
    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
        city (str): Filter by city name
        state (str): Filter by state name
        location (str): Filter by location
        date_from (ISO datetime): Filter events after this date
        date_to (ISO datetime): Filter events before this date
    
    Returns:
        200: List of events with pagination metadata
        500: Server error
    """

@events_bp.route('/', methods=['POST'])
@jwt_required()
def create_event():
    """
    Create a new event.
    Automatically adds creator as participant with 'going' status.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Request Body:
        title (str): Event title (required)
        timestamp (ISO datetime): Event date/time (required)
        place (str): Venue name (required)
        location (str): Detailed location (required)
        city (str): City name (required)
        state (str): State name (required)
        source_type (str): 'text' or 'poster' (required)
        description (str): Event description (optional)
        is_paid (bool): Whether event is paid (default: false)
        price (decimal): Event price if paid (optional)
        max_participants (int): Maximum attendees (optional)
    
    Returns:
        201: Event created successfully with event data
        400: Validation error (missing required fields, invalid date)
        500: Server error
    """

@events_bp.route('/<event_id>', methods=['GET'])
def get_event_details(event_id):
    """
    Get detailed information about a specific event including participants.
    Creator is always listed first in participants list.
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Returns:
        200: Event details with participants list
        404: Event not found or inactive
        500: Server error
    """

@events_bp.route('/<event_id>/join', methods=['POST'])
@jwt_required()
def join_event(event_id):
    """
    Join an event as a participant.
    Creates notification for event creator.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Returns:
        201: Successfully joined with participation data
        400: Already joined or event is full
        404: Event not found
        500: Server error
    """

@events_bp.route('/<event_id>/leave', methods=['DELETE'])
@jwt_required()
def leave_event(event_id):
    """
    Leave an event.
    Event creators cannot leave their own events.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Returns:
        200: Successfully left event
        400: Creator cannot leave event
        404: Not participating in this event
        500: Server error
    """

@events_bp.route('/<event_id>', methods=['PUT'])
@jwt_required()
def update_event(event_id):
    """
    Update event details (creator only).
    Sends notifications to all participants about the update.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Request Body (all optional):
        title, description, timestamp, place, location, 
        city, state, max_participants, is_paid, price
    
    Returns:
        200: Event updated successfully
        403: User is not the event creator
        404: Event not found
        400: Invalid timestamp format
        500: Server error
    """

@events_bp.route('/<event_id>/update-status', methods=['PUT'])
@jwt_required()
def update_participation_status(event_id):
    """
    Update participation status (interested/going).
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Request Body:
        status (str): 'interested' or 'going' (required)
    
    Returns:
        200: Status updated successfully
        400: Invalid status value
        404: Not participating in event
        500: Server error
    """

@events_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_events():
    """
    Get events created by current user with pagination.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
    
    Returns:
        200: List of created events with pagination
        500: Server error
    """

@events_bp.route('/joined', methods=['GET'])
@jwt_required()
def get_joined_events():
    """
    Get events current user is participating in with pagination.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
    
    Returns:
        200: List of joined events with pagination
        500: Server error
    """

@events_bp.route('/my-events', methods=['GET'])
@jwt_required()
def get_my_events_legacy():
    """
    Get both created and participated events (legacy endpoint).
    Returns separate lists for created_events and participated_events.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: Both created and participated events
        500: Server error
    """

@events_bp.route('/<event_id>/participation_status', methods=['GET'])
@jwt_required()
def get_participation_status(event_id):
    """
    Check user's participation status for an event.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        event_id (UUID): Event identifier
    
    Returns:
        200: Status ('not_joined', 'interested', 'going') and is_creator flag
        404: Event not found
        500: Server error
    """
```

### search.py - Search Routes

```python
@search_bp.route('/unified', methods=['GET'])
def unified_search():
    """
    Unified search across events, users, and tags.
    
    Query Parameters:
        q (str): Search query (required, min 2 chars)
        type (str): Filter by type ('event', 'user', 'tag', or 'all')
        location (str): Filter events by location
        limit (int): Maximum results (default: 10, max: 100)
        sort_by (str): Sort order ('recent', 'popular', 'name')
    
    Returns:
        200: Search results with events, users, and tags arrays
        400: Missing or invalid query parameter
        500: Server error
    """
```

### notifications.py - Notification Routes

```python
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """
    Get user's notifications with pagination.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 20)
        unread_only (bool): Show only unread notifications
    
    Returns:
        200: List of notifications with pagination
        500: Server error
    """

@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """
    Get count of unread notifications.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: Count of unread notifications
        500: Server error
    """

@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """
    Mark a specific notification as read.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        notification_id (UUID): Notification identifier
    
    Returns:
        200: Notification marked as read
        403: Not authorized to modify this notification
        404: Notification not found
        500: Server error
    """

@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """
    Mark all user's notifications as read.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: All notifications marked as read
        500: Server error
    """

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """
    Delete a specific notification.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        notification_id (UUID): Notification identifier
    
    Returns:
        200: Notification deleted
        403: Not authorized to delete this notification
        404: Notification not found
        500: Server error
    """

@notifications_bp.route('/clear-all', methods=['DELETE'])
@jwt_required()
def clear_all_notifications():
    """
    Delete all user's notifications.
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: All notifications deleted with count
        500: Server error
    """
```

### tags.py - Tag Management Routes

```python
@tags_bp.route('/', methods=['GET'])
def get_all_tags():
    """
    Get all available tags.
    
    Returns:
        200: List of all tags
        500: Server error
    """

@tags_bp.route('/', methods=['POST'])
@jwt_required()
def create_tag():
    """
    Create a new tag (admin only).
    
    Headers:
        Authorization: Bearer <access_token>
    
    Request Body:
        name (str): Tag name (required, unique)
        description (str): Tag description (optional)
        color (str): Hex color code (optional)
    
    Returns:
        201: Tag created successfully
        400: Missing name or duplicate tag
        403: User is not admin
        500: Server error
    """

@tags_bp.route('/<tag_id>', methods=['GET'])
def get_tag(tag_id):
    """
    Get specific tag details.
    
    Path Parameters:
        tag_id (UUID): Tag identifier
    
    Returns:
        200: Tag details
        404: Tag not found
        500: Server error
    """

@tags_bp.route('/<tag_id>', methods=['PUT'])
@jwt_required()
def update_tag(tag_id):
    """
    Update tag details (admin only).
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        tag_id (UUID): Tag identifier
    
    Request Body (all optional):
        name, description, color
    
    Returns:
        200: Tag updated successfully
        403: User is not admin
        404: Tag not found
        500: Server error
    """

@tags_bp.route('/<tag_id>', methods=['DELETE'])
@jwt_required()
def delete_tag(tag_id):
    """
    Delete a tag (admin only).
    
    Headers:
        Authorization: Bearer <access_token>
    
    Path Parameters:
        tag_id (UUID): Tag identifier
    
    Returns:
        200: Tag deleted successfully
        403: User is not admin
        404: Tag not found
        500: Server error
    """
```

### users.py - User Profile Routes

```python
@users_bp.route('/', methods=['GET'])
def search_users():
    """
    Search users with pagination.
    
    Query Parameters:
        q (str): Search query for name/username
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
    
    Returns:
        200: List of users with pagination
        500: Server error
    """

@users_bp.route('/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """
    Get specific user's public profile.
    
    Path Parameters:
        user_id (UUID): User identifier
    
    Returns:
        200: User profile data
        404: User not found
        500: Server error
    """

@users_bp.route('/<user_id>/events', methods=['GET'])
def get_user_events(user_id):
    """
    Get events created by a specific user.
    
    Path Parameters:
        user_id (UUID): User identifier
    
    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
    
    Returns:
        200: List of user's events with pagination
        404: User not found
        500: Server error
    """
```

### system.py - System Routes

```python
@system_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        200: System is healthy with status information
        500: System has errors
    """
```

## Frontend Route Components

### Pages Documentation

#### Home.jsx
- **Purpose**: Landing page with featured events and call-to-action
- **Route**: `/`
- **Features**: Hero section, featured events, quick search

#### Dashboard.jsx
- **Purpose**: Personalized user dashboard
- **Route**: `/dashboard`
- **Auth**: Required
- **Features**: Event statistics, upcoming events, quick actions

#### Events.jsx
- **Purpose**: Browse all events with filters
- **Route**: `/events`
- **Features**: Event list, pagination, filters (city, state, date)

#### EventDetails.jsx
- **Purpose**: View detailed event information
- **Route**: `/events/:id`
- **Features**: Event info, participants list, join/leave actions

#### CreateEvent.jsx
- **Purpose**: Create new event form
- **Route**: `/events/create`
- **Auth**: Required
- **Features**: Multi-step form, validation, image upload

#### EditEvent.jsx
- **Purpose**: Edit existing event
- **Route**: `/events/:id/edit`
- **Auth**: Required (creator only)
- **Features**: Pre-filled form, update functionality

#### Profile.jsx
- **Purpose**: User profile management
- **Route**: `/profile`
- **Auth**: Required
- **Features**: Profile edit, password change, notification settings

#### Calendar.jsx
- **Purpose**: Calendar view of events
- **Route**: `/calendar`
- **Features**: Month/week/day views, event filtering

#### Notifications.jsx
- **Purpose**: Notification center
- **Route**: `/notifications`
- **Auth**: Required
- **Features**: Notification list, mark as read, delete

#### Search.jsx
- **Purpose**: Unified search interface
- **Route**: `/search`
- **Features**: Multi-type search, filters, results display

#### Login.jsx
- **Purpose**: User login page
- **Route**: `/login`
- **Features**: Email/password login, redirect to dashboard

#### Register.jsx
- **Purpose**: User registration page
- **Route**: `/register`
- **Features**: Account creation form, validation, auto-login

## API Client Documentation

### authApi.js
- `register(userData)` - Register new user
- `login(credentials)` - Login user
- `logout()` - Logout user
- `refresh(refreshToken)` - Refresh access token
- `getProfile()` - Get current user profile
- `updateProfile(profileData)` - Update profile
- `changePassword(passwordData)` - Change password

### eventsApi.js
- `getAllEvents(params)` - Get events with filters
- `getEventById(id)` - Get event details
- `createEvent(eventData)` - Create event
- `updateEvent(id, eventData)` - Update event
- `deleteEvent(id)` - Delete event
- `joinEvent(id)` - Join event
- `leaveEvent(id)` - Leave event
- `updateParticipationStatus(id, status)` - Update status
- `getMyEvents(params)` - Get created events
- `getJoinedEvents(params)` - Get joined events
- `getParticipationStatus(id)` - Check participation

### searchApi.js
- `unifiedSearch(params)` - Search across all types

### notificationsApi.js
- `getNotifications(params)` - Get notifications
- `getUnreadCount()` - Get unread count
- `markAsRead(id)` - Mark notification read
- `markAllAsRead()` - Mark all as read
- `deleteNotification(id)` - Delete notification
- `clearAll()` - Delete all notifications

### tagsApi.js
- `getAllTags()` - Get all tags
- `getTag(id)` - Get tag by ID
- `createTag(tagData)` - Create tag (admin)
- `updateTag(id, tagData)` - Update tag (admin)
- `deleteTag(id)` - Delete tag (admin)

### usersApi.js
- `searchUsers(query)` - Search users
- `getUserProfile(id)` - Get user profile
- `getUserEvents(id, params)` - Get user's events
