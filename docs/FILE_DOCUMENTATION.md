# PlanPal+ Project File Documentation

This document provides a comprehensive overview of all files in the PlanPal+ project, their purposes, and key functionalities.

---

## 📁 Backend Structure

### Configuration Files

#### `backend/config.py`
**Purpose:** Application configuration management for different environments
- **Classes:**
  - `Config`: Base configuration with database, JWT, security settings
  - `DevelopmentConfig`: Development-specific settings
  - `ProductionConfig`: Production-specific settings
- **Key Areas:**
  - Database: Supabase PostgreSQL connection via pooler
  - JWT: Token expiration and secret keys
  - Security: Encryption keys, CORS, input validation limits
  - Supabase: API keys and storage configuration

#### `backend/run.py`
**Purpose:** Main application entry point and Flask CLI commands
- **Functions:**
  - `create_app()`: Initialize Flask application
  - `make_shell_context()`: Provide models in Flask shell
  - `health_check()`: Root endpoint to verify server
  - `api_endpoints()`: List all available API endpoints
  - `init_db()`: CLI command to initialize database
  - `seed_db()`: CLI command for sample data

---

### Application Core

#### `backend/app/__init__.py`
**Purpose:** Flask application factory and extension initialization
- **Extensions:**
  - SQLAlchemy (database ORM)
  - Flask-Migrate (database migrations)
  - Flask-CORS (cross-origin requests)
  - Flask-JWT-Extended (JWT authentication)
  - Flask-Bcrypt (password hashing)
  - Flask-Mail (email support)
- **Blueprints Registered:**
  - `/api/auth` - Authentication routes
  - `/api/users` - User profile routes
  - `/api/events` - Event management routes
  - `/api/notifications` - Notification routes
  - `/api/search` - Search routes
  - `/api/system` - System health routes
  - `/api/tags` - Tag management routes

---

### Routes (API Endpoints)

#### `backend/app/routes/auth.py`
**Purpose:** User authentication and profile management
- **Routes:**
  - `POST /api/auth/register` - Register new user account
  - `POST /api/auth/login` - Login with email and password
  - `POST /api/auth/logout` - Logout user (invalidate tokens)
  - `POST /api/auth/refresh` - Refresh access token
  - `GET /api/auth/profile` - Get current user profile (JWT required)
  - `PUT /api/auth/profile` - Update user profile (JWT required)
  - `POST /api/auth/change-password` - Change user password (JWT required)
  - `GET /api/auth/debug-users` - Debug endpoint to list users

#### `backend/app/routes/events.py`
**Purpose:** Event CRUD operations and participation management
- **Routes:**
  - `GET /api/events/` - List all events with pagination and filters
  - `POST /api/events/` - Create new event
  - `GET /api/events/<event_id>` - Get detailed event information
  - `PUT /api/events/<event_id>` - Update event details (creator only)
  - `POST /api/events/<event_id>/join` - Join an event
  - `DELETE /api/events/<event_id>/leave` - Leave an event
  - `PUT /api/events/<event_id>/update-status` - Update participation status
  - `GET /api/events/my` - Get events created by current user
  - `GET /api/events/joined` - Get events user has joined
  - `GET /api/events/<event_id>/participation_status` - Check participation

#### `backend/app/routes/notifications.py`
**Purpose:** User notification management
- **Routes:**
  - `GET /api/notifications/` - Get user notifications with pagination
  - `POST /api/notifications/` - Create new notification
  - `PUT /api/notifications/<id>/mark-read` - Mark notification as read
  - `PUT /api/notifications/mark-all-read` - Mark all as read
  - `DELETE /api/notifications/<id>` - Delete specific notification
  - `DELETE /api/notifications/` - Delete all notifications
  - `GET /api/notifications/types` - Get available notification types
  - `GET /api/notifications/unread_count` - Get unread count
  - `GET /api/notifications/settings` - Get notification preferences
  - `PUT /api/notifications/settings` - Update preferences
  - `POST /api/notifications/push/subscribe` - Subscribe to push
  - `DELETE /api/notifications/push/unsubscribe` - Unsubscribe from push
  - `POST /api/notifications/test` - Send test notification

#### `backend/app/routes/search.py`
**Purpose:** Unified search across events, users, and tags
- **Routes:**
  - `GET /api/search/` - Unified search with filters
- **Query Parameters:**
  - `q`: Search query text
  - `type`: 'all', 'events', 'users', 'tags'
  - `limit`: Maximum results per type
  - `tag_ids`: Comma-separated tag IDs
  - `location`: Location filter
  - `sort_by`: 'relevance', 'date'

#### `backend/app/routes/system.py`
**Purpose:** System health checks and version information
- **Routes:**
  - `GET /api/system/health` - Health check with database test
  - `GET /api/system/version` - API version and build info

#### `backend/app/routes/tags.py`
**Purpose:** Tag management for categorization
- **Routes:**
  - `GET /api/tags/` - Get all available tags
  - `POST /api/tags/` - Create new tag (admin only)
  - `PUT /api/tags/<id>` - Update tag (admin only)
  - `DELETE /api/tags/<id>` - Delete tag (admin only)
  - `GET /api/tags/popular` - Get most used tags

#### `backend/app/routes/users.py`
**Purpose:** User profile and search functionality
- **Routes:**
  - `GET /api/users/profile` - Get current user's profile
  - `GET /api/users/search` - Search users by name/email
  - `GET /api/users/<user_id>` - Get specific user's public profile

---

### Models (Database)

#### `backend/app/models/__init__.py`
**Purpose:** SQLAlchemy database models
- **Models:**
  - `User`: User accounts with authentication
  - `Event`: Events with location and timing
  - `Participation`: User-event relationships
  - `Notification`: User notifications
  - `Tag`: Categorization tags
  - `UserTag`: User interests/preferences
  - `EventTag`: Event categories

---

### Services (Business Logic)

#### `backend/app/services/event_service.py`
**Purpose:** Event business logic beyond CRUD
- **Methods:**
  - `create_event()` - Create event with tags
  - `update_event()` - Update with authorization
  - `delete_event()` - Soft delete with authorization
  - `get_event_details()` - Get with tags and participants
  - `search_events()` - Advanced search
  - `get_recommended_events()` - Personalized recommendations
  - `join_event()` / `leave_event()` - Participation management
  - `add_event_tags()` / `remove_event_tags()` - Tag management
  - `get_popular_events()` - Most participated events

#### `backend/app/services/notification_service.py`
**Purpose:** Notification creation and management
- **Methods:**
  - `create_notification()` - Create single notification
  - `notify_event_participants()` - Batch notify participants
  - `notify_new_participant()` - Creator notification
  - `notify_user_joined_event()` - User confirmation
  - `notify_participant_left()` - Leave notification
  - `notify_event_update()` - Update notification
  - `notify_event_reminder()` - Reminder before event
  - `notify_event_cancelled()` - Cancellation notice
  - `clean_old_notifications()` - Cleanup old notifications

#### `backend/app/services/task_scheduler.py`
**Purpose:** Background task scheduler
- **Tasks:**
  - Mark expired events as inactive (every 5 minutes)
- **Methods:**
  - `start()` - Start background scheduler
  - `stop()` - Stop scheduler gracefully

---

### Utilities

#### `backend/app/utils/security.py`
**Purpose:** Security features and decorators
- **SecurityManager Methods:**
  - `generate_secure_token()` - Cryptographic tokens
  - `hash_password()` / `verify_password()` - Bcrypt hashing
  - `sanitize_input()` - XSS prevention
  - `validate_ip_address()` - IP validation
  - `generate_csrf_token()` / `verify_csrf_token()` - CSRF protection
- **Decorators:**
  - `@require_auth()` - Authentication required/optional
  - `@admin_required` - Admin privileges required
  - `@validate_request_data()` - Request validation
  - `@rate_limit()` - Rate limiting
- **Functions:**
  - `add_security_headers()` - Security HTTP headers
  - `log_security_event()` - Security logging
  - `check_permissions()` - Resource permissions

#### `backend/app/utils/supabase_client.py`
**Purpose:** Supabase integration for Storage and Realtime
- **Methods:**
  - `init_app(app)` - Initialize with Flask app
  - `upload_file()` - Upload to Storage
  - `get_public_url()` - Get file URL
  - `delete_file()` - Remove file
  - `query_table()` - Direct table queries

#### `backend/app/utils/validators.py`
**Purpose:** Input validation and sanitization
- **Validators:**
  - `validate_email()` - Email format with security
  - `validate_password()` - Strong password requirements
  - `validate_text_length()` - Length limits
  - `validate_name()` - Name format
  - `validate_phone()` - Phone number format
  - `validate_uuid()` - UUID format
- **Sanitizers:**
  - `sanitize_filename()` - Safe filenames
  - `sanitize_search_query()` - Prevent SQL injection
- **Formatters:**
  - `format_currency()` - Currency formatting
  - `truncate_text()` - Text truncation
  - `generate_event_slug()` - URL-friendly slugs

---

## 📁 Frontend Structure

### Core Application

#### `frontend/src/App.jsx`
**Purpose:** Root component with routing and providers
- **Features:**
  - React Router setup
  - Authentication context
  - Theme context
  - Protected/public route wrappers
  - Toast notifications
  - Layout wrapper

#### `frontend/src/main.jsx`
**Purpose:** Application entry point
- Mounts React app to DOM
- Includes global styles

---

### Context (State Management)

#### `frontend/src/context/AuthContext.jsx`
**Purpose:** Global authentication state
- **State:**
  - `isAuthenticated` - Login status
  - `user` - Current user object
  - `loading` - Loading state
  - `error` - Error messages
- **Methods:**
  - `login()` - Authenticate user
  - `register()` - Create account
  - `logout()` - Sign out
  - `updateProfile()` - Update profile
  - `changePassword()` - Change password

#### `frontend/src/context/ThemeContext.jsx`
**Purpose:** Dark/light theme management
- **State:**
  - `isDark` - Dark mode enabled
  - `theme` - 'dark' or 'light'
- **Methods:**
  - `toggleTheme()` - Switch themes
- **Features:**
  - localStorage persistence
  - System preference detection
  - Tailwind CSS integration

---

### API Services

#### `frontend/src/api/authApi.js`
**Purpose:** Authentication API calls
- **Endpoints:**
  - `register()` - POST /api/auth/register
  - `login()` - POST /api/auth/login
  - `logout()` - POST /api/auth/logout
  - `refresh()` - POST /api/auth/refresh
  - `getProfile()` - GET /api/auth/profile
  - `updateProfile()` - PUT /api/auth/profile
  - `changePassword()` - POST /api/auth/change-password

#### `frontend/src/api/eventsApi.js`
**Purpose:** Event API calls
- **Endpoints:**
  - `getAllEvents()` - List events
  - `createEvent()` - Create event
  - `getEventDetails()` - Event details
  - `updateEvent()` - Update event
  - `joinEvent()` - Join event
  - `leaveEvent()` - Leave event
  - `updateEventStatus()` - Update participation
  - `getParticipationStatus()` - Check status
  - `getMyEvents()` - Created events
  - `getJoinedEvents()` - Joined events
  - `searchEvents()` - Search with filters

#### `frontend/src/api/notificationsApi.js`
**Purpose:** Notification API calls
- **Endpoints:**
  - `getNotifications()` - Fetch notifications
  - `markAsRead()` - Mark as read
  - `markAllAsRead()` - Mark all read
  - `deleteNotification()` - Delete one
  - `deleteAllNotifications()` - Delete all
  - `getUnreadCount()` - Unread count
  - `getSettings()` / `updateSettings()` - Preferences
  - `subscribePush()` / `unsubscribePush()` - Push notifications

#### `frontend/src/api/searchApi.js`
**Purpose:** Search API calls
- **Endpoints:**
  - `search()` - Unified search
  - `searchEvents()` - Events only
  - `searchUsers()` - Users only
  - `searchTags()` - Tags only
  - `searchByLocation()` - Location filter
  - `searchByTags()` - Tag filter
  - `getSearchSuggestions()` - Auto-complete
  - `autoComplete()` - Quick suggestions

#### `frontend/src/api/systemApi.js`
**Purpose:** System and platform API calls
- **Endpoints:**
  - `getHealthStatus()` - Health check
  - `getVersion()` - Version info
  - `reportBug()` - Bug reports
  - `sendFeedback()` - User feedback
  - `getFAQ()` - FAQs
  - Multiple other system endpoints

#### `frontend/src/api/tagsApi.js`
**Purpose:** Tag management API calls
- **Endpoints:**
  - `getAllTags()` - List all tags
  - `getPopularTags()` - Most used tags
  - `createTag()` - Create tag (admin)
  - `updateTag()` - Update tag (admin)
  - `deleteTag()` - Delete tag (admin)
  - `searchTags()` - Search tags

#### `frontend/src/api/usersApi.js`
**Purpose:** User management API calls
- **Endpoints:**
  - `getUserProfile()` - Get user profile
  - `updateProfile()` - Update profile
  - `uploadProfilePicture()` - Upload image
  - `searchUsers()` - Search users
  - `getUserStats()` - User statistics
  - `blockUser()` / `unblockUser()` - Block management
  - `deactivateAccount()` / `deleteAccount()` - Account operations

---

### Services (Frontend)

#### `frontend/src/services/axiosInstance.js`
**Purpose:** Configured HTTP client
- **Features:**
  - Base URL configuration
  - Request interceptor (adds JWT token)
  - Response interceptor (handles 401, token refresh)
  - Automatic retry on token refresh
  - Auto-logout on session expiry

#### `frontend/src/services/tokenService.js`
**Purpose:** JWT token management
- **Methods:**
  - `getAccessToken()` - Get from localStorage
  - `getRefreshToken()` - Get refresh token
  - `setTokens()` - Store tokens
  - `clearTokens()` - Remove tokens
  - `isTokenValid()` - Check expiration
  - `isAuthenticated()` - Check login status

#### `frontend/src/services/heartbeatService.js`
**Purpose:** Keep-alive service for session maintenance

---

### Components

#### Layout Components
- `frontend/src/components/layout/Layout.jsx` - Main layout wrapper
- `frontend/src/components/layout/Navbar.jsx` - Navigation bar
- `frontend/src/components/layout/Footer.jsx` - Footer component
- `frontend/src/components/layout/NotificationBell.jsx` - Notification icon
- `frontend/src/components/layout/SearchBar.jsx` - Search input

#### Common Components
- `frontend/src/components/common/ProtectedRoute.jsx` - Auth guard
- `frontend/src/components/common/PublicRoute.jsx` - Redirect if logged in

#### UI Components
- `frontend/src/components/ui/EventCard.jsx` - Event display card
- `frontend/src/components/ui/UpcomingEventCard.jsx` - Upcoming event card
- `frontend/src/components/ui/UserCard.jsx` - User profile card
- `frontend/src/components/ui/MatchCard.jsx` - Match display card
- `frontend/src/components/ui/TagChip.jsx` - Tag badge
- `frontend/src/components/ui/Loading.jsx` - Loading spinner

---

### Pages

#### Public Pages
- `frontend/src/pages/Home.jsx` - Landing page
- `frontend/src/pages/auth/Login.jsx` - Login form
- `frontend/src/pages/auth/Register.jsx` - Registration form

#### Protected Pages
- `frontend/src/pages/Dashboard.jsx` - User dashboard
- `frontend/src/pages/Events.jsx` - Browse all events
- `frontend/src/pages/EventDetails.jsx` - Event detail page
- `frontend/src/pages/CreateEvent.jsx` - Create event form
- `frontend/src/pages/EditEvent.jsx` - Edit event form
- `frontend/src/pages/Calendar.jsx` - Calendar view
- `frontend/src/pages/Profile.jsx` - User profile
- `frontend/src/pages/Notifications.jsx` - Notifications center
- `frontend/src/pages/Search.jsx` - Search page
- `frontend/src/pages/UpcomingEvents.jsx` - Upcoming events list

---

### Utilities

#### `frontend/src/utils/dateUtils.js`
**Purpose:** Date formatting and manipulation helpers

#### `frontend/src/utils/validators.js`
**Purpose:** Frontend input validation

#### `frontend/src/utils/helpers.js`
**Purpose:** General utility functions

---

## 📁 Database

#### `database/init.sql`
**Purpose:** Initial database schema

#### `database/supabase_migration.sql`
**Purpose:** Supabase-specific migration script

#### `database/supabase_rls_policies.sql`
**Purpose:** Row-level security policies for Supabase

---

## 📁 Configuration Files

#### `frontend/package.json`
**Purpose:** Frontend dependencies and scripts

#### `frontend/vite.config.js`
**Purpose:** Vite build configuration

#### `frontend/tailwind.config.js`
**Purpose:** Tailwind CSS configuration

#### `frontend/postcss.config.js`
**Purpose:** PostCSS configuration for Tailwind

#### `backend/requirements.txt`
**Purpose:** Python dependencies

---

## 🔑 Key Features Summary

### Backend Features
- JWT authentication with refresh tokens
- Bcrypt password hashing
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Security headers
- Notification system
- Background task scheduling
- Tag-based categorization
- Event recommendations
- Search functionality
- Supabase integration

### Frontend Features
- React 18 with hooks
- React Router for navigation
- Context API for state management
- Axios for HTTP requests
- JWT token management
- Automatic token refresh
- Toast notifications
- Dark/light theme
- Responsive design with Tailwind CSS
- Protected routes
- Search functionality
- Event management
- User profiles
- Notifications center

---

## 📊 API Route Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/auth/register | Register user | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout | Yes |
| GET | /api/auth/profile | Get profile | Yes |
| PUT | /api/auth/profile | Update profile | Yes |
| GET | /api/events/ | List events | No |
| POST | /api/events/ | Create event | Yes |
| GET | /api/events/:id | Event details | No |
| POST | /api/events/:id/join | Join event | Yes |
| DELETE | /api/events/:id/leave | Leave event | Yes |
| GET | /api/notifications/ | Get notifications | Yes |
| PUT | /api/notifications/:id/mark-read | Mark as read | Yes |
| GET | /api/search/ | Unified search | No |
| GET | /api/tags/ | List tags | No |
| GET | /api/users/search | Search users | Yes |
| GET | /api/system/health | Health check | No |

---

## 🎯 Technology Stack

### Backend
- **Framework:** Flask
- **Database:** PostgreSQL (via Supabase)
- **ORM:** SQLAlchemy
- **Authentication:** Flask-JWT-Extended
- **Password Hashing:** Bcrypt
- **Migrations:** Flask-Migrate
- **CORS:** Flask-CORS
- **Storage:** Supabase Storage

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS
- **Notifications:** React Hot Toast
- **State:** Context API

### Database
- **Primary:** PostgreSQL (Supabase)
- **Features:** Row-level security, UUID keys, JSON columns

---

*Last Updated: October 2025*
