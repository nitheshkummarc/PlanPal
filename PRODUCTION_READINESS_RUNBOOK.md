# Production-Readiness Runbook

> **Purpose:** A single, self-contained runbook for the `fix/production-readiness`
> branch. If you hand this file (and the repo) to any developer or coding agent,
> they should be able to resume the work, complete the remaining commits, and
> know exactly what was done, what is in progress, and what is left.
>
> **Read sections 1–4 before writing any code.** They define the rules, the
> verification policy, and the rollback policy. Sections 5–7 are the work.

---

## 0. How to use this file

- **Status legend** used throughout the per-commit table (§7) and checklist (§8):
  - `[x]` ✅ Done — committed, verified, listed with commit SHA
  - `[~]` 🟡 In progress — code started but not yet committed or not yet verified
  - `[ ]` ⬜ Pending — not started
- The **Resume Point** in §6 is the canonical answer to "where do I pick up?"
- Always update §6, §7, and §8 as you complete each commit. A runbook that lies
  is worse than no runbook.
- Never delete completed items — they are the audit trail.

---

## 1. Context

- **Repository:** PlanPal — Flask + React (TypeScript) + PostgreSQL/Supabase event platform.
- **Branch:** `fix/production-readiness`, created from `Deployment`.
- **Originating audit:** `docs/BASELINE_STATUS.md` plus the original 16-section
  software engineering audit. The audit found the project was **Prototype Only**
  (≈38/100) with several Critical/High severity issues.
- **Goal of this branch:** make the project **production-ready and deployable**
  without performing architectural refactors. Pure stability, security,
  observability, deployment, and documentation work.
- **Out of scope (Phase 6, separate branch `feature/service-layer-refactor`):**
  service-layer extraction, dead-code removal, JWT→HttpOnly cookies + token
  blocklist, Marshmallow full validation, flask-smorest auto-OpenAPI, `as any`
  /mypy/ESLint cleanup, soft-delete consistency, per-route `try/except` removal,
  and reorganizing `backend/tests/` into `unit/integration/api/security/regression`.

---

## 2. Non-negotiable constraints (NEVER do)

- Never invent secrets or hardcode credentials.
- Never run destructive migrations or `flask db upgrade` against any database.
- Never push to Git, never deploy, never remove existing data.
- Never silently change API behavior. (See §3 for the API-compatibility rule.)
- Never work around failing tests by weakening, removing, or skipping them.
- Never place test files beside production files (unless that is the project's
  existing convention — it is NOT for this project; tests go in
  `backend/tests/` or `frontend/src/__tests__/`).
- Never regenerate `package-lock.json` unless a dependency actually changes.
- Never enable `mypy strict` or change `tsconfig.json` strictness in this branch.
- Never add a new dependency unless the plan explicitly authorizes it.
  - **Marshmallow is NOT added** — validation uses plain helper functions in
    `app/utils/validators.py`. (User rule.)
- Backend test files stay **flat** in `backend/tests/` (no `unit/integration/...`
  reorg in this branch — it's a Phase 6 refactor).

---

## 3. Execution rules

### A. Commit granularity
- Aim for ~13 high-quality commits, each one logical engineering milestone.
- Multiple closely-related changes that solve ONE production problem go in ONE
  commit (e.g., logging + health + exception handling = one observability commit).
- Each commit must: build successfully, pass relevant tests, be independently
  understandable, and use a clear Conventional Commit message
  (`fix(area): ...`, `feat(area): ...`, `chore(area): ...`, `docs: ...`).

### B. Verification contract (every commit, before committing)
1. Run the **smallest relevant verification set**:
   - Modified backend code → affected unit + integration tests.
   - Modified frontend code → relevant frontend tests + `npm run build`.
   - Security/auth changes → authentication + authorization tests.
   - API changes → API contract tests.
   - Config changes → startup/config tests.
   - Deployment changes → `docker build`, `docker compose config`, `nginx -t`.
   - Docs-only changes → documentation validation (e.g., OpenAPI validator).
2. **Report the exact command executed.**
3. **Report pass/fail.**
4. On failure → follow §4 (Rollback policy).

### C. API compatibility
Unless explicitly instructed otherwise, these MUST remain backward compatible:
existing public API routes, request payloads, response payloads, status codes,
and authentication flow. If a change CANNOT be backward-compatible, STOP,
explain the trade-off, and wait for approval before proceeding.

**The two already-approved narrow exceptions in this branch** (called out in
their commit messages):
- Commit 4: user-search responses no longer include `email` (PII leak fix).
- Commit 6: event validation now rejects previously-accepted invalid input
  (past timestamps, negative prices). Default is to enforce.

### D. Tests ride with their production change
Every production change must either (a) already have adequate test coverage, or
(b) include new tests **in the same commit**. Bug fixes → regression tests.
Security fixes → negative tests (unauthorized / invalid / privilege escalation).
Validation → valid + invalid + boundary + malicious inputs. New endpoints →
API tests. Do NOT write tests just to inflate coverage.

---

## 4. Rollback policy (on verification failure)

If a commit fails verification and the issue cannot be resolved within the
current logical scope:

1. **Do NOT continue** to the next commit.
2. **Revert only the in-progress/uncommitted changes** — keep prior committed
   milestones intact. Use:
   ```bash
   git restore <modified-files>      # undo unstaged edits
   git clean -fd <new-files>         # discard newly-created untracked files
   # ONLY if a commit was already made and is bad:
   git reset --hard HEAD~1           # drop the last commit (unpushed only)
   ```
3. **Explain the failure** (what command, what output).
4. **Describe the root cause.**
5. **Propose one or more safe fixes.**
6. **Wait for approval** before changing scope.
7. **Never** work around failing tests by weakening or removing them.

---

## 5. Verification commands (reference)

Run these from the repo root unless noted.

```bash
# --- Backend ---
cd backend
.venv/Scripts/python.exe -m pytest tests/ -q                         # tests
.venv/Scripts/python.exe -m pytest tests/ --cov=app -q               # coverage (tooling already installed)
cd ..

# --- Frontend ---
cd frontend
npm run build                # production build (was BROKEN before Commit 2)
npm run lint                 # eslint (660 pre-existing errors at baseline)
npx tsc --noEmit             # type check
npm test                     # vitest (added in Commit 2)
cd ..

# --- Static analysis (added in Commit 10) ---
cd backend && .venv/Scripts/python.exe -m ruff check app/ && cd ..
cd backend && .venv/Scripts/python.exe -m mypy app/ && cd ..
.venv/Scripts/python.exe -m pip_audit || pip-audit

# --- Deployment validation (Commit 9) ---
docker build -t planpal-backend   -f Dockerfile          .      # backend image
docker build -t planpal-frontend  -f frontend/Dockerfile .      # frontend image
docker compose -f docker-compose.local.yml config              # compose syntax check
docker run --rm planpal-frontend nginx -t                       # nginx config test

# --- Docs validation (Commit 12) ---
# Validate OpenAPI: use redocly OR swagger-cli (whichever is available)
npx @redocly/cli@latest lint docs/openapi.yaml
#   OR
npx @apidevtools/swagger-cli@latest validate docs/openapi.yaml

# --- CI validation (Commit 11) ---
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color
```

---

## 6. Resume point (READ THIS FIRST)

**Current branch:** `fix/production-readiness`
**Last committed:** `884c0f2 chore: initialize production-readiness branch`
**Next action:** Finish and commit **Commit 2**.

### Commit 2 status: 🟡 IN PROGRESS (code done, not committed)

Code changes already made (uncommitted in working tree):
- ✅ Created `frontend/src/config.ts` — single source for `BYPASS_AUTH` flag.
- ✅ Created `frontend/src/services/mockAdapter.ts` — the missing import that
       broke the build; minimal mock adapter for opt-in offline UI preview.
- ✅ Edited `frontend/src/services/axiosInstance.ts` — imports `BYPASS_AUTH`
       from `../config` instead of hardcoding `true`; removed `as any`.
- ✅ Edited `frontend/src/context/AuthContext.tsx` — imports `BYPASS_AUTH`
       from `../config` instead of hardcoding `true`.
- ✅ Edited `frontend/.env.example` — documents `VITE_BYPASS_AUTH`.
- ✅ Verified `npm run build` — **PASSES** (was broken at baseline).

Still TODO before Commit 2 can be committed:
- ⬜ Add Vitest + jsdom + @testing-library/react to `frontend/devDependencies`.
- ⬜ Add `frontend/src/__tests__/` with: `config.test.ts`, `tokenService.test.ts`,
      `AuthContext.test.tsx`, `ProtectedRoute.test.tsx`.
- ⬜ Verify `npm test` passes.
- ⬜ Verify `npm run lint` did not regress (pre-existing 660 errors are OK;
      no NEW errors from this commit).
- ⬜ Stage only the files this commit owns and commit.

### Known stray file (do NOT touch unless owner approves)
- `frontend/src/context/AuthContext.jsx` is **untracked** and predates this
  branch (leftover from the JS→TS migration). Having both `.tsx` and `.jsx`
  could cause module-resolution ambiguity. **Do not delete** — flag it in the
  commit message and in `BASELINE_STATUS.md` §6 instead.

---

## 7. The plan — commit by commit

Each entry lists: status, scope, exact files, tests required, verification,
and notes/trade-offs.

---

### [x] Commit 0 — `docs: capture project baseline status`
- **SHA:** `7f024eb`
- **What:** Captured pre-fix state of `Deployment` so future failures can be
  distinguished from pre-existing issues.
- **Files:** `docs/BASELINE_STATUS.md` (new).
- **Findings captured:**
  - Backend tests: ✅ 16/16 pass (2 test-only JWT warnings).
  - Frontend build: ❌ broken (`./mockAdapter` module not found).
  - Frontend lint: ❌ 660 errors (heavy `as any`; deferred to Phase 6).
  - Frontend tsc: ❌ 1 error (same missing module).
  - Coverage tooling already installed (`pytest-cov 7.1.0`).
- **Verification:** file reflects reality (N/A — docs only).

---

### [x] Commit 1 — `chore: initialize production-readiness branch`
- **SHA:** `884c0f2`
- **What:** Created `fix/production-readiness` off `Deployment`; added the
  running manual-actions tracker.
- **Files:** `MANUAL_ACTIONS_REQUIRED.md` (new).
- **No production code → no tests.**

---

### [~] Commit 2 — `fix(frontend): restore production authentication flow`
- **Scope:** The shipped frontend had `BYPASS_AUTH = true` hardcoded in two
  files, forcing a mock admin user for every visitor. Also, `axiosInstance.ts`
  imported `./mockAdapter` which **did not exist**, breaking the build.
- **Files (this commit owns):**
  - `frontend/src/config.ts` (new) — single source for `BYPASS_AUTH`.
  - `frontend/src/services/mockAdapter.ts` (new) — satisfies the import;
    minimal mock adapter for opt-in preview mode.
  - `frontend/src/services/axiosInstance.ts` (edit) — import from `../config`.
  - `frontend/src/context/AuthContext.tsx` (edit) — import from `../config`.
  - `frontend/.env.example` (edit) — document `VITE_BYPASS_AUTH`.
  - `frontend/package.json` + `frontend/package-lock.json` (edit) — add Vitest.
  - `frontend/vitest.config.ts` (new) — Vitest + jsdom config.
  - `frontend/src/__tests__/config.test.ts` (new)
  - `frontend/src/__tests__/tokenService.test.ts` (new)
  - `frontend/src/__tests__/AuthContext.test.tsx` (new)
  - `frontend/src/__tests__/ProtectedRoute.test.tsx` (new)
  - `frontend/src/setupTests.ts` (new) — @testing-library/jest-dom register.
- **Tests required (behavior, not coverage padding):**
  - `config.test.ts`: default `BYPASS_AUTH=false`; `VITE_BYPASS_AUTH='true'` → true.
  - `tokenService.test.ts`: setTokens→get→clear round-trip; expired-token
    rejected; malformed token rejected; `isAuthenticated` false with no token.
  - `AuthContext.test.tsx` (BYPASS_AUTH=false): unauthenticated initial state;
    successful login transitions to authenticated + stores tokens; failed
    login stays unauthenticated + sets error; logout clears state.
  - `ProtectedRoute.test.tsx`: loading → spinner; unauthenticated → redirect
    to `/login`; authenticated → renders children.
- **Verification:**
  - `cd frontend && npm install` (adds Vitest deps).
  - `npm test` — all new tests pass.
  - `npm run build` — **already verified PASS** after the code edits.
  - `npm run lint` — must not introduce NEW errors beyond the 660 baseline.
- **API compat:** unchanged. Real-backend flow preserved; bypass is opt-in via
  env, default off.
- **Notes/trade-offs:**
  - Stray `AuthContext.jsx` exists (untracked, pre-JS→TS leftover). Flag, don't delete.
  - Vitest config must read env from `process.env` not `import.meta.env` in tests
    (Vite's `define` in `vite.config.ts` bakes values at build time).

---

### [ ] Commit 3 — `fix(security): harden production configuration`
- **Scope:** `ProductionConfig` silently generated random per-restart secrets
  if env vars were missing. Add explicit validation that fails fast in prod.
- **Files:**
  - `backend/config.py` (edit) — add `ProductionConfig.validate()` that raises
    `RuntimeError` listing ALL missing/invalid envs: `SECRET_KEY`,
    `JWT_SECRET_KEY`, `ENCRYPTION_KEY`, `SUPABASE_DATABASE_URL`,
    `ALLOWED_ORIGINS` (non-empty list), JWT expiry sanity, `SUPABASE_URL` +
    `SUPABASE_ANON_KEY` if storage is used, mail config if `MAIL_ENABLED`.
  - `backend/app/__init__.py` (edit) — `create_app` calls validate when
    `FLASK_ENV=production`; logs a config-sanity banner on boot.
- **Tests:** `backend/tests/test_config.py`
  - Dev config boots with random fallbacks (no raise).
  - Production raises on each missing var (parametrized over all required vars).
  - Production passes when all required vars are set.
  - Bad `ALLOWED_ORIGINS` (empty) rejected.
  - Dev fallbacks absent from production config object.
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`.
- **API compat:** unchanged.
- **Manual action (owner):** rotate secrets — see `MANUAL_ACTIONS_REQUIRED.md`.

---

### [ ] Commit 4 — `fix(security): address authorization and data exposure issues`
- **Scope:** IDOR on notification creation; missing UUID validation on route
  params; email PII leak in user search.
- **Files:**
  - `backend/app/routes/notifications.py` (edit) — `create_notification()`:
    derive `user_id` from `get_jwt_identity()`; ignore body `user_id` unless
    requester is admin. Validate `notification_id` with `validate_uuid`.
  - `backend/app/routes/events.py` (edit) — `validate_uuid` on `event_id`
    in detail / join / leave / update / delete / update-status /
    participation_status. (GET `/` and `/my`, `/joined` do not take an id.)
  - `backend/app/models/__init__.py` (edit) — add `User.to_public_dict()`
    (no `email`, no `password_hash`).
  - `backend/app/routes/users.py` (edit) — `search_users()` returns public
    fields only via `to_public_dict()`.
- **Tests:** `backend/tests/test_security_authorization.py` (negative tests):
  - IDOR: user A cannot create a notification for user B (403/400); admin can.
  - PII: user-search response contains no `email` / `password_hash` keys.
  - UUID: non-UUID `event_id` / `notification_id` → 400 (not 500).
  - Regression: existing happy paths still pass.
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`.
- **API compat — APPROVED BREAKING CHANGE:** user-search no longer returns
  `email`. Security-justified. Documented in commit message.

---

### [ ] Commit 5 — `fix(database): improve transaction handling and query performance`
- **Scope:** `Event.update_participant_count()` commits internally (breaks
  atomicity with caller); N+1 query on `Event.creator` in list endpoints.
- **Files:**
  - `backend/app/models/__init__.py` (edit) —
    `Event.update_participant_count()`: `db.session.commit()` → `db.session.flush()`.
  - `backend/app/routes/events.py` (edit) — audit callers in
    `join_event` / `leave_event` / `update_participation_status` /
    `create_event` to confirm route-level commit remains; add
    `.options(joinedload(Event.creator))` + `.unique()` to
    `get_events`, `get_event_details`, `get_my_events`, `get_joined_events`.
  - `backend/app/routes/events.py` (top) — import `joinedload`.
- **Tests:** `backend/tests/test_db_transactions.py`
  - `update_participant_count` does NOT commit standalone: call flush, rollback
    the caller → counter unchanged, proving no premature commit.
  - join → leave leaves DB state consistent (counter returns to original).
  - Participant count correct after a multi-step participation sequence.
  - Eager-load sanity: `to_dict()` works after `joinedload(Event.creator)`.
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`.
- **API compat:** unchanged.
- **Note:** N+1 fix may be under-exercised by the mock-heavy
  `test_core_api_contracts.py` — flag in commit message.

---

### [ ] Commit 6 — `feat(validation): strengthen event request validation`
- **Scope:** Ad-hoc `if not data.get(field)` checks; no validation of types,
  ranges, or semantics (past dates, negative prices accepted).
- **Files:**
  - `backend/app/utils/validators.py` (edit) — add helpers (NO new dep):
    `validate_event_title`, `validate_event_timestamp` (must be future, ISO),
    `validate_price` (>= 0), `validate_max_participants` (> 0),
    `validate_location_fields`, plus all-optional update variants.
  - `backend/app/routes/events.py` (edit) — wire helpers into
    `create_event` and `update_event`.
- **Tests:** `backend/tests/test_event_validation.py`
  - Valid input accepted.
  - Missing each required field → 400.
  - Past timestamp → 400.
  - Negative price → 400.
  - Zero / negative `max_participants` → 400.
  - Title length boundaries (empty, exactly max, over max).
  - Non-UUID `tag_ids` → 400.
  - Update with empty body = no-op success.
  - Malicious / oversize payload handled (truncated or rejected, not crash).
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`.
- **API compat — APPROVED BREAKING CHANGE:** invalid input that previously
  slipped through (past timestamps, negative prices) is now rejected. These
  were never valid; default is to enforce.

---

### [ ] Commit 7 — `feat(security): add rate limiting`
- **Scope:** `Flask-Limiter==3.5.0` is in requirements but never wired.
- **Files:**
  - `backend/app/__init__.py` (edit) — init `Limiter` with
    `storage_uri` from env (in-memory default; disabled under `TESTING`).
  - `backend/app/routes/auth.py` (edit) — `@limiter.limit("5/minute")` on
    `register` and `login`; `@limiter.limit("10/minute")` on `change-password`.
  - `backend/.env.example` (edit) — `RATE_LIMIT_STORAGE_URI`.
- **Tests:** `backend/tests/test_rate_limiting.py`
  - N requests within limit succeed.
  - (N+1)th on `/login` and `/register` → 429 with JSON body.
  - `/change-password` limit is independent.
  - **Fixture must re-enable the Limiter for this file only** so the assertion
    is real, not bypassed by `TESTING` (toggle `limiter.enabled` per-test).
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`.
- **API compat:** 429 responses are additive; only affects over-limit clients.

---

### [ ] Commit 8 — `feat(observability): improve logging, health checks, and error handling`
- **Scope:** No structured logging; no request IDs; potential secret leakage in
  logs; no liveness/readiness split; no centralized exception handler.
- **Files:**
  - `backend/app/utils/logging_config.py` (new) — structured logging (JSON in
    prod, human in dev); `X-Request-ID` middleware (generate if absent);
    **redaction filter** masking `Authorization`, `Cookie`, `password*`,
    `*token*`, `*_key`, `secret*` in every log record.
  - `backend/app/services/task_scheduler.py` (edit) — replace `print()` with logger.
  - `backend/app/routes/system.py` (edit) — add:
    - `GET /health` → always 200, process liveness only, no dep checks.
    - `GET /ready` → DB ping + optional Redis ping + required-env; `503` if
      unhealthy with per-check JSON body.
    - Keep `GET /api/system/health` as DB-health alias for backward compat.
  - `backend/app/__init__.py` (edit) — register centralized exception handlers
    (`SQLAlchemyError`, `IntegrityError`, JWT errors
    `ExpiredSignatureError`/`NoAuthorizationError`/`InvalidTokenError`,
    `HTTPException`, improved 404/500/413/429).
- **Tests:** `backend/tests/test_observability.py`
  - `/health` returns 200 even when DB is down (mock DB failure).
  - `/ready` returns 503 with per-check breakdown when DB fails; 200 when healthy.
  - `X-Request-ID` echoed when sent; auto-generated when absent.
  - Redaction filter unit test: `Authorization: Bearer X`, `password=secret`,
    `refresh_token=y` all appear masked in captured log output.
  - Centralized handlers: `IntegrityError` → safe 4xx message; expired JWT →
    401 JSON; unknown route → 404 JSON (not HTML).
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`
  + manual `curl http://localhost:5000/health` and `/ready`.
- **API compat:** `/health` + `/ready` are additive. Existing error status codes
  preserved; centralized handlers only fill gaps. Per-route `try/except` left in
  place (Phase 6 cleanup).

---

### [ ] Commit 9 — `chore(deploy): add production containerization and reverse proxy`
- **Scope:** No Dockerfile, no compose, no Nginx, no TLS config existed.
- **Files:**
  - `Dockerfile` (new) — backend: `python:3.11-slim`, non-root user, install
    requirements, gunicorn entrypoint (workers env-driven).
  - `.dockerignore` (new).
  - `frontend/Dockerfile` (new) — multi-stage: build Vite, serve `dist/` via
    `nginx:alpine`.
  - `frontend/.dockerignore` (new).
  - `docker-compose.local.yml` (new) — `backend` + `frontend` + `db` (postgres:16)
    + `redis`; healthchecks wired to `/health` + `/ready`. **Header comment +
    docs note: "Local DB only — production uses Supabase."**
  - `nginx/nginx.conf` (new) — TLS-ready (cert paths via env), gzip, reverse
    proxy to backend, SPA fallback, full security-header set (HSTS,
    X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
    CSP tuned to allow the SPA).
- **No unit tests** (deployment infra). Verification IS the test:
  - `docker build -t planpal-backend -f Dockerfile .`
  - `docker build -t planpal-frontend -f frontend/Dockerfile .`
  - `docker compose -f docker-compose.local.yml config`
  - `docker run --rm planpal-frontend nginx -t`
  - If Docker is unavailable in the environment → record exact commands in
    `MANUAL_ACTIONS_REQUIRED.md` for the owner to run.
- **API compat:** N/A (infra).

---

### [ ] Commit 10 — `chore(quality): add startup validation, static analysis, and dependency audit`
- **Scope:** Finalize startup hook (fail on env, NOT on DB); add static-analysis
  config + reports; dependency audit.
- **Files:**
  - `backend/app/__init__.py` (edit) — finalize startup hook: production
    fail-fast on missing env; DB-unreachable logs warning and does NOT raise
    (let `/ready` 503; prevent crash-loops).
  - `ruff.toml` (new) — default config, **strict mode NOT enabled**.
  - `.mypy.ini` (new) — default config, **strict mode NOT enabled**.
  - `docs/STATIC_ANALYSIS_REPORT.md` (new) — output of:
    `ruff check`, `mypy backend/app`, `npm run lint`, `tsc --noEmit`,
    `pip-audit`, `npm audit`. File-by-file findings, severity, recommended
    fix, safe-to-auto-fix flag, effort, risk, pre-deploy vs defer.
  - `docs/DEPENDENCY_AUDIT.md` (new) — CVE, severity, package, current/safe
    version, upgrade rec, safe-in-branch flag.
- **Auto-fix ALLOWLIST (only these):** unused imports, unused vars (obviously
  safe), formatting, import ordering, trivially-dead code.
- **Explicitly NOT auto-fixed (document only):** `as any`, large TS typing,
  mypy errors needing API/logic changes, signatures, hooks, public APIs.
- **Investigate the suspicious version pins** flagged in the audit
  (`typescript@^6`, `vite@^8`, `@vitejs/plugin-react@^6`): verify against
  `package-lock.json` + installed `node_modules`; report findings; propose
  realistic replacements if wrong. **Do NOT rewrite `package.json` or
  regenerate `package-lock.json` without owner approval.**
- **Auto-upgrade ONLY if:** patch/minor, no API change, no build config change,
  no breaking change, existing tests pass, builds succeed. NEVER auto-upgrade:
  React, React Router, Vite, TypeScript, Flask, SQLAlchemy, Alembic, Supabase
  client, auth libs, build tooling, bundlers, transpilers.
- **Tests:** `backend/tests/test_startup.py`
  - Startup with complete prod env succeeds.
  - Startup with each missing required env raises naming the var.
  - DB-unreachable path logs warning and does NOT raise (mock `db.engine`).
- **Verification:** `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`;
  `cd frontend && npm run build && npm test`.

---

### [ ] Commit 11 — `chore(ci): add GitHub Actions workflow`
- **Scope:** No CI existed. Add after static-analysis config exists (Commit 10)
  so the workflow references real tools.
- **Files:** `.github/workflows/ci.yml` (new).
  - **Backend job:** install, `ruff check`, `pytest`, `pip-audit`.
  - **Frontend job:** install, `npm run lint`, `npm run build`, `npm audit`,
    `npm test`.
  - Cache pip + npm. Run on PR + push.
- **Verification:** `actionlint` or YAML lint (or report if unavailable).
- **Manual action (owner):** add repo Secrets only if you later add jobs that
  need them (registry creds, integration DB). Default CI needs no secrets.

---

### [ ] Commit 12 — `docs: improve API and deployment documentation`
- **Scope:** Route docs out of sync; no OpenAPI; no deployment guide; no changelog.
- **Files:**
  - `docs/ROUTE_DOCUMENTATION.md` (edit) — remove nonexistent endpoints; fix
    `source_type` ('text'-only); correct status codes; align with real impl.
  - `docs/openapi.yaml` (new) — hand-maintained OpenAPI 3.0: metadata, servers,
    JWT bearer auth scheme, tags, every implemented endpoint, request/response
    schemas, errors, status codes, path/query params, examples. Header note:
    "manually maintained; auto-generation deferred to Phase 6."
  - `docs/DEPLOYMENT.md` (new) — local compose run, deploy steps, env var
    reference, rollback notes, Supabase-as-prod-DB clarification, OpenAPI sync
    burden.
  - `CHANGELOG.md` (new) — Added / Changed / Fixed / Security / Deployment
    covering all commits.
  - `docs/TEST_SUMMARY.md` (new) — existing tests, new tests added, files
    covered, features covered, remaining untested areas, known limitations,
    manual verification still required; before/after coverage % (tooling
    already installed — pytest-cov).
  - `MANUAL_ACTIONS_REQUIRED.md` (edit) — final consolidated list.
- **Verification:**
  - `npx @redocly/cli@latest lint docs/openapi.yaml` **OR**
    `npx @apidevtools/swagger-cli@latest validate docs/openapi.yaml` —
    **stop + report if invalid.**
- **API compat:** N/A (docs).

---

### [ ] Final — Full validation suite (before declaring done)

Run every check, report each pass/fail:
```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/ -q && cd ..
cd frontend && npm test && npm run build && npm run lint && npx tsc --noEmit && cd ..
cd backend && .venv/Scripts/python.exe -m pip_audit && cd ..
cd frontend && npm audit && cd ..
# OpenAPI validation
# Docker build + compose config + nginx -t
# CI workflow lint (actionlint)
```

---

## 8. Master checklist

### Phase 0 — Baseline
- [x] Commit 0 — baseline captured → `7f024eb`

### Phase 1 — Stability & Security
- [x] Commit 1 — branch + manual actions tracker → `884c0f2`
- [~] Commit 2 — frontend auth flow restored (code done, build green; **Vitest + tests + commit pending**)
- [ ] Commit 3 — production config validation
- [ ] Commit 4 — IDOR + UUID + PII
- [ ] Commit 5 — DB transactions + N+1
- [ ] Commit 6 — event validation helpers
- [ ] Commit 7 — rate limiting
- [ ] Commit 8 — logging + health + exceptions

### Phase 3 — Deployment
- [ ] Commit 9 — Docker + compose + nginx

### Phase 4 — Quality & CI
- [ ] Commit 10 — startup validation + static analysis + dep audit
- [ ] Commit 11 — GitHub Actions

### Phase 5 — Documentation
- [ ] Commit 12 — route docs + OpenAPI + DEPLOYMENT + CHANGELOG + TEST_SUMMARY
- [ ] Final — full validation suite

### Deferred to Phase 6 (`feature/service-layer-refactor`)
- [ ] Event business logic → `EventService`; routes become thin.
- [ ] Dead-code removal (`EventService` dead copy, push stubs, unused deps
      `numpy`/`pandas`/`init`, `bleach` → `nh3`).
- [ ] JWT → HttpOnly cookies + CSRF + token blocklist (real logout).
- [ ] Marshmallow (or similar) full request validation across all routes.
- [ ] `flask-smorest` auto-OpenAPI generation.
- [ ] `as any` / mypy / ESLint cleanup; enable strict mode.
- [ ] Soft-delete consistency for events.
- [ ] Per-route `try/except` removal (now that centralized handlers exist).
- [ ] Reorganize `backend/tests/` into `unit/integration/api/security/regression`.
- [ ] Collapse `database/init.sql` vs `supabase_migration.sql` into one source
      of truth; introduce Alembic/Flask-Migrate.

---

## 9. Quick resume script

If you are resuming and want to confirm where things stand:

```bash
cd "$(git rev-parse --show-toplevel)"
echo "Branch:        $(git branch --show-current)"
echo "Last commit:   $(git log -1 --oneline)"
echo "Uncommitted:"
git status --short
echo
echo "Recent history:"
git log --oneline -8
```

Then read **§6 (Resume Point)** of this file and continue from there.
