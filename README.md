# PlanPal

[![CI](https://github.com/nitheshkummarc/PlanPal/actions/workflows/ci.yml/badge.svg)](https://github.com/nitheshkummarc/PlanPal/actions)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?logo=flask)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)

A full-stack event management platform built with **React, TypeScript, Flask, PostgreSQL, and Supabase**, designed around secure authorization, relational data integrity, event participation workflows, and production-ready deployment.

[Architecture](#system-architecture) • [Engineering Highlights](#engineering-at-a-glance) • [API](#api-surface) • [Run Locally](#quick-start)

---

## Live Demo

**Application:** [https://your-deployment-url.com](https://your-deployment-url.com)  
**API Health:** [https://api.your-deployment-url.com/api/system/health](https://api.your-deployment-url.com/api/system/health)  
*(Add demo credentials here if applicable)*

---

## Engineering at a Glance

- **68 automated tests** — 41 backend + 27 frontend
- JWT authentication with role- and ownership-based authorization
- JWT-bound notification ownership preventing forged user IDs
- PostgreSQL relational model with UUIDs, constraints, composite keys, and cascades
- Transaction-safe event participation workflow
- Rate-limited authentication endpoints with configurable distributed storage (Redis)
- Production environment validation and secret isolation
- Separate liveness (`/health`) and database-readiness (`/ready`) probes
- Dockerized React + Flask deployment behind Nginx
- GitHub Actions CI for testing and production builds

---

## Product Preview

*(Replace these placeholders with real screenshots or a GIF of your application)*
- **Event Discovery** 
- **Event Details**
- **Create Event**
- **Dashboard**
- **Notifications**

---

## System Architecture

![PlanPal System Architecture](./assets/architecture.png)

The React client handles route-based screens for authentication, event discovery, event creation/editing, notifications, search, dashboard, profile, and calendar views. Backend routes validate requests, enforce authorization, and persist data through SQLAlchemy models backed by PostgreSQL.

---

## Key Engineering Decisions

**Schema-driven integrity**
Core rules such as unique participation, tag joins, and cascade behavior are encoded directly in the database schema (`database/supabase_migration.sql`). Application code follows those constraints rather than duplicating them only in the UI.

**Background Maintenance**
A threaded `TaskScheduler` runs periodically to mark expired events inactive, decoupling cleanup operations from request-time logic.

**Safe Error Responses & Validation**
API payloads are validated against Zod schemas on the frontend before transmission. The backend validates requests and returns client-safe error messages while logging internal exceptions server-side, avoiding leaking raw exception text.

**Explicit CORS Allow-list**
The backend uses a strictly configured allowed-origins list when credentials are enabled, avoiding the unsafe combination of wildcard origins and credentialed requests.

---

## ER Diagram

![Event Management System ER Diagram](./assets/ER%20diagram.png)

Key database rules defined in `database/supabase_migration.sql`:
- One participation per user per event
- Event and user tags use composite primary keys
- Event tags and participations cascade when an event is deleted
- Notifications keep nullable event references
- Event `source_type` is constrained to valid schema values

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Vanilla CSS, Axios, React Router, Zod |
| Backend | Python 3.11, Flask, Flask-JWT-Extended, Werkzeug Security, Flask-CORS, SQLAlchemy |
| Database | PostgreSQL / Supabase |
| Infrastructure | Docker, Nginx, Redis (optional rate-limit storage) |
| Tooling | pytest, npm, pip, GitHub Actions CI |

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
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Update `backend/.env` with your database and JWT secrets before starting the API.
Expected API URL: `http://localhost:5000`

### 2. Database

Run these SQL files against your Supabase project in this exact order:

```text
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

Expected frontend URL: `http://localhost:5173`

---

## Testing

| Suite | Result |
| --- | ---: |
| Backend | 41 tests passing |
| Frontend | 27 tests passing |
| Frontend production build | Passing |
| CI | GitHub Actions |

**Run Backend Tests:**
```bash
pytest backend/tests -q
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
| Events | list, create, detail, update, delete, join, leave, participation status |
| Notifications | list, create, mark read, delete |
| Tags | list, detail, create/update/delete for admins |
| Users | current profile, user detail |
| System | health and readiness probes (`/api/system/health`, `/api/system/ready`) |

*Most protected routes require a JWT access token in the `Authorization: Bearer <token>` header.*

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
  supabase_migration.sql
  supabase_rls_policies.sql

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
