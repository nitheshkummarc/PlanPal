# PlanPal

[![CI](https://github.com/nitheshkummarc/PlanPal/actions/workflows/ci.yml/badge.svg)](https://github.com/nitheshkummarc/PlanPal/actions)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?logo=flask)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)

An event platform: users create local events, find upcoming ones by text, tag, place and date,
join them as *interested* or *going*, and get in-app notifications when events they are part
of change or are about to start. React and TypeScript on the frontend, a Flask REST API, and
PostgreSQL on Supabase.

**Frontend (Vercel):** https://planpal-silk.vercel.app
**API health (Render):** https://planpal-backend-wcsc.onrender.com/api/system/health

---

## At a glance

- **32 REST endpoints** (auth, events and participation, notifications, search, tags, users, health), all used by the frontend except the two health probes
- **332 automated tests**: 276 backend (pytest) and 56 frontend (Vitest); CI also runs ESLint and the TypeScript compiler
- **JWT authentication** with access and refresh tokens; logout revokes both, and changing the password ends every other session
- **Relational schema** with UUID keys, foreign keys with `ON DELETE` rules, `UNIQUE` and `CHECK` constraints, case-insensitive unique indexes and trigram indexes for search
- **Race-safe participation**: join, leave and capacity changes lock the event row, and the participation, cached participant count and notifications are committed together
- **Background jobs**: 24-hour event reminders and cleanup of revoked tokens, safe to run in several workers
- **One response shape**: `{"success": true, ...}` or `{"success": false, "error": "..."}`

---

## Product preview

| Dashboard | Search |
| --- | --- |
| ![Dashboard](./assets/dashboard.png) | ![Search](./assets/search.png) |
| **Event page** | **Event card** |
| ![Event page](./assets/eventpage.png) | ![Event card](./assets/Eventcard.png) |

---

## Architecture

![PlanPal system architecture](./assets/architecture.png?v=2)

```
Browser (React SPA, Vercel)
  pages -> api/*.ts -> axios client (attaches the access token; on 401 refreshes once and retries)
      | HTTPS, JSON
Flask API (Render, gunicorn)
  JWT check (signature, expiry, revocation, account state) -> route blueprint
  -> validation -> SQLAlchemy -> Supabase PostgreSQL
  background thread: reminders, revoked-token cleanup
```

Business rules live in the route handlers (`backend/app/routes`); query building shared by
the event list and search lives in `backend/app/services/event_queries.py`, and
notification creation in `backend/app/services/notification_service.py`. A detailed walk
through the request flows is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Data model

![PlanPal entity-relationship diagram](./assets/ER%20diagram.png)

Eight tables: `users`, `events`, `participations` (users ↔ events), `notifications`, `tags`,
`user_tags` (interests), `event_tags` (categories) and `revoked_tokens`. The full
entity-relationship diagram, constraints and indexes are in [docs/DATABASE.md](docs/DATABASE.md).

Rules enforced by the database (see [database/init.sql](database/init.sql)):
- one participation per user per event; an organiser cannot create two events with the same title at the same time
- a paid event has a price greater than 0, a free event has none; capacity is positive
- deleting an event removes its participations and tag links and keeps its notifications (with `event_id` set to NULL)
- emails are lower case; usernames and tag names are unique ignoring case
- Row Level Security is enabled on every table, so the Supabase Data API cannot read them; the API connects as the table owner

The SQLAlchemy models mirror `init.sql` name for name, and a test fails if they drift apart.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Axios, React Router, Zod (type definitions) |
| Backend | Python 3.11, Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-CORS, Flask-Limiter |
| Database | PostgreSQL on Supabase (`pg_trgm` for search) |
| Hosting | Vercel (frontend), Render (API), Supabase (database) |
| Tooling | pytest, Vitest, ESLint, GitHub Actions |

---

## Getting started

Prerequisites: Python 3.11, Node.js 20, and a Supabase project.

### 1. Database (Supabase)

In the Supabase SQL editor, run [database/init.sql](database/init.sql) on a new project.
A database created before 2026-09-29 is upgraded instead with
[database/migrations/001_align_existing_schema.sql](database/migrations/001_align_existing_schema.sql);
read its header first. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # set SUPABASE_DATABASE_URL and the secrets
python run.py                      # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                        # http://localhost:5173
```

To make yourself an administrator (tag management), set `role = 'admin'` on your user in Supabase.

---

## Testing

```bash
cd backend && pip install -r requirements-dev.txt && pytest tests -q
cd frontend && npm run lint && npm run build && npm test
```

Backend tests run against an in-memory SQLite database built from the models, so they need
no external services. `npm run build` type-checks before building.

---

## API

32 REST endpoints in 7 route groups:

| Resource | Base path | Endpoints | Description |
| --- | --- | ---: | --- |
| Auth | `/api/auth` | 7 | Register, login, logout, token refresh, profile get/update (including interests), change password |
| Events | `/api/events` | 10 | Upcoming list with filters and pagination, create, detail (participants and your status), update, delete, join, leave, interested/going, my events, joined events |
| Notifications | `/api/notifications` | 7 | List with filter and pagination, unread count, mark read/unread, mark all read, delete, delete all |
| Search | `/api/search` | 1 | Events (past and upcoming) and people, by text, tags, location and date |
| Tags | `/api/tags` | 4 | List; create, update and delete (admin) |
| Users | `/api/users` | 1 | A user's profile |
| System | `/api/system` | 2 | Health and readiness probes for the hosting platform |
| **Total** | | **32** | 12 GET · 8 POST · 7 PUT · 5 DELETE |

Every endpoint except register, login, refresh and the probes requires `Authorization: Bearer <token>`.
Full reference: [docs/ROUTE_DOCUMENTATION.md](docs/ROUTE_DOCUMENTATION.md).

--- | --- |
| Auth | register, login, logout, refresh, get/update profile (including interests), change password |
| Events | upcoming list with filters and pagination, create, detail (participants and your status), update, delete, join, leave, interested/going, my events, joined events |
| Notifications | list with filter and pagination, unread count, mark read/unread, mark all read, delete, delete all |
| Search | events (past and upcoming) and people, by text, tags, location and date |
| Tags | list; create, update and delete (admin) |
| Users | a user's profile |
| System | health and readiness probes for the hosting platform |

Every endpoint except register, login, refresh and the probes requires `Authorization: Bearer <token>`.
Full reference: [docs/ROUTE_DOCUMENTATION.md](docs/ROUTE_DOCUMENTATION.md).

---

## Known trade-offs

- Tokens are kept in `localStorage`; an XSS flaw could expose them. React escapes rendered content and no raw HTML is injected.
- Rate limits are counted per process unless `REDIS_URL` is set; the Render service runs one process.
- The scheduler runs inside the web process. On Render's free tier the service sleeps when idle, so reminders are sent on the first tick after it wakes.
- Search uses `ILIKE` with trigram indexes, not full-text ranking; results are ordered by date.

---

## Repository layout

```text
backend/
  app/
    models/      SQLAlchemy models (mirror database/init.sql)
    routes/      Blueprints: auth, users, events, notifications, search, tags, system
    services/    Event queries, notifications, background scheduler
    utils/       Validation, query parameters, responses, security headers
  tests/         pytest suite
  config.py      Configuration from environment variables
  run.py         Entry point
database/
  init.sql       Schema for a new database
  migrations/    Upgrade for databases created before 2026-09-29
frontend/
  src/
    api/         One client per API area
    components/  Layout, shared UI, event form
    context/     Auth and theme
    pages/       Route pages
    schemas/     Zod schemas that define the API data types
docs/            Architecture, database, API reference, SQL reference, deployment
```
