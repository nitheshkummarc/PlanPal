# Deployment Guide

## 1. Local Development Setup
**Backend:**
- Create `backend/.env` (from example).
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.txt && flask run`

**Frontend:**
- Create `frontend/.env` (from example).
- `npm ci && npm run dev`

## 2. Docker Compose Local Run
To boot the full stack locally:
```bash
docker-compose -f docker-compose.local.yml up --build
```
Access frontend at `http://localhost:3000` and API via `http://localhost:3000/api/` (proxied to `http://localhost:5000`).

## 3. Production Deployment Checklist
- [ ] **Environment Variables:** Inject secrets at runtime; never commit `.env`.
- [ ] **Secrets Management:** Rotate any potentially exposed keys (e.g., Supabase JWT).
- [ ] **TLS / SSL:** Ensure your reverse proxy (e.g., Nginx, ALB) terminates HTTPS.
- [ ] **Build & Push:** Push `Dockerfile` and `frontend/Dockerfile` artifacts to a container registry.
- [ ] **Allowed Origins:** Configure `ALLOWED_ORIGINS` in production backend.

## 4. Rollback
To revert to a previous state, pull the preceding container image tag and update your orchestrator (e.g., `docker compose down && docker compose up -d` with previous tag).
