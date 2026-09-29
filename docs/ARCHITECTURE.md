# Architecture

![PlanPal system architecture](../assets/architecture.png?v=2)

PlanPal has three parts:

| Part | Hosting | Code |
| --- | --- | --- |
| React single-page app | Vercel | `frontend/` |
| Flask REST API | Render (gunicorn) | `backend/` |
| PostgreSQL | Supabase | `database/init.sql` |

The browser talks to the API directly over HTTPS (`VITE_API_BASE_URL`), so the API allows
the frontend origin through an explicit CORS list. The API is the only client of the
database: it connects with the Supabase connection string, and Row Level Security blocks the
Supabase Data API from every table.

---

## Backend

`app/__init__.py` builds the app: configuration, extensions, JWT callbacks, error handlers,
the HTTPS redirect, security headers and the blueprints.

| Module | Responsibility |
| --- | --- |
| `routes/auth.py` | Registration, login, logout, token refresh, profile, password change |
| `routes/events.py` | Event CRUD, join, leave, participation status, the caller's lists |
| `routes/search.py` | Search across events and people |
| `routes/notifications.py` | The caller's notifications |
| `routes/tags.py` | Tag list and admin changes |
| `routes/users.py` | A user's profile |
| `routes/system.py` | Health and readiness probes |
| `services/event_queries.py` | Filters and sorting shared by the event list and search |
| `services/notification_service.py` | Creates notifications inside the caller's transaction |
| `services/task_scheduler.py` | Background reminders and revoked-token cleanup |
| `utils/validators.py` | Input rules (mirrored in `frontend/src/utils/validators.ts`) |
| `utils/query_params.py` | Pagination, UUID lists, date ranges, enumerated values |
| `models/__init__.py` | SQLAlchemy models, mirroring `database/init.sql` |

Route handlers validate input, apply the business rules and commit once. Invalid input raises
`ValidationError` (400); any unexpected exception reaches one handler that rolls back, logs the
traceback and returns a generic 500.

### Authentication

- Login and registration return a 30-minute access token and a 7-day refresh token. Both carry
  the user's `token_version`.
- On every authenticated request, one query checks that the user exists and is active, that
  the token's id is not in `revoked_tokens` (logout), and that its `token_version` is current.
  Changing the password increments `token_version`, which ends all other sessions.
- Authorization is checked in the handlers from the database: organiser for editing an event,
  organiser or admin for deleting it, admin role for tag changes, and ownership for
  notifications.

### Transactions and concurrency

- Joining, leaving and changing capacity lock the event row (`SELECT ... FOR UPDATE`) before
  reading or recounting `current_participants`, so concurrent requests are serialised.
- Notifications are added to the same session and committed with the change that caused them.
- Unique constraints are the final guard against duplicates (participations, events with the
  same title and time, usernames and tag names ignoring case).

### Background jobs

When `ENABLE_TASK_SCHEDULER=true`, a daemon thread runs every five minutes:

1. Reminders: one per participant for events starting within 24 hours. A reminder only counts
   for the event's current time, so rescheduling produces a new one and repeated ticks never
   duplicate it.
2. Cleanup: revoked-token rows past their expiry are deleted.

Each job takes a transaction-level advisory lock, so if several workers run the scheduler only
one does the work per tick.

---

## Frontend

| Area | Responsibility |
| --- | --- |
| `services/axiosInstance.ts` | Attaches the access token; on a 401 refreshes once (shared by concurrent requests) and retries; ends the session only when the refresh token is rejected |
| `context/AuthContext.tsx` | Restores the session on load, login, register, logout, profile and password changes |
| `components/common/ProtectedRoute.tsx` | Waits for the session check, then redirects signed-out users to `/login`, keeping the requested page |
| `api/*.ts` | One typed client per API area |
| `schemas/*.ts` | Zod schemas that define the TypeScript types of API data |
| `components/events/EventForm.tsx` | The form shared by Create Event and Edit Event |
| `utils/helpers.ts` | Error messages, prices, and signals that refresh other pages and tabs after a change |

Times are sent and received in UTC. Everything shown to the user, including calendar days and
date filters, uses the viewer's local time zone.

---

## Request flow: joining an event

1. `EventDetails` calls `eventsApi.joinEvent(id)`; axios adds the access token.
2. Flask verifies the token and runs the account and revocation check.
3. `join_event` locks the event row, checks that the user has not joined, that the event is in
   the future and that it is not full.
4. It inserts the participation, recounts participants, and adds a notification for the
   organiser and one for the participant.
5. One commit saves all of it; any failure rolls all of it back.
6. The page reloads the event and signals the Dashboard and Calendar (in this and other tabs)
   to refresh.

## Further reading

- [DATABASE.md](DATABASE.md): ER diagram, constraints, indexes
- [ROUTE_DOCUMENTATION.md](ROUTE_DOCUMENTATION.md): API reference
- [EVENT_ROUTES_ORM_SQL_REFERENCE.md](EVENT_ROUTES_ORM_SQL_REFERENCE.md): SQL executed by the event routes
- [DEPLOYMENT.md](DEPLOYMENT.md): Supabase, Render and Vercel setup
