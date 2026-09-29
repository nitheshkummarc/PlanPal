# API Reference

Base URL: the backend origin (e.g. `https://planpal-backend-wcsc.onrender.com`).

- Request and response bodies are JSON.
- Success: `{"success": true, ...}`. Error: `{"success": false, "error": "<message>"}`.
- Authenticated endpoints need `Authorization: Bearer <access_token>`. An expired, revoked or
  malformed token returns 401; the frontend then calls `/api/auth/refresh` once and retries.
- Timestamps are ISO 8601 in UTC (`2026-10-01T10:30:00Z`). Filters accept full timestamps, or a
  date (`2026-10-01`) meaning that UTC day.
- Status codes: 200/201 success, 400 invalid input, 401 authentication, 403 not allowed,
  404 not found, 405 wrong method, 409 conflict (duplicate, already joined, event full),
  429 rate limited, 500 unexpected error.

The frontend client for each area is in `frontend/src/api/`.

---

## Auth — `/api/auth` (`authApi.ts`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | — | Create an account. Body: `name`, `email`, `username`, `password`; optional `bio`, `profile_image_url`, `interest_tag_ids`. Returns `access_token`, `refresh_token`, `user`. 409 if the email or username is taken. Rate limit 5/min. |
| POST | `/login` | — | Body: `email`, `password`. Returns tokens and `user`. 401 for wrong credentials or a deactivated account. Rate limit 5/min. |
| POST | `/logout` | access | Revokes the access token; also revokes `refresh_token` if sent in the body. |
| POST | `/refresh` | refresh | Returns a new `access_token`. Rate limit 30/min. |
| GET | `/profile` | access | The caller's `user` (with email and interests). |
| PUT | `/profile` | access | Update any of `name`, `username`, `bio`, `profile_image_url`, `interest_tag_ids`. |
| POST | `/change-password` | access | Body: `current_password`, `new_password`. Ends every other session and returns new tokens for this one. Rate limit 10/min. |

Password rules: 8–128 characters with upper and lower case, a digit and a special character,
not containing `password`, `12345`, `qwerty` or `admin`. Usernames: 3–20 letters, digits or
underscores, unique ignoring case.

## Users — `/api/users` (`usersApi.ts`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/<user_id>` | A user's profile. `email` is included only for your own profile. |

## Events — `/api/events` (`eventsApi.ts`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Upcoming events. Query: `q`, `tag_ids` (comma-separated), `location`, `date_from`, `date_to`, `sort_by` (`date` or `created_at`), `page`, `per_page` (max 100). Returns `events`, `pagination`. |
| POST | `/` | Create. Body: `title`, `timestamp` (future), `place`, `location`, `city`, `state`, `is_paid`; optional `description`, `price` (required > 0 when paid), `max_participants`, `tag_ids`. The organiser joins as `going`. 409 for the same title at the same time. |
| GET | `/<event_id>` | Event with `participants` (organiser first) and `viewer` `{status, is_creator}`. Past events included. |
| PUT | `/<event_id>` | Organiser only, upcoming events only. Any create field; `null` clears `max_participants` or `description`. Participants are notified if something changed. |
| DELETE | `/<event_id>` | Organiser or admin. Participants of an upcoming event are notified. |
| POST | `/<event_id>/join` | Join as `interested`. 409 if already joined or full; 400 for a past event. |
| DELETE | `/<event_id>/leave` | Leave. Not allowed for the organiser or for past events. |
| PUT | `/<event_id>/update-status` | Body: `status` (`interested` or `going`). Not for the organiser or past events. |
| GET | `/my` | Events the caller organises. Query: `upcoming=true`, `date_from`, `date_to`, `page`, `per_page`. |
| GET | `/joined` | Events the caller joined, excluding their own. Same query parameters. |

Event fields: `event_id`, `posted_by`, `creator_name`, `title`, `description`, `timestamp`,
`place`, `location`, `city`, `state`, `is_paid`, `price`, `max_participants`,
`current_participants`, `tags`, `created_at`, `updated_at`.

## Search — `/api/search` (`searchApi.ts`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Query: `q`, `type` (`all`, `events`, `users`), `tag_ids`, `location`, `date_from`, `date_to`, `sort_by` (`date`: upcoming first; `created_at`: newest first), `limit` (max 100). Returns `results.events` (past and upcoming) and `results.users`. People are searched only when `q` or `tag_ids` is given, and match by interests for tags. |

## Notifications — `/api/notifications` (`notificationsApi.ts`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Newest first. Query: `filter` (`all`, `unread`, `read`), `page`, `per_page`. Returns `notifications`, `pagination`, `unread_count`. |
| GET | `/unread_count` | `unread_count` for the navbar badge. |
| PUT | `/<id>/mark-read` | Mark one as read. 403 if it belongs to someone else. |
| PUT | `/<id>/mark-unread` | Mark one as unread. |
| PUT | `/mark-all-read` | Mark all of the caller's notifications as read. |
| DELETE | `/<id>` | Delete one. |
| DELETE | `/` | Delete all of the caller's notifications. |

Types: `welcome`, `event_joined`, `event_reminder`, `event_update`, `new_participant`,
`participant_left`, `event_cancelled`. Notifications are created only by the application.

## Tags — `/api/tags` (`tagsApi.ts`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | All tags, alphabetical. |
| POST | `/` | Admin. Body: `name`; optional `description`, `color` (`#RRGGBB`). 409 if the name exists (ignoring case). |
| PUT | `/<tag_id>` | Admin. Any of the create fields. |
| DELETE | `/<tag_id>` | Admin. Removes the tag from every event and user's interests. |

## System — `/api/system`

Used by the hosting platform, not by the frontend. No authentication, and reachable over plain HTTP.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | 200 while the process is running. |
| GET | `/ready` | 200 when the database answers, 503 otherwise (Render health check). |
