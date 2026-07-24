# Manual Actions Required

> This file tracks everything that **cannot be completed by code alone** in the
> `fix/production-readiness` branch. Items are split into:
>
> - ✅ **AI-completed** — done in code by this branch; listed here for visibility.
> - ⚠️ **Requires your intervention** — needs access to external services
>   (Supabase dashboard, GitHub Secrets, DNS, TLS, container registry, etc.).
>   The AI will **never** execute these, invent values, or use placeholders.
>
> This file is updated as the branch progresses and consolidated in the final
> docs commit (Commit 12).

---

## ⚠️ CRITICAL — Secrets rotation (do this before any production deploy)

The local `backend/.env` (correctly gitignored, **not** tracked) contains live
Supabase and JWT credentials. Although not committed, treat them as potentially
exposed and rotate all of them before deploying.

### What to rotate and where

| Secret | Where it lives | Where to rotate | Action |
|---|---|---|---|
| Supabase `service_role` key | `backend/.env` `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API → `service_role` secret → "Rotate" | ⚠️ **Rotate.** Possession bypasses all RLS. |
| Supabase `anon` key | `backend/.env` `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → JWT settings | ⚠️ Rotate. |
| Supabase DB password | `backend/.env` `SUPABASE_DATABASE_URL` (embedded) | Supabase dashboard → Database → Database password → "Reset" | ⚠️ Rotate (currently weak). Update pooler URL. |
| `SECRET_KEY` | `backend/.env` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | ⚠️ Set a strong value in your secret manager. |
| `JWT_SECRET_KEY` | `backend/.env` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | ⚠️ Set a strong value. **Rotation invalidates all sessions.** |
| `ENCRYPTION_KEY` | `backend/.env` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | ⚠️ Set a strong value. |

### Verify the secrets were never committed to git history

```bash
git log --all --full-history -- backend/.env
git log --all --full-history -- frontend/.env
```
If either command returns a commit, the secrets **must** be rotated regardless
of the steps above, and the history should be purged (e.g. `git filter-repo`)
— but history rewriting is destructive and out of scope for this branch.

---

## ⚠️ Secret storage (production)

This branch ships a `ProductionConfig.validate()` (Commit 3) that **fails fast**
if any required environment variable is missing. It does **not** dictate where
you store the secrets. Before production:

- [ ] Decide on a secret manager (AWS Secrets Manager, Doppler, Vault, GitHub
      Secrets for CI, Supabase Vault, etc.).
- [ ] Inject secrets at runtime via environment variables — never bake them
      into the Docker image (the Dockerfiles in Commit 9 read env at runtime).
- [ ] Remove the local `backend/.env` from any deployment artifact.

---

## ⚠️ Database migration (Commit 10 references this)

This branch does **not** initialize Alembic or apply any migration — that work
is scoped out per branch policy (migration tooling + collapsing the divergent
`init.sql` / `supabase_migration.sql` belongs in a dedicated database branch).

When you are ready to introduce migrations (Phase 6 or a `feature/db-migrations`
branch), the steps will be:

```bash
cd backend
flask db init                              # creates migrations/
flask db migrate -m "baseline from models" # REVIEW the generated migration
# DO NOT run 'flask db upgrade' against production until you have reviewed
# every ALTER/DROP and confirmed it will not touch existing data.
```

Until then, the existing `database/supabase_migration.sql` remains the
canonical schema (see Commit 12 docs).

---

## ⚠️ Deployment (Commit 9 ships the config; you deploy)

Commit 9 adds: `Dockerfile` (backend), `frontend/Dockerfile` (multi-stage),
`docker-compose.local.yml` (local-only stack), `nginx/nginx.conf`. None of these
are built, pushed, or deployed by this branch.

### To run the local stack
```bash
docker-compose -f docker-compose.local.yml up --build
# Backend: http://localhost:5000  Frontend: http://localhost:3000
```

### To deploy to production (your responsibility)
- [ ] Build and push images to your registry (Docker Hub, GHCR, ECR, etc.).
- [ ] Provision the production host / cluster (VM, ECS, k8s, Render, Fly, etc.).
- [ ] Obtain a TLS certificate (Let's Encrypt / certbot / ACM).
- [ ] Wire `nginx.conf` cert paths to real certificate locations.
- [ ] Point DNS at the host.
- [ ] Configure production secrets via your secret manager (above).
- [ ] Configure production `ALLOWED_ORIGINS` to the real frontend origin.

---

## ⚠️ GitHub Actions CI (Commit 11)

Commit 11 adds `.github/workflows/ci.yml`. It runs on push/PR using only
publicly available actions and the repo's own code (SQLite in-memory for tests,
no live Supabase). **No GitHub Secrets are required for CI to pass.**

If you later want CI to run integration tests against a real database or to
publish Docker images, you will need to add repository secrets:
- [ ] `SUPABASE_DATABASE_URL` (test project only — never production)
- [ ] Registry credentials (if adding a build-and-push job)

---

## ✅ AI-completed in this branch (for visibility)

| Commit | What was done |
|---|---|
| 0 | Captured baseline status to `docs/BASELINE_STATUS.md` |
| 1 | Created branch + this tracker |
| 2 | Removed hardcoded frontend auth bypass; created missing `mockAdapter` |
| 3 | Added production env validation (fail-fast on missing secrets/config) |
| 4 | Closed IDOR on notification creation; UUID-validated route params; stripped PII from user search |
| 5 | Made `update_participant_count` transaction-safe; eager-loaded event creator |
| 6 | Strengthened event request validation |
| 7 | Wired Flask-Limiter on auth endpoints |
| 8 | Added structured logging + redaction; `/health` + `/ready`; centralized exception handlers |
| 9 | Added Dockerfiles, local compose, Nginx config |
| 10 | Startup validation; ruff/mypy config; static-analysis + dependency-audit reports |
| 11 | GitHub Actions CI workflow |
| 12 | Route docs, OpenAPI spec, deployment guide, changelog, test summary |

(Commit numbers ≥2 are filled in as the work lands. Items marked ⚠️ above are
the only ones that require your action.)

## Docker Verification (Commit 9)
- [ ] Run `docker compose -f docker-compose.local.yml build` to verify images build
- [ ] Run `docker compose -f docker-compose.local.yml up` to verify local stack
- [ ] Verify `/api/system/health` returns 200 through nginx proxy
