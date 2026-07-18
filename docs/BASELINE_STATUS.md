# Baseline Status (Pre-Fix Snapshot)

> **Purpose:** Capture the exact state of the project on the `Deployment` branch
> *before* the `fix/production-readiness` work begins. Future test/build failures
> can be compared against this to distinguish **new regressions** from
> **pre-existing issues**. Per branch policy, pre-existing bugs unrelated to
> production readiness are recorded here and left untouched in this branch.

**Captured:** 2026-07-18
**Branch at capture:** `Deployment` (commit `1d5886e`)
**Toolchain:**
- Python `3.11.9` (backend venv at `backend/.venv/`)
- Node `v24.18.0`, npm `11.16.0`
- pytest `7.4.x`, pytest-cov `7.1.0`, coverage `7.15.1` (already installed)
- Vite `8.1.3` (rolldown-based)

---

## 1. Backend tests — `pytest backend/tests -q`

```
................                                                         [100%]
============================== warnings summary ===============================
tests/test_auth.py::test_register_success
tests/test_auth.py::test_login_success
  jwt/api_jwt.py:147: InsecureKeyLengthWarning: The HMAC key is 15 bytes long,
  which is below the minimum recommended length of 32 bytes for SHA256.
  See RFC 7518 Section 3.2.

16 passed, 2 warnings in 4.16s
```

**Result: ✅ PASS — 16/16 tests.**

### Notes
- The 2 warnings are caused by the **test fixture** setting `JWT_SECRET_KEY='test-jwt-secret'` (15 chars) in `backend/tests/conftest.py`. This is test-only configuration and does not reflect production behavior. Will be left as-is (not in scope to refactor test secrets).
- Test inventory (5 files, 16 tests):
  - `test_auth.py` — 5 tests (register, dup-email, login, wrong password, unauthorized profile)
  - `test_events.py` — 2 tests (pagination shape, unauthorized create)
  - `test_notifications.py` — 2 tests (both unauthorized-only)
  - `test_participation.py` — 2 tests (both unauthorized-only)
  - `test_core_api_contracts.py` — 5 tests (response-shape contracts, heavily mocked with `SimpleNamespace`/`FakeSession`)

### Known backend test-coverage gaps (pre-existing, not caused by this branch)
- **No authorization tests.** Creator-only event edit, admin-only tag/delete, notification ownership — none tested.
- **No validation tests** for event create/update beyond `required fields`.
- **No rate-limiting tests** (limiter not wired yet).
- **No health/readiness tests** (endpoints don't exist yet).
- `test_core_api_contracts.py` mocks the ORM so heavily (`events.Tag.query`, `events.Event.query` replaced with fakes) that **real code paths are not exercised**. These are response-shape tests, not behavior tests.

---

## 2. Frontend build — `npm run build`

```
✓ 2298 modules transformed.
✗ Build failed in 5.52s
error during build:
[UNRESOLVED_IMPORT] Could not resolve './mockAdapter' in src/services/axiosInstance.ts
  src/services/axiosInstance.ts:18:29
  import { mockAdapter } from "./mockAdapter";
                                       ───────┬───────
                                              ╰───────── Module not found.
```

**Result: ❌ FAIL — build is broken.**

### Root cause
`frontend/src/services/axiosInstance.ts:18` imports `mockAdapter` from `./mockAdapter`, but **that file does not exist** in `frontend/src/services/`. The import is guarded behind `BYPASS_AUTH = true` (hardcoded), so it executes at module load and crashes the bundler regardless of the flag value.

### Status in this branch
**Recorded as known baseline failure.** This is the primary subject of **Commit 2** (`fix(frontend): restore production authentication flow`), which will create the missing `mockAdapter.ts`, remove the hardcoded `BYPASS_AUTH = true`, and env-gate it via a new `config.ts`. It is intentionally **not** fixed in Commit 0.

---

## 3. Frontend lint — `npm run lint`

```
✖ 676 problems (660 errors, 16 warnings)
  7 errors and 0 warnings potentially fixable with the `--fix` option.
```

**Result: ❌ FAIL — 660 lint errors.**

### Categories (top offenders)
- `@typescript-eslint/no-unsafe-member-access` / `no-unsafe-assignment` / `no-unsafe-argument` — the vast majority, all stemming from heavy `as any` casts on API responses in pages (e.g. `Events.tsx`, `EventDetails.tsx`, `Dashboard.tsx`, `CreateEvent.tsx`).
- `@typescript-eslint/no-explicit-any` — explicit `any` usage (axios mock wiring, validators).
- `@typescript-eslint/no-misused-promises` — async handlers passed directly to `onSubmit` in `Login.tsx`, `Register.tsx`.
- `@typescript-eslint/prefer-promise-reject-errors` — bare `Promise.reject(error)` in `axiosInstance.ts` interceptors.

### Status in this branch
**Pre-existing, recorded, NOT auto-fixed in bulk.** Per branch policy:
- **Safe auto-fixes only** (unused imports, formatting, import order, obviously-dead code) will be applied in **Commit 10** (static analysis).
- **All other findings** (the `as any` cascade, misused promises, unsafe assignments) will be **documented in `docs/STATIC_ANALYSIS_REPORT.md`** and deferred to **Phase 6** (`feature/service-layer-refactor`). Fixing them is a large, behavior-risky refactor that conflicts with the "no architecture changes" rule for this branch.

---

## 4. Frontend type check — `npx tsc --noEmit`

```
src/services/axiosInstance.ts(31,29): error TS2307: Cannot find module './mockAdapter'
  or its corresponding type declarations.
```

**Result: ❌ FAIL — 1 error.**

### Root cause
Same as the build failure: the missing `./mockAdapter` module. Fixed in **Commit 2**.

### Notes
- `tsconfig.json` has `"strict": true` already enabled (this is the project's existing setting, not something this branch introduces).
- No other type errors — TypeScript is otherwise clean once the missing module is created.

---

## 5. Coverage tooling

`pytest-cov 7.1.0` and `coverage 7.15.1` are **already installed** in the backend venv. There is **no `.coveragerc`, `pytest.ini`, `setup.cfg`, `pyproject.toml`, or `tox.ini`** configuring coverage.

Per branch policy ("do not introduce coverage tooling solely for this branch"), I will:
- **Use** the existing pytest-cov (no new dependency) to produce a coverage report at the end of the branch.
- **Not** add a coverage config file (that would be tooling churn for this branch).
- Report **before/after coverage %** in `docs/TEST_SUMMARY.md` (Commit 12).

Baseline backend coverage (with current 16 tests, measured now for later comparison):

_Command to reproduce:_
```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/ --cov=app --cov-report=term -q
```
(Measurement will be captured as part of Commit 12's TEST_SUMMARY; not run here to avoid committing a `.coverage` artifact.)

---

## 6. Unrelated pre-existing issues (recorded, NOT fixed this branch)

These were observed during baseline capture and the prior audit. They are **out of scope** for the production-readiness branch (they are architecture/refactor concerns) and are tracked here so they are not silently lost:

| # | Issue | Location | Deferred to |
|---|---|---|---|
| 1 | `EventService` (485 lines) is dead code — never imported | `backend/app/services/event_service.py` | Phase 6 |
| 2 | Heavy `as any` casts erode the type system | many `frontend/src/pages/*.tsx` | Phase 6 |
| 3 | `test_core_api_contracts.py` mocks ORM so heavily it doesn't test real paths | `backend/tests/test_core_api_contracts.py` | Phase 6 |
| 4 | Per-route `try/except` blocks duplicate the centralized handler (added in Commit 8) | all `backend/app/routes/*.py` | Phase 6 |
| 5 | Two divergent DB-init scripts (`init.sql` vs `supabase_migration.sql`) | `database/*.sql` | Phase 6 / migration work |
| 6 | `requirements.txt` lists `numpy`, `pandas` (apparently unused), `bleach` (deprecated) | `backend/requirements.txt` | Phase 6 / Commit 10 audit |
| 7 | `package.json` lists `"init": "^0.1.2"` (bogus dependency) | `frontend/package.json` | Phase 6 |
| 8 | `docs/ROUTE_DOCUMENTATION.md` documents 6 endpoints that don't exist | `docs/ROUTE_DOCUMENTATION.md` | Commit 12 |
| 9 | Push-notification endpoints are no-op stubs returning 200 | `backend/app/routes/notifications.py` | Phase 6 |

---

## 7. Recommendation: reorganize `backend/tests/` (Phase 6, not this branch)

The current backend test directory is flat (5 files at the root of `backend/tests/`). As the suite grows during this branch (test_config, test_security_authorization, test_db_transactions, test_event_validation, test_rate_limiting, test_observability, test_startup), the flat layout will become hard to navigate.

**Recommended Phase 6 structure:**
```
backend/tests/
  unit/           # validators, models, helpers
  integration/    # db transactions, service-level
  api/            # endpoint contracts, response shapes
  security/       # authz, IDOR, PII, rate limiting
  regression/     # bug-specific regression tests
  conftest.py
```

**Why not do it in this branch:** moving the existing 5 test files would inflate every diff and obscure the production changes. New tests added in this branch will follow the **existing flat convention** to keep diffs minimal and reviewable. The reorganization is a pure refactor and belongs in Phase 6.

---

## Summary

| Check | Result | Action in this branch |
|---|---|---|
| Backend tests | ✅ 16/16 pass | Build on this base |
| Frontend build | ❌ broken (missing module) | Fixed in Commit 2 |
| Frontend lint | ❌ 660 errors | Safe auto-fixes in Commit 10; rest documented + deferred |
| Frontend tsc | ❌ 1 error (same missing module) | Fixed in Commit 2 |
| Coverage tooling | ✅ already installed | Reused; before/after reported in Commit 12 |
