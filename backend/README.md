# PlanPal Backend

Flask REST API for PlanPal: authentication, events and participation, notifications, search,
tags and user profiles, backed by PostgreSQL on Supabase.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate             # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env
python run.py                      # http://localhost:5000
```

Set `SUPABASE_DATABASE_URL` in `.env` to the Supabase pooler connection string; the API does
not start without it. The schema comes from `../database/init.sql` (see `../docs/DEPLOYMENT.md`).

## Layout

```text
app/
  __init__.py   App factory, JWT checks, error handlers, blueprints
  models/       SQLAlchemy models (mirror database/init.sql)
  routes/       auth, users, events, notifications, search, tags, system
  services/     event_queries, notification_service, task_scheduler
  utils/        validators, query_params, responses, security
tests/          pytest suite
config.py       Settings from environment variables
run.py          Entry point
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest tests -q
```

The tests use an in-memory SQLite database built from the models and need no configuration.

## Reference

- API: `../docs/ROUTE_DOCUMENTATION.md`
- SQL executed by the event routes: `../docs/EVENT_ROUTES_ORM_SQL_REFERENCE.md`
- Architecture: `../docs/ARCHITECTURE.md`
