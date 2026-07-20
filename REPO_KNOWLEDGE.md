# PlanPal — Complete Repository Knowledge File

> **Purpose:** Give any developer, agent, or new chat a **complete mental model
> of this entire codebase in a single read**. After reading this file you should
> be able to navigate the project confidently, understand why things are the way
> they are, and know exactly which file to open when making a specific change —
> without first reading the whole repo.
>
> **This file is the index.** Drill into specific source files only when you
> actually need to edit them.
>
> **Companion files to read alongside this one:**
> - `README.md` — user-facing project description
> - `docs/BASELINE_STATUS.md` — exact pre-fix test/build state
> - `PRODUCTION_READINESS_RUNBOOK.md` — the active fix branch's plan + status
> - `MANUAL_ACTIONS_REQUIRED.md` — what needs human/external action

---

## 1. What this project is (30-second version)

**PlanPal** is a community event platform. Users register, log in, create
events, join/leave events, browse by tags/location/date, get in-app
notifications, and search across events/users/tags.

**Stack:**
- **Backend:** Flask 2.3.3 (Python 3.11) + SQLAlchemy 2.0 + Flask-JWT-Extended
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + React Router + Axios + Zod
- **Database:** PostgreSQL via Supabase (pooler/PgBouncer); 7 tables
- **Storage:** Supabase Storage bucket (declared, barely used in code)

**Topology:** React SPA ↔ Flask REST API (`/api/*`) ↔ PostgreSQL/Supabase.
Monolith, single process, no message queue, no cache layer (Redis is in
requirements but unused).

**Deployment model (as of branch start):** **None.** No Dockerfile, no
docker-compose, no CI/CD, no Nginx, no IaC. Local dev only. (The
`fix/production-readiness` branch adds containerization + CI.)

---

## 2. Branches & project state

| Branch | Purpose | Don't touch if… |
|---|---|---|
| `main` | Stable origin | …you're not opening a reviewed PR |
| `Deployment` | Previous working state (TS migration done) | …avoids the production-readiness rework |
| `fix/production-readiness` | **Active.** Production-readiness fixes (this branch is the subject of the Runbook) | — |
| `feature/service-layer-refactor` | Planned Phase 6 architecture work (does not exist yet) | — |

**Recent commits (on `Deployment`/`main`):**
- `1d5886e` chore: complete JS to TS migration for root components
- `44855bc` Migration from JavaScript to Typescript and fixed UI styling
- `74cfae6` Full-stack PlanPal event management platform

---

## 3. Folder map (what lives where, what each thing does)

```
dbms_planpal-master/
├── backend/                         ← Flask app
│   ├── .venv/                       ← Windows venv (Scripts/python.exe)  [gitignored]
│   ├── app/
│   │   ├── __init__.py              ← App factory: create_app(), extensions, blueprints,
│   │   │                               error handlers, CORS, JWT, security headers
│   │   ├── models/__init__.py       ← ALL SQLAlchemy models (User, Event, Participation,
│   │   │                               Notification, Tag, UserTag, EventTag) + to_dict()
│   │   ├── routes/                  ← Blueprints (one file per domain)
│   │   │   ├── auth.py              ← /api/auth/* (register/login/logout/refresh/profile)
│   │   │   ├── users.py             ← /api/users/* (profile/search/get)
│   │   │   ├── events.py            ← /api/events/* (CRUD + join/leave/status/my/joined)
│   │   │   ├── notifications.py     ← /api/notifications/* (list/create/mark-read/delete)
│   │   │   ├── search.py            ← /api/search/ (unified across events/users/tags)
│   │   │   ├── tags.py              ← /api/tags/* (CRUD, admin-gated writes)
│   │   │   └── system.py            ← /api/system/health, /api/system/version
│   │   ├── services/                ← Business logic (PARTIALLY DEAD CODE — see §8)
│   │   │   ├── event_service.py     ← ⚠️ 485 lines, NEVER imported = dead code
│   │   │   ├── notification_service.py ← Used by events.py for fan-out
│   │   │   └── task_scheduler.py    ← Background thread (marks expired events inactive)
│   │   └── utils/
│   │       ├── security.py          ← SecurityManager, decorators (mostly unused)
│   │       ├── validators.py        ← email/password/name/uuid/text validators
│   │       ├── responses.py         ← error_response(), message_response()
│   │       └── supabase_client.py   ← Supabase singleton (storage + table queries)
│   ├── tests/                       ← pytest; FLAT layout; 16 tests; 5 files
│   ├── config.py                    ← Config/DevelopmentConfig/TestingConfig/ProductionConfig
│   ├── requirements.txt             ← Pinned deps (see §5)
│   ├── run.py                       ← Entry point: `python run.py` or `gunicorn run:app`
│   ├── .env                         ← ⚠️ LOCAL SECRETS (gitignored, never commit)
│   └── .env.example                 ← Template
│
├── database/
│   ├── init.sql                     ← Legacy schema (TIMESTAMP, no auth_user_id)
│   ├── supabase_migration.sql       ← Canonical schema (TIMESTAMPTZ, has auth_user_id)
│   └── supabase_rls_policies.sql    ← RLS policies (RLS bypassed — app uses service_role)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  ← Routes (public vs ProtectedRoute-wrapped)
│   │   ├── main.tsx                 ← ReactDOM root
│   │   ├── config.ts                ← ★ NEW (Commit 2): BYPASS_AUTH flag, single source
│   │   ├── api/                     ← One file per backend domain (authApi, eventsApi, ...)
│   │   ├── components/
│   │   │   ├── common/              ← ProtectedRoute, PublicRoute
│   │   │   ├── layout/              ← Layout, Navbar, Footer, NotificationBell, SearchBar
│   │   │   └── ui/                  ← EventCard, TagChip, Loading, MatchCard, etc.
│   │   ├── context/
│   │   │   ├── AuthContext.tsx      ← Auth state via useReducer; BYPASS_AUTH gating
│   │   │   ├── AuthContext.jsx      ← ⚠️ STRAY pre-TS leftover (untracked) — leave alone
│   │   │   └── ThemeContext.tsx     ← Dark/light theme
│   │   ├── hooks/useApi.ts          ← useApi, usePagination, useDebounce, useLocalStorage
│   │   ├── pages/                   ← Route-level components (Home, Login, Dashboard, ...)
│   │   ├── schemas/                 ← Zod schemas (user, event, participation, etc.)
│   │   ├── services/
│   │   │   ├── axiosInstance.ts     ← Axios + JWT interceptors + 401-refresh
│   │   │   ├── tokenService.ts      ← localStorage token storage
│   │   │   └── mockAdapter.ts       ← ★ NEW (Commit 2): offline preview mock
│   │   ├── types/                   ← AppUser/AppEvent/etc. inferred from Zod schemas
│   │   ├── utils/                   ← dateUtils, helpers, validators
│   │   └── env.d.ts                 ← Vite env typing (VITE_API_BASE_URL, VITE_BYPASS_AUTH)
│   ├── package.json                 ← NOTE: "init": "^0.1.2" is bogus dep (Phase 6 cleanup)
│   ├── vite.config.ts               ← Vite config; bakes VITE_API_BASE_URL via `define`
│   ├── tsconfig.json                ← strict:true (existing — don't change in fix branch)
│   └── tailwind.config.js
│
├── docs/
│   ├── BASELINE_STATUS.md           ← Pre-fix snapshot (what was broken)
│   ├── ROUTE_DOCUMENTATION.md       ← ⚠️ DOCUMENTS 6 ENDPOINTS THAT DON'T EXIST (Commit 12)
│   ├── FILE_DOCUMENTATION.md
│   └── EVENT_ROUTES_ORM_SQL_REFERENCE.md
│
├── scripts/test_supabase_migration.py  ← Manual Supabase validation script
├── assets/                             ← architecture.png, ER diagram.png
├── PRODUCTION_READINESS_RUNBOOK.md     ← ★ The active fix-branch plan
├── MANUAL_ACTIONS_REQUIRED.md          ← ★ Human/external actions tracker
├── REPO_KNOWLEDGE.md                   ← ★ This file
└── README.md
```

---

## 4. The data model (7 tables)

All PKs are UUIDs. Junction tables use composite PKs.

```
users (user_id PK, name, email UNIQUE, username UNIQUE, password_hash,
       bio, profile_image_url, preferences JSONB, role[user|admin],
       is_active, created_at, updated_at)
   │
   ├──< events (event_id PK, posted_by FK→users,
   │            title, description, timestamp, place, location,
   │            city, state, is_paid, price, source_type[text],
   │            max_participants, current_participants[CACHED COUNT],
   │            is_active, created_at, updated_at)
   │         │
   │         ├──< participations (participation_id PK, event_id FK, user_id FK,
   │         │                    status[interested|going], joined_at, ...)
   │         │                    UNIQUE(event_id, user_id)
   │         │
   │         ├──< event_tags (event_id FK, tag_id FK, PK(event_id, tag_id))
   │         │
   │         └──< notifications (notification_id PK, user_id FK, event_id FK nullable,
   │                              type, title, message, is_read, ...)
   │
   ├──< user_tags (user_id FK, tag_id FK, PK(user_id, tag_id))
   │
   └── tags (tag_id PK, name UNIQUE, description, color, ...)
```

**Key constraints / cascade rules:**
- One participation per user per event (`UNIQUE(event_id, user_id)`).
- `event_tags` and `participations` cascade on event delete.
- `notifications.event_id` is nullable and `ON DELETE SET NULL`.
- `events.source_type` has CHECK `IN ('text')` — only 'text' is allowed; the
  old `'poster'` value is documented but rejected by the API.

**⚠️ Watch out:**
- `current_participants` is a **cached count**, recomputed by
  `Event.update_participant_count()` which **commits internally** — a
  transaction-safety hazard fixed in Commit 5 of the fix branch.
- `init.sql` vs `supabase_migration.sql` **diverge** (TIMESTAMP vs TIMESTAMPTZ,
  different UNIQUE constraint). `supabase_migration.sql` is canonical.

---

## 5. Dependency versions (verified installed, not declared)

### Backend (`backend/requirements.txt` → installed in `.venv`)
| Package | Declared | Installed | Notes |
|---|---|---|---|
| Flask | 2.3.3 | 2.3.3 | |
| Flask-SQLAlchemy | 3.0.5 | 3.0.5 | |
| SQLAlchemy | — | 2.0.51 | Transitive |
| Flask-JWT-Extended | 4.5.3 | 4.5.3 | JWT access+refresh |
| Flask-Bcrypt | 1.0.1 | 1.0.1 | Password hashing |
| Flask-CORS | 4.0.0 | 4.0.0 | |
| Flask-Migrate | 4.0.5 | — | ⚠️ Declared but **no migrations/ folder exists** — never initialized |
| Flask-Limiter | 3.5.0 | (present) | ⚠️ Declared but **not wired** — wired in Commit 7 |
| psycopg2-binary | 2.9.10 | — | |
| bleach | 6.1.0 | — | ⚠️ Deprecated; used only by unused `SecurityManager.sanitize_input` |
| stripe, Flask-Mail, redis | various | — | Declared, mostly unused |
| numpy, pandas | unpinned | — | ⚠️ Apparently unused (Phase 6 removal) |
| pytest-cov | — | 7.1.0 | Installed, no config file |
| coverage | — | 7.15.1 | |

### Frontend (`frontend/package.json` → installed in `node_modules`)
| Package | Declared | Installed | Notes |
|---|---|---|---|
| react / react-dom | ^18.3.1 | 18.3.1 | |
| react-router-dom | ^6.26.2 | 6.30.4 | |
| axios | ^1.7.7 | 1.18.1 | |
| vite | ^8.1.3 | 8.1.3 | Rolldown-based; these are real (not fabricated) versions |
| typescript | ^6.0.3 | 6.0.3 | |
| zod | ^4.4.3 | 4.4.3 | Schema validation |
| tailwindcss | ^3.4.17 | 3.4.17 | |
| `"init": "^0.1.2"` | — | — | ⚠️ **Bogus dependency** (npm placeholder package) |

---

## 6. Backend architecture — how a request flows

1. **Entry:** `run.py` creates `app = create_app('development')` at import time.
   `create_app()` lives in `app/__init__.py`.
2. **App factory** (`app/__init__.py`):
   - Loads config class from `config.py` based on `FLASK_ENV`.
   - Inits extensions: `db`, `migrate`, `cors`, `jwt`, `bcrypt`, `mail`.
   - Optional Supabase client init (try/except — graceful if env missing).
   - Registers 7 blueprints under `/api/{auth,users,events,notifications,search,system,tags}`.
   - `before_request` handles CORS OPTIONS preflight manually (duplicates Flask-CORS).
   - `after_request`: `add_security_headers` + `add_success_flag` (injects
     `success: bool` into every JSON response, reordering keys).
   - Error handlers: 404/500/413/429. **No JWT error handlers** (gap fixed in Commit 8).
3. **Route** (e.g. `POST /api/events/`):
   - `@jwt_required()` decorator validates JWT.
   - `get_jwt_identity()` returns the user_id string from the token.
   - Request body parsed via `request.get_json()` — **no schema validation
     library**; ad-hoc `if not data.get(field)` checks. (Commit 6 adds helpers.)
   - Business logic is **inline in the route handler** — there is no real
     service layer (`EventService` exists but is dead code; see §8).
   - Response via `jsonify({...}), 201`. Errors via `error_response()`.
4. **Persistence:** SQLAlchemy ORM. Models in `app/models/__init__.py`.
   `to_dict()` on each model produces the JSON shape.
5. **Background:** `TaskScheduler` (in `task_scheduler.py`) runs a daemon
   thread when `ENABLE_TASK_SCHEDULER=true`. Marks expired events inactive
   every 5 minutes. Uses `print()` for logging (Commit 8 → logger).

**Patterns to know:**
- **Every route** is wrapped in `try: ... except Exception as e: return error_response(..., exc=e)`.
  This is the existing pattern; the fix branch adds centralized handlers as a
  safety net but **does not remove** the per-route try/except (Phase 6).
- **Authorization** is hand-coded: `if str(event.posted_by) != current_user_id`
  or `if user.role != 'admin'`. No RBAC library, no decorator (the
  `admin_required` decorator in `security.py` checks `is_admin` attribute which
  **doesn't exist on the User model** — it uses `role`, so the decorator is
  effectively broken/unused).
- **Notifications** are created by `NotificationService` which **commits
  internally** per notification — another transaction hazard.

---

## 7. Frontend architecture — how the app is structured

1. **Entry:** `main.tsx` renders `<App/>` inside `<StrictMode>`.
2. **`App.tsx`:** wraps everything in `<ThemeProvider><AuthProvider><Router>`.
   Routes split into:
   - **Public:** `/`, `/login`, `/register` (login/register wrapped in `<PublicRoute>`).
   - **Protected:** everything else, wrapped in `<ProtectedRoute><Layout>` —
     `/dashboard`, `/events`, `/events/:id`, `/events/:id/edit`, `/create-event`,
     `/calendar`, `/profile`, `/notifications`, `/search`, `/upcoming-events`.
3. **Auth state:** `AuthContext` uses `useReducer`. State: `isAuthenticated,
   user, loading, error`. Actions: `login`, `register`, `logout`,
   `updateProfile`, `changePassword`.
4. **HTTP:** Single axios instance (`services/axiosInstance.ts`).
   - Request interceptor injects `Authorization: Bearer <token>` from localStorage.
   - Response interceptor catches 401, calls `/api/auth/refresh`, retries once.
   - On refresh failure → clears tokens + redirects to `/login`.
5. **API layer:** `src/api/*.ts` — one module per backend domain. Each imports
   `axiosInstance` and exports typed request functions. **Pages call these,
   never raw axios.**
6. **Data fetching:** `useApi` hook wraps an API function with `data/loading/
   error/execute/reset`. Also: `usePagination`, `useDebounce`, `useLocalStorage`.
7. **Types:** `src/types/index.ts` infers `AppUser`, `AppEvent`, etc. from Zod
   schemas in `src/schemas/`. **In practice, pages bypass these with `as any`**
   (660 ESLint errors at baseline — deferred to Phase 6).
8. **Tokens:** stored in `localStorage` (`accessToken`, `refreshToken`).
   ⚠️ XSS-vulnerable; HttpOnly cookies are a Phase 6 migration.

**⚠️ BYPASS_AUTH:** Before Commit 2, both `AuthContext.tsx` and
`axiosInstance.ts` **hardcoded** `BYPASS_AUTH = true`, forcing a mock admin
user for every visitor and routing all HTTP through a mock adapter (whose file
was missing, breaking the build). Commit 2 env-gates this via `config.ts`
(default off) and creates the missing `mockAdapter.ts`.

---

## 8. Landmines & known weirdness (read before editing)

| # | What | Where | Why / what to do |
|---|---|---|---|
| 1 | `EventService` is 485 lines of **dead code** | `backend/app/services/event_service.py` | Never imported anywhere. Logic is duplicated inline in `events.py`. Phase 6 will reconcile. **Do not assume the service layer is real.** |
| 2 | `admin_required` decorator is broken | `backend/app/utils/security.py` | Checks `current_user.is_admin` but the User model has `role`, not `is_admin`. The decorator is therefore unused. Tag routes do their own `if user.role != 'admin'` check. |
| 3 | Per-route `try/except` everywhere | all `routes/*.py` | Existing pattern. Fix branch adds centralized handlers as safety net but leaves these (Phase 6 cleanup). |
| 4 | `update_participant_count()` commits internally | `backend/app/models/__init__.py` | Breaks atomicity with caller. Fixed in Commit 5 (`commit()` → `flush()`). |
| 5 | `EventService` and route handlers reference different status values | `event_service.py` ('confirmed'/'pending'/'cancelled') vs `events.py` ('interested'/'going') | The DB CHECK allows only 'interested'/'going'. The dead service uses wrong values — more evidence it's abandoned. |
| 6 | `init.sql` vs `supabase_migration.sql` diverge | `database/` | Different TIMESTAMP types, different UNIQUE constraints. `supabase_migration.sql` is canonical. |
| 7 | `current_participants` is a cached count | `events` table | Must be kept in sync via `update_participant_count()`. Long-term should be a DB trigger. |
| 8 | `add_success_flag` mutates every JSON response | `app/__init__.py` | Injects `success: bool` and reorders keys (`{'success':..., **payload}`). Surprising for clients expecting a stable shape. |
| 9 | CORS is configured **twice** | `app/__init__.py` | Once via Flask-CORS, once via a manual `before_request` OPTIONS handler. Can drift out of sync. |
| 10 | JWT in localStorage | `frontend/src/services/tokenService.ts` | XSS-exfiltrable. Phase 6 migrates to HttpOnly cookies. |
| 11 | Stray `AuthContext.jsx` | `frontend/src/context/` | Pre-TS-migration leftover (untracked). Having both `.tsx` and `.jsx` could cause module-resolution ambiguity. **Leave alone unless owner approves removal.** |
| 12 | `docs/ROUTE_DOCUMENTATION.md` is wrong | `docs/` | Documents 6 endpoints that don't exist (`/auth/debug-users`, `/search/unified`, `/notifications/unread-count`, `/notifications/<id>/read`, `/users/<id>/events`, `/events/my-events`). Also documents `source_type: 'poster'` which the API rejects. Reconciled in Commit 12. |
| 13 | `"init": "^0.1.2"` in package.json | `frontend/package.json` | Bogus dependency. Phase 6 removal. |
| 14 | Heavy `as any` casts | many `frontend/src/pages/*.tsx` | 660 ESLint errors at baseline. Pages don't trust the response shape. Phase 6 cleanup. |
| 15 | `User.to_dict()` returns `email` and `password_hash` field exists | `backend/app/models/__init__.py` | `to_dict()` does NOT leak password_hash (good) but DOES include email. User-search PII leak fixed in Commit 4 (`to_public_dict()`). |
| 16 | Push-notification endpoints are no-op stubs | `backend/app/routes/notifications.py` | `push/subscribe`, `push/unsubscribe` return 200 without doing anything. |
| 17 | `test_core_api_contracts.py` mocks the ORM heavily | `backend/tests/` | Replaces `events.Event.query` etc. with fakes — so response-shape tests that don't exercise real code paths. Don't trust them for behavior coverage. |
| 18 | Rate limiting declared but not wired | `requirements.txt` + `security.py` | `Flask-Limiter` installed; `check_rate_limit()` returns True (no-op). Wired in Commit 7. |
| 19 | Config silently generates random secrets if env missing | `backend/config.py` | `secrets.token_urlsafe(32)` fallback. In production this rotates secrets every restart = invalidates all sessions. Fixed in Commit 3 (fail-fast). |
| 20 | `bleach` is deprecated | `requirements.txt` | Used only by unused `SecurityManager.sanitize_input`. Replace with `nh3` in Phase 6. |

---

## 9. API surface (quick reference — every endpoint)

All under `/api/*` except root. `🔐` = JWT required. *Status as of branch start;
Commit 12 produces the authoritative OpenAPI spec.*

### Auth (`/api/auth`)
- `POST /register` — create account, returns access+refresh+user
- `POST /login` — returns access+refresh+user
- `POST /logout` 🔐 — (token blacklisting disabled; client just discards)
- `POST /refresh` 🔐(refresh) — new access token
- `GET /profile` 🔐 — current user
- `PUT /profile` 🔐 — update profile (name/username/bio/avatar/preferences)
- `POST /change-password` 🔐

### Users (`/api/users`)
- `GET /profile` 🔐
- `GET /search?q=` 🔐 — ⚠️ returns email (PII leak; fixed Commit 4)
- `GET /<user_id>` 🔐 — strips email for other users

### Events (`/api/events`)
- `GET /` — list+filter (page, per_page, city, state, location, date_from, date_to)
- `POST /` 🔐 — create (auto-joins creator as 'going')
- `GET /<event_id>` — details + participants list (creator first)
- `PUT /<event_id>` 🔐 (creator only)
- `DELETE /<event_id>` 🔐 (creator or admin) — **hard delete + cascade**
- `POST /<event_id>/join` 🔐
- `DELETE /<event_id>/leave` 🔐 (creator cannot leave)
- `PUT /<event_id>/update-status` 🔐 — body: `{status: interested|going}`
- `GET /my` 🔐 — events I created
- `GET /joined` 🔐 — events I joined
- `GET /<event_id>/participation_status` 🔐

### Notifications (`/api/notifications`)
- `GET /` 🔐 — list+filter (page, per_page, unread_only, filter)
- `POST /` 🔐 — ⚠️ **IDOR**: body user_id honored, can write to anyone (fixed Commit 4)
- `PUT /<id>/mark-read` 🔐 (owner)
- `PUT /<id>/mark-unread` 🔐 (owner)
- `PUT /mark-all-read` 🔐
- `DELETE /<id>` 🔐 (owner)
- `DELETE /` 🔐 — delete all
- `GET /types` 🔐
- `GET /unread_count` 🔐
- `POST /push/subscribe` 🔐 — ⚠️ no-op stub
- `DELETE /push/unsubscribe` 🔐 — ⚠️ no-op stub
- `POST /test` 🔐 — self-test notification

### Search (`/api/search`)
- `GET /` — unified; params: `q`, `type` (all|events|users|tags), `limit`,
  `tag_ids` (comma-separated UUIDs), `location`, `sort_by` (⚠️ both branches
  return same order_by — sort is a no-op).

### Tags (`/api/tags`)
- `GET /` — all tags
- `GET /search?q=`
- `GET /<tag_id>`
- `GET /popular`
- `POST /` 🔐(admin) — create
- `PUT /<tag_id>` 🔐(admin)
- `DELETE /<tag_id>` 🔐(admin) — cascades to user_tags + event_tags

### System (`/api/system`)
- `GET /health` — DB ping (kept as alias in Commit 8)
- `GET /version`

### Root (in `run.py`)
- `GET /` — health check
- `GET /api` — endpoint listing

---

## 10. Common change recipes ("I need to X — where do I go?")

| If you need to… | Open this file(s) |
|---|---|
| Add/modify a backend endpoint | `backend/app/routes/<domain>.py` (add a route to the blueprint) |
| Add a new table / column | `backend/app/models/__init__.py` + `database/supabase_migration.sql` |
| Change the JSON shape of a model | `to_dict()` on the model in `backend/app/models/__init__.py` |
| Add a new frontend page | `frontend/src/pages/<Name>.tsx` + register a `<Route>` in `App.tsx` |
| Add a new frontend API call | `frontend/src/api/<domain>Api.ts` |
| Change auth behavior | `frontend/src/context/AuthContext.tsx` + `backend/app/routes/auth.py` |
| Change JWT/token handling | `backend/config.py` (expiry) + `frontend/src/services/tokenService.ts` |
| Add a Zod schema / TS type | `frontend/src/schemas/<name>.schema.ts` (type auto-infers in `types/index.ts`) |
| Add a security header | `backend/app/utils/security.py` (`add_security_headers`) and/or `nginx/nginx.conf` |
| Add a test | Backend: `backend/tests/test_<area>.py`. Frontend: `frontend/src/__tests__/<area>.test.ts(x)` |
| Change CORS | `backend/app/__init__.py` (Flask-CORS + manual preflight) |
| Change rate limits | `backend/app/routes/auth.py` (after Commit 7) |
| Add a background task | `backend/app/services/task_scheduler.py` |
| Fix a typo in API docs | `docs/ROUTE_DOCUMENTATION.md` + `docs/openapi.yaml` (keep in sync!) |

---

## 11. Testing & verification commands

```bash
# Backend
cd backend
.venv/Scripts/python.exe -m pytest tests/ -q                 # all tests
.venv/Scripts/python.exe -m pytest tests/ --cov=app -q       # with coverage
cd ..

# Frontend
cd frontend
npm run build              # production build
npm run lint               # eslint (expect ~660 pre-existing errors)
npx tsc --noEmit           # type check
npm test                   # vitest (added in Commit 2)
cd ..

# Static analysis (after Commit 10)
cd backend && .venv/Scripts/python.exe -m ruff check app/
cd backend && .venv/Scripts/python.exe -m mypy app/

# Deployment validation (after Commit 9)
docker build -t planpal-backend  -f Dockerfile          .
docker build -t planpal-frontend -f frontend/Dockerfile .
docker compose -f docker-compose.local.yml config
docker run --rm planpal-frontend nginx -t
```

**Backend test layout:** flat (`backend/tests/test_*.py`). Phase 6 may
reorganize into `unit/integration/api/security/regression/` — **do not do this
in the fix branch** (it's a refactor that bloats diffs).

**Frontend tests:** Vitest, in `frontend/src/__tests__/`. Convention: NOT
beside production files.

**Coverage tooling:** `pytest-cov 7.1.0` is already installed. Use it; don't
add new tooling.

---

## 12. Running locally

### Backend
```bash
cd backend
.venv/Scripts/python.exe run.py        # Windows; Linux: source .venv/bin/activate && python run.py
# Listening on http://localhost:5000
```
Requires `backend/.env` with `SUPABASE_DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SECRET_KEY`, `JWT_SECRET_KEY` set. For offline UI
preview without backend, set `VITE_BYPASS_AUTH=true` in `frontend/.env`.

### Frontend
```bash
cd frontend
npm install
npm run dev                # Vite dev server (port from vite.config.ts)
```
Set `VITE_API_BASE_URL` in `frontend/.env` to point at the backend.

### Full local stack (after Commit 9)
```bash
docker compose -f docker-compose.local.yml up --build
# backend :5000, frontend :3000, db :5432, redis :6379
```

---

## 13. Security posture (honest summary)

| Aspect | Status |
|---|---|
| Password hashing | ✅ bcrypt (Flask-Bcrypt) |
| JWT access tokens | ✅ 30-min expiry, refresh tokens 7-day |
| JWT storage | ⚠️ localStorage (XSS-exposed) — Phase 6 → HttpOnly cookies |
| Logout | ⚠️ No server-side revocation (token lives until expiry) — Phase 6 → blocklist |
| Rate limiting | ❌ Not wired at branch start — **Commit 7** |
| CORS | ✅ Explicit allowlist, credentials enabled |
| Input validation | ⚠️ Ad-hoc — **Commit 6** adds helpers |
| SQL injection | ✅ SQLAlchemy ORM (parameterized) |
| XSS | ⚠️ bleach declared but only in unused code; React escapes by default |
| IDOR | ❌ Notification creation vulnerable at branch start — **Commit 4** |
| PII | ❌ User search leaked email at branch start — **Commit 4** |
| Secrets in env | ✅ `.env` gitignored; ⚠️ rotate before prod (see MANUAL_ACTIONS) |
| Security headers | ⚠️ Some set in `add_security_headers`; CSP too strict (breaks SPA) — **Commit 9** (Nginx) tunes |
| RLS policies | ✅ Defined in SQL, but bypassed because app uses `service_role` key |

---

## 13a. When you're done reading this file

1. If you're here to continue the **production-readiness** work → read
   `PRODUCTION_READINESS_RUNBOOK.md` §6 (Resume Point) next.
2. If you're here to **understand a specific area** → jump to §10 (change
   recipes) and open the listed file.
3. If you're here to **add a feature** → confirm with the owner which branch
   (`fix/production-readiness` is for fixes only; new features need their own
   branch off `main` or `Deployment`, NOT off the fix branch).
4. If anything in this file contradicts the code, **trust the code** and
   update this file.

---

**Last updated:** corresponds to the state at the start of
`fix/production-readiness` branch work (after Commits 0, 1, and the runbook;
Commit 2 in progress). Update this file when the architecture meaningfully
changes (new table, new endpoint family, new service, dep upgrade, etc.) —
not for every commit.
