# PlanPal Backend

Flask REST API for PlanPal.

The backend owns authentication, event lifecycle management, participation rules, notifications, tag management, unified search, and system health checks. It uses SQLAlchemy models over a PostgreSQL/Supabase schema designed around explicit relational constraints.

---

## Backend Responsibilities

- Register, authenticate, refresh, and manage user profile data.
- Enforce JWT protection on private routes.
- Create, update, delete, list, and fetch event details.
- Enforce creator-only event edits and creator/admin event deletion.
- Manage event join, leave, and participation-status flows.
- Persist event-tag relationships through the `event_tags` join table.
- Expose notification list, read/unread, delete, and unread-count routes.
- Search events, users, and tags with UUID-safe tag filters.
- Provide health/version endpoints for local verification.

---

## Architecture

```mermaid
flowchart LR
    Client[React Client] --> Flask[Flask App]
    Flask --> Routes[Blueprint Routes]
    Routes --> Services[Services]
    Routes --> Models[SQLAlchemy Models]
    Services --> Models
    Models --> DB[(PostgreSQL / Supabase)]
```

Routes are split by domain under `app/routes`. Shared database models live in `app/models`, and supporting logic for notifications, event services, scheduler behavior, validation, security, and response helpers lives under `app/services` and `app/utils`.

---

## Tech Stack

| Technology | Role |
| --- | --- |
| Flask | REST API and application factory |
| SQLAlchemy | ORM mapping to PostgreSQL tables |
| Flask-JWT-Extended | JWT access and refresh token handling |
| Flask-Bcrypt | Password hashing |
| Flask-CORS | Explicit frontend origin allow-list |
| pytest | Backend API contract tests |
| Supabase/PostgreSQL | Relational database |

---

## Project Structure

```text
app/
  models/       SQLAlchemy model definitions
  routes/       Auth, users, events, notifications, search, tags, system
  services/     Event, notification, and scheduler services
  utils/        Validation, response, security, Supabase helpers
tests/          Focused backend route/contract tests
config.py       Environment-based Flask configuration
run.py          Local app entrypoint
requirements.txt
```

---

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Default local URL:

```text
http://localhost:5000
```

---

## Environment Variables

Use `backend/.env.example` as the template:

```env
FLASK_ENV=development
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too
SUPABASE_DATABASE_URL=postgresql://user:password@host:5432/database
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_TASK_SCHEDULER=false
# Optional
# REDIS_URL=redis://localhost:6379/0   rate-limit storage shared across workers
# PROXY_FIX_X_FOR=0                     reverse proxies in front of the app (production default 1)
# FORCE_HTTPS=false                     redirect HTTP to HTTPS (production default true)
```

Real `.env` files must stay local and are ignored by the root `.gitignore`.

---

## Verification

Install test dependencies and run the backend tests:

```bash
pip install -r requirements-dev.txt
pytest tests -q
```

---

## API Design Notes

- Protected routes use JWT access tokens in the `Authorization` header.
- Error responses are client-safe; internal exception details are logged server-side.
- CORS origins are configured through `ALLOWED_ORIGINS`.
- Event tag IDs are validated as UUIDs to match the database schema.
- Event deletion relies on database cascade rules for related participations and event tags.
