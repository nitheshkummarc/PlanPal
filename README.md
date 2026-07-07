# PlanPal

A community-driven event platform for discovering, organizing, and participating in local events through a secure, full-stack web application.

The project uses a Flask REST API, React frontend, and PostgreSQL/Supabase schema with explicit relationships for users, events, participations, notifications, and tags.

---

## Why This Project

PlanPal explores the engineering challenges of event management beyond the UI, including relational integrity, authorization, participation workflows, tag-based discovery, and scalable REST API design.

---

## Key Features

- JWT Authentication
- Event CRUD
- Role-based Authorization
- Event Participation Workflow
- Tag-based Discovery
- Notification System
- Unified Search
- PostgreSQL Relational Schema

---

## Engineering Highlights

- **Backend route organization**: Flask blueprints separate auth, users, events, notifications, search, tags, and system routes.
- **Relational schema design**: PostgreSQL UUID keys, join tables, uniqueness constraints, and cascade rules are defined in SQL.
- **Authentication and authorization**: JWT auth, bcrypt password hashing, creator-only event edits, creator/admin event deletion, and admin-only tag writes.
- **Event participation flow**: Users can create, join, leave, and update event participation status with cached participant counts.
- **Tag-aware discovery**: Events and users can be associated with tags, and search supports UUID tag filters.
- **Frontend API boundary**: React pages call dedicated API modules instead of scattering raw Axios calls across components.
- **Repository hygiene**: Environment files, caches, builds, logs, and generated artifacts are ignored for safe GitHub pushes.

---

## 🏗️ System Architecture

![PlanPal System Architecture](./assets/architecture.png)

The React client handles route-based screens for authentication, event discovery, event creation/editing, notifications, search, dashboard, profile, and calendar views. Backend routes validate requests, enforce authorization, and persist data through SQLAlchemy models backed by PostgreSQL.

---

## ER Diagram

![Event Management System ER Diagram](./assets/ER%20diagram.png)

Key database rules live in `database/init.sql`:

- one participation per user per event
- event and user tags use composite primary keys
- event tags and participations cascade when an event is deleted
- notifications keep nullable event references
- event `source_type` is constrained to valid schema values

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Axios, React Router |
| Backend | Flask, Flask-JWT-Extended, Flask-Bcrypt, SQLAlchemy |
| Database | PostgreSQL / Supabase |
| Tooling | pytest, npm, pip, SQL migration scripts |

---

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL database or Supabase project

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Update `backend/.env` with your database and JWT secrets before starting the API.

Expected API URL:

```text
http://localhost:5000
```

### 2. Database

Run these SQL files against PostgreSQL/Supabase:

```text
database/init.sql
database/supabase_migration.sql
database/supabase_rls_policies.sql
```

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Expected frontend URL:

```text
http://localhost:5173
```

---

## Environment Variables

Backend example:

```env
FLASK_ENV=development
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too
SUPABASE_DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_TASK_SCHEDULER=false
```

Frontend example:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## API Surface

| Area | Endpoints |
| --- | --- |
| Auth | register, login, logout, refresh, profile, change password |
| Events | list, create, detail, update, delete, join, leave, participation status |
| Notifications | list, create, mark read/unread, mark all read, delete, unread count |
| Search | unified search across events, users, and tags |
| Tags | list, detail, search, popular, create/update/delete for admins |
| Users | current profile, user search, user detail |
| System | health and version endpoints |

Most protected routes require a JWT access token in the `Authorization: Bearer <token>` header.

---

## Repository Layout

```text
backend/
  app/
    models/       SQLAlchemy models
    routes/       Flask route blueprints
    services/     Event, notification, and scheduler logic
    utils/        Validation, response, security, and Supabase helpers
  tests/          pytest API contract tests
  config.py       Flask configuration
  run.py          Local API entrypoint

database/
  init.sql
  supabase_migration.sql
  supabase_rls_policies.sql

frontend/
  src/
    api/          Frontend API clients
    components/   Shared UI and layout components
    context/      Auth and theme context
    pages/        Route-level React pages
    services/     Axios and browser services
    utils/        Validation and date helpers

scripts/
  test_supabase_migration.py
```

---

## Testing and Verification

Backend syntax check:

```bash
python -c "import pathlib; [compile(pathlib.Path(p).read_text(), p, 'exec') for p in ['backend/app/routes/events.py', 'backend/app/routes/search.py']]"
```

Backend tests:

```bash
pytest backend/tests -q
```

Frontend build:

```bash
cd frontend
npm install
npm run build
```

Supabase migration check:

```bash
python scripts/test_supabase_migration.py
```

---

## Architecture Decisions

**Schema-driven integrity**

Core rules such as unique participation, tag joins, and cascade behavior are encoded in the database schema. The application code follows those constraints instead of duplicating them only in the UI.

**Small API modules on the frontend**

Frontend API modules keep backend contracts visible. This makes it easier to catch route drift, remove dead client methods, and keep page components focused on UI state.

**Safe error responses**

Backend routes use client-safe error messages while logging internal exceptions server-side. This avoids leaking raw exception text through API responses.

**Explicit CORS allow-list**

The backend uses configured allowed origins when credentials are enabled. This avoids the unsafe combination of wildcard origins and credentialed requests.