# Changelog

## [Unreleased] - fix/production-readiness

### Added
- Production config validation (Commit 3)
- Event request validation — future timestamps, price >= 0 (Commit 6)
- Rate limiting on auth endpoints (Commit 7)
- Health (`/health`) and readiness (`/ready`) probes (Commit 8)
- Structured logging with request ID (Commit 8)
- Docker + docker-compose + nginx (Commit 9)
- GitHub Actions CI (Commit 11)

### Changed
- User search returns public fields only, no email (Commit 4)
- `update_participant_count()` uses flush instead of commit (Commit 5)
- User search queries by username instead of email (Commit 4)

### Fixed
- Frontend build failure — missing mockAdapter.ts (Commit 2)
- BYPASS_AUTH hardcoded to true → env-gated, defaults false (Commit 2)
- IDOR in notification creation — user_id from JWT (Commit 4)
- Premature commit inside update_participant_count (Commit 5)

### Security
- Production config refuses to boot without required env vars (Commit 3)
- PII removed from user search results (Commit 4)
- Rate limiting: 5/min on login/register, 10/min on password change (Commit 7)

### Documentation
- Deployment guide, dependency audit, static analysis report (Commits 10, 12)
- OpenAPI spec placeholder (deferred to Phase 6) (Commit 12)
- Test summary (Commit 12)
