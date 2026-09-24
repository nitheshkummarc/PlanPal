# PlanPal Project File Documentation

File-by-file overview of the codebase. Updated 2026-09-25 to match the code.

---

## 📁 Backend Structure

### Configuration Files

#### `backend/config.py`
**Purpose:** Environment-specific settings
- `Config` — database URL (`SUPABASE_DATABASE_URL`), pool options, JWT lifetimes (access 30 min, refresh 7 days), rate-limit storage (`REDIS_URL` or in-memory), `PROXY_FIX_X_FOR`, `FORCE_HTTPS`, `ALLOWED_ORIGINS`, `ENABLE_TASK_SCHEDULER`
- `DevelopmentConfig` — debug on, SQLite fallback when no database URL is set
- `TestingConfig` — in-memory SQLite, limiter and scheduler off
- `ProductionConfig` — 1 trusted proxy hop, HTTPS forced; `validate()` refuses to start without `SECRET_KEY`, `JWT_SECRET_KEY`, `SUPABASE_DATABASE_URL` and a non-localhost `ALLOWED_ORIGINS`

#### `backend/run.py`
**Purpose:** Entry point (`python run.py` in dev, `gunicorn run:app` in production)
- `/` health message, `/api` endpoint listing, `flask init_db` CLI command

#### `backend/requirements.txt` / `backend/requirements-dev.txt`
Runtime dependencies (pinned) / runtime + pytest for tests and CI.

### Application Core

#### `backend/app/__init__.py`
**Purpose:** Application factory `create_app(config_name)`
- Extensions: SQLAlchemy, Flask-Migrate, CORS (explicit origins), JWT, Bcrypt, Flask-Limiter
- ProxyFix (real client IP behind Render/nginx) and HTTPS redirect (308, health checks exempt)
- JWT loaders: consistent error bodies and the logout denylist check (`revoked_tokens`)
- Hooks: security headers, `success` flag on every JSON body, CORS preflight
- Error handlers: 404, 413, 429, 500 and every other HTTP error return `{"success": false, "error": "..."}`
- Starts the task scheduler when `ENABLE_TASK_SCHEDULER` is on

### Routes (API Endpoints) — 42 endpoints

#### `backend/app/routes/auth.py`
- `POST /api/auth/register`, `POST /api/auth/login` (5/min per IP), `POST /api/auth/logout` (revokes access + refresh token), `POST /api/auth/refresh`, `GET|PUT /api/auth/profile`, `POST /api/auth/change-password`
- Shared profile validation for register and update; case-insensitive username uniqueness; constant-time login for unknown emails

#### `backend/app/routes/events.py`
- `GET /api/events/` — upcoming events (filters: city, state, location, date_from, date_to; sort_by date|created_at)
- `POST /api/events/`, `GET|PUT|DELETE /api/events/<id>` (detail works for past events; delete notifies participants)
- `POST /<id>/join` (row lock + single commit), `DELETE /<id>/leave`, `PUT /<id>/update-status` (interested/going), `GET /<id>/participation_status`
- `GET /my`, `GET /joined` — past and upcoming, paginated (max 100 per page)
- Helpers reused by search: `apply_date_filters()`, `serialize_events()` (tags in one query)

#### `backend/app/routes/notifications.py`
- `GET /` (paginated, `unread_count`), `POST /`, `DELETE /`, `PUT /<id>/mark-read`, `PUT /<id>/mark-unread`, `PUT /mark-all-read`, `DELETE /<id>`, `GET /types`, `GET /unread_count`, `POST /test`
- Every route only touches the current user's notifications

#### `backend/app/routes/search.py`
- `GET /api/search/` — events (by name and/or tags, location, dates; past events included, upcoming first), users (public fields only), tags

#### `backend/app/routes/system.py`
- `GET /health` (liveness), `GET /ready` (database check), `GET /version`

#### `backend/app/routes/tags.py`
- `GET /`, `GET /search`, `GET /popular`, `GET /<id>`; admin-only `POST /`, `PUT /<id>`, `DELETE /<id>`

#### `backend/app/routes/users.py`
- `GET /profile`, `GET /search`, `GET /<id>` (email only on your own profile)

### Models (Database)

#### `backend/app/models/__init__.py`
`User`, `Event`, `Participation`, `Notification`, `Tag`, `UserTag`, `EventTag`, `RevokedToken` — constraints and ON DELETE rules match `database/init.sql`.

### Services (Business Logic)

#### `backend/app/services/notification_service.py`
Adds notifications to the session (never commits — the route commits once): new participant, joined, left, event updated, event cancelled.

#### `backend/app/services/task_scheduler.py`
Every 5 minutes: mark past events expired, one reminder per participant for events within 24 hours (idempotent), delete expired revoked tokens. PostgreSQL advisory locks make it safe with several workers.

### Utilities

#### `backend/app/utils/validators.py`
Request body parsing (`get_json_body`), user rules (email, password, username, name, URL, preferences, colour — mirrored in the frontend), event rules, LIKE-pattern escaping.

#### `backend/app/utils/responses.py`
`error_response()` — client-safe error in the standard shape; logs details server-side.

#### `backend/app/utils/security.py`
`add_security_headers()` — nosniff, frame denial, HSTS, CSP on API responses.

### Tests — `backend/tests/` (86 tests)
Auth, config, API contracts, validation, transactions, rate limiting, search, security, `test_bug_fixes.py` and `test_end_to_end_fixes.py` (regressions for every fixed bug).

---

## 📁 Frontend Structure

### Core Application

#### `frontend/src/App.tsx`
Routes, providers and layout. Entry pages (Home, Login, Register, Dashboard) are bundled; all other pages are lazy-loaded. Public: `/`, `/login`, `/register`, `/privacy`, `/terms`, `/404` + unknown URLs. Protected: dashboard, events, event details/edit, create event, calendar, profile, notifications, search, upcoming events, `/users/:id`.

#### `frontend/src/main.tsx`
Mounts `<App />`.

#### `frontend/src/config.ts`
`BYPASS_AUTH` (offline preview; never active in production builds) and `IS_TEST_ENV`.

### Context (State Management)
- `context/AuthContext.tsx` — user, login/register/logout/profile/password actions
- `context/ThemeContext.tsx` — light/dark theme (saved in localStorage)

### API Services (`frontend/src/api/`)
- `authApi.ts` — auth endpoints (logout sends the refresh token so it is revoked too)
- `eventsApi.ts` — events, participation, my/joined events
- `notificationsApi.ts` — notifications
- `searchApi.ts` — unified search and navbar suggestions
- `tagsApi.ts` — tags
- `usersApi.ts` — profiles and user search

### Services
- `services/axiosInstance.ts` — base URL (upgraded to HTTPS on HTTPS pages), Bearer token, one shared token refresh for concurrent 401s, logout on refresh failure
- `services/tokenService.ts` — token storage and expiry check

### Components
- Layout: `Layout`, `Navbar`, `Footer` (placeholder links go to `/404`), `NotificationBell`, `SearchBar`
- Common: `ProtectedRoute` (remembers the requested page for after login), `PublicRoute`
- UI: `EventCard`, `UpcomingEventCard`, `UserCard`, `TagChip`, `Loading`

### Pages (`frontend/src/pages/`)
- Public: `Home`, `auth/Login`, `auth/Register`, `legal/PrivacyPolicy`, `legal/TermsOfService`, `NotFound`
- Protected: `Dashboard`, `Events`, `EventDetails` (participants, interested/going toggle), `CreateEvent`, `EditEvent`, `Calendar`, `Profile`, `Notifications`, `Search`, `UpcomingEvents`, `UserProfile`

### Utilities
- `utils/validators.ts` — form rules (same as the backend) and schemas
- `utils/helpers.ts` — `getApiErrorMessage()`, `notifyEventsChanged()` / `onEventsChanged()` (cross-page refresh), price formatting
- `utils/dateUtils.ts` — local-time date formatting
- `hooks/useApi.ts` — `useApi`, `usePagination`, `useDebounce`
- `schemas/` — Zod schemas used as the source of TypeScript types

### Tests — `frontend/src/__tests__/` (37 tests)
AuthContext, ProtectedRoute, config, tokenService, validators, helpers.

---

## 📁 Database

#### `database/init.sql`
Tables, constraints, indexes, `updated_at` triggers and sample tags. Runs on Supabase and plain PostgreSQL.

#### `database/migrations/001_align_existing_schema.sql`
Optional one-time migration for databases created before 2026-09-25.

---

## 📁 Configuration & Deployment

- `render.yaml` — backend on Render (HTTPS health check on `/api/system/ready`, scheduler on)
- `frontend/vercel.json` — SPA rewrite, HSTS and security headers, long-term caching of built assets
- `frontend/vite.config.ts` — dev server on 5173, API URL injection (warns if unset in production)
- `Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.local.yml` — local container setup
- `.github/workflows/ci.yml` — backend pytest + frontend build and Vitest on every push
