# PlanPal

[![CI](https://github.com/nitheshkummarc/PlanPal/actions/workflows/ci.yml/badge.svg)](https://github.com/nitheshkummarc/PlanPal/actions)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?logo=flask)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)

A deployed full-stack event management platform built with **React, TypeScript, Flask, and PostgreSQL on Supabase**, featuring JWT authentication, role- and ownership-based authorization, relational integrity constraints, event participation workflows, automated testing, and CI/CD.

[Architecture](#system-architecture) • [Engineering Highlights](#engineering-at-a-glance) • [API](#api-surface) • [Run Locally](#quick-start)

---

## Live Demo

**Frontend (Vercel):** [https://planpal-silk.vercel.app](https://planpal-silk.vercel.app)  
**Backend API Health (Render):** [https://planpal-backend-wcsc.onrender.com/api/system/health](https://planpal-backend-wcsc.onrender.com/api/system/health)

---

## Engineering at a Glance

- **42 REST API endpoints** covering authentication, events, participation, notifications, tags, users, search, and system health
- **123 automated tests** — 86 backend tests with pytest and 37 frontend tests with Vitest
- **JWT authentication and authorization** with role- and ownership-based access control; logout revokes tokens server-side
- **PostgreSQL relational model** using UUIDs, foreign keys, composite keys, uniqueness constraints, CHECK constraints, and ON DELETE rules
- **Atomic, race-safe participation**: joins lock the event row and save the participation, participant count and notifications in one transaction
- **Rate limiting** on authentication endpoints (5 requests/minute per IP) using Flask-Limiter
- **Background maintenance** through a threaded `TaskScheduler`: expires past events, sends one reminder per participant for events within 24 hours, and cleans up revoked tokens (idempotent and safe with multiple workers)
- **One error contract** across the API: every error is `{"success": false, "error": "..."}`
- **CI/CD workflow** with GitHub Actions for automated validation and Vercel/Render for deployment
- **Explicit CORS allow-list** restricted to approved production origins
- **Health and readiness endpoints** for deployment health checks

---

## Product Preview

### 1. Dashboard & Upcoming Events
![Dashboard and Upcoming Events](./assets/dashboard.png)

### 2. Event Search
![Event Search](./assets/search.png)

### 3. Event Discovery
![Event Details](./assets/eventpage.png)


### 4. Event Details & Organizer Controls
![Event Discovery](./assets/Eventcard.png)

---

## System Architecture

![PlanPal System Architecture](./assets/architecture.png?v=2)

The React client communicates with the Flask REST API through an Axios-based API layer. The backend validates requests and enforces authentication and authorization across its route blueprints, while service-layer logic handles application workflows and persists data through SQLAlchemy models backed by PostgreSQL. A background `TaskScheduler` handles periodic event expiration independently of request processing.

---

## Key Engineering Decisions

**Schema-driven integrity**
Core integrity rules such as unique event participation, tag relationships, and cascade behavior are enforced at the database layer rather than relying solely on application or UI validation.

**Layered Authorization**
Protected operations require JWT authentication and enforce role- or resource-ownership checks on the backend. Client-side route restrictions are treated as UI behavior rather than a security boundary.

**Background Maintenance**
A threaded `TaskScheduler` runs periodically to mark expired events inactive, decoupling cleanup operations from request-time logic.

**Safe Error Responses & Validation**
The backend validates every request and returns client-safe error messages in one shape (`{"success": false, "error": "..."}`) while logging internal exceptions server-side. Form rules (email, password, username, name) are shared: the frontend's `utils/validators.ts` mirrors the backend's `app/utils/validators.py`, so a form that passes in the browser is accepted by the API. Zod schemas in `frontend/src/schemas` are the single source of TypeScript types for API data.

**Transactions and Concurrency**
Joining an event locks the event row (`SELECT ... FOR UPDATE`) so the capacity check can't be raced, and the participation, cached participant count and notifications are committed together. Notification helpers never commit on their own.

**HTTPS Everywhere**
In production the API redirects plain HTTP to HTTPS (308) and sends HSTS; the frontend is served by Vercel over HTTPS with HSTS and `upgrade-insecure-requests`. No secrets are shipped to the browser — the frontend only receives the public API URL.

**Explicit CORS Allow-list**
The backend uses an explicit allowed-origins list when credentials are enabled, avoiding wildcard origins for credentialed requests.

---

## ER Diagram

![Event Management System ER Diagram](./assets/ER%20diagram.png?v=2)

Key database rules (defined in both `database/init.sql` and the SQLAlchemy models):
- One participation per user per event
- Event and user tags use composite primary keys
- Event tags and participations cascade when an event is deleted
- Notification event references are nullable and use `ON DELETE SET NULL`
- Event `source_type`, participation `status` and user `role` are constrained to valid values
- An organiser can't create two events with the same title at the same time

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Axios, React Router, Zod (types) |
| Backend | Python 3.11, Flask, Flask-JWT-Extended, Flask-Bcrypt, Flask-CORS, SQLAlchemy |
| Database | PostgreSQL (Supabase) |
| Infrastructure | Docker (Local Dev), Vercel (Frontend Hosting), Render (Backend PaaS) |
| Tooling | pytest, npm, pip, GitHub Actions |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL database or Supabase project
- Docker & Docker Compose (Optional but recommended)

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # On Windows use: copy .env.example .env
python run.py
```

Update `backend/.env` with your database and JWT secrets before starting the API.
Expected API URL: `http://localhost:5000`

### 2. Database

Run the schema SQL against your Supabase project (or any PostgreSQL database) to initialize it:

```text
database/init.sql
```

Databases created before 2026-09-25 should also run `database/migrations/001_align_existing_schema.sql` once.
(The backend's start command also runs `db.create_all()`, which creates any missing tables.)
*(Note: Database access is mediated exclusively through the Flask backend, where authentication and authorization are enforced before database operations; privileged Supabase credentials are never exposed to the client).*

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # On Windows use: copy .env.example .env
npm run dev
```

Expected frontend URL: `http://localhost:5173`

---

## Testing

| Suite | Result |
| --- | ---: |
| Backend | 86 tests passing |
| Frontend | 37 tests passing |
| Frontend production build | Passing |
| GitHub Actions CI | Passing |

**Run Backend Tests:**
```bash
cd backend
pip install -r requirements-dev.txt   # runtime requirements + pytest
pytest tests -q
```

**Run Frontend Tests:**
```bash
cd frontend
npm test
npm run build
```

---

## API Surface

| Area | Endpoints |
| --- | --- |
| Auth | register, login, profile, change password |
| Events | list upcoming, create, detail (incl. past events), update, delete, join, leave, interested/going status, my events, joined events |
| Notifications | list, create, mark read/unread, mark all read, delete, delete all, unread count, types |
| Tags | list, detail, create, update, delete (admin-protected mutations) |
| Users | current profile, public profile, user search |
| Search | events (by name and/or tags, location, dates), users, tags |
| System | health and readiness endpoints (`/api/system/health`, `/api/system/ready`) |

*Most protected routes require a JWT access token in the `Authorization: Bearer <token>` header.*

---

## Repository Layout

```text
backend/
  app/
    models/       SQLAlchemy models
    routes/       Flask route blueprints
    services/     Notification and scheduler logic
    utils/        Validation, error response, and security-header helpers
  tests/          pytest API contract tests
  config.py       Flask configuration
  run.py          Local API entrypoint

database/
  init.sql                       Schema (tables, constraints, indexes, sample tags)
  migrations/                    One-time migrations for existing databases

frontend/
  src/
    api/          Frontend API clients
    components/   Shared UI and layout components
    context/      Auth and theme context
    pages/        Route-level React pages
    schemas/      Zod validation schemas

docs/
  ARCHITECTURE.md                    System architecture deep dive
  FILE_DOCUMENTATION.md              File-by-file project overview
  ROUTE_DOCUMENTATION.md             Function-level route documentation
  EVENT_ROUTES_ORM_SQL_REFERENCE.md  ORM-to-SQL mapping for event routes
```
