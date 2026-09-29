# Event Routes: ORM to SQL Reference

What each event and participation endpoint does in the database. The SQL below is what
SQLAlchemy generates for PostgreSQL (compiled from the code in `backend/app/routes/events.py`
and `backend/app/services/event_queries.py`), with long column lists shortened to `events.*`
and bind parameters written as `:name`.

Every request also runs one query while checking the JWT; see [Authentication](#authentication).

---

## Tables involved

| Table | Key columns | Notes |
| --- | --- | --- |
| `events` | `event_id` PK, `posted_by` FK → users | `current_participants` caches the participation count |
| `participations` | `participation_id` PK, `UNIQUE (event_id, user_id)` | status `interested` or `going` |
| `event_tags` | PK `(event_id, tag_id)` | many-to-many events ↔ tags |
| `notifications` | `event_id` FK `ON DELETE SET NULL` | created in the same transaction as the change |

Indexes used by these queries: `idx_events_timestamp`, `idx_events_posted_by`,
`idx_participations_user_id`, `idx_event_tags_tag_id`, the trigram indexes
`idx_events_*_trgm` (for `ILIKE '%term%'`), and the primary keys.

---

## Authentication

Runs on every request with a token. One round trip checks that the user exists, is active,
that the token was not revoked at logout, and that it was issued after the last password change
(`token_version`).

```sql
SELECT users.is_active, users.token_version,
       EXISTS (SELECT * FROM revoked_tokens WHERE revoked_tokens.jti = :jti) AS revoked
FROM users
WHERE users.user_id = :user_id;
```

---

## GET /api/events/ — upcoming events

```python
query = base_event_query().filter(Event.timestamp > now)          # joinedload(creator), selectinload(tags)
query = apply_event_filters(query, text=q, tag_ids=tag_ids, location=location,
                            date_from=date_from, date_to=date_to)
query = apply_event_sort(query, sort_by)                           # 'date' or 'created_at'
events, pagination = paginate(query, page, per_page)
```

With every filter set:

```sql
-- total for pagination
SELECT count(*) FROM events
WHERE events.timestamp > :now
  AND (events.title ILIKE :q ESCAPE '\' OR events.description ILIKE :q ESCAPE '\'
       OR events.place ILIKE :q ESCAPE '\' OR events.location ILIKE :q ESCAPE '\'
       OR events.city ILIKE :q ESCAPE '\' OR events.state ILIKE :q ESCAPE '\')
  AND events.event_id IN (SELECT event_tags.event_id FROM event_tags
                          WHERE event_tags.tag_id IN (:tag_ids))
  AND (events.place ILIKE :loc ESCAPE '\' OR events.location ILIKE :loc ESCAPE '\'
       OR events.city ILIKE :loc ESCAPE '\' OR events.state ILIKE :loc ESCAPE '\')
  AND events.timestamp >= :date_from AND events.timestamp <= :date_to;

-- the page, with the organiser joined in
SELECT events.*, users_1.*
FROM events LEFT OUTER JOIN users AS users_1 ON users_1.user_id = events.posted_by
WHERE <same conditions>
ORDER BY events.timestamp, events.event_id
LIMIT :per_page OFFSET :offset;

-- tags for all events on the page in one query (selectinload)
SELECT event_tags.event_id, tags.*
FROM tags JOIN event_tags ON tags.tag_id = event_tags.tag_id
WHERE event_tags.event_id IN (:event_ids)
ORDER BY tags.name;
```

- `:q` and `:loc` are `'%' || term || '%'` with `%`, `_` and `\` escaped, so a search for
  `50%` matches the literal text.
- The tag filter is a subquery rather than a join, so an event with several matching tags
  is returned once.
- `event_id` is the final sort key so pages do not overlap when timestamps are equal.

---

## POST /api/events/ — create

Validation happens before any SQL. Then:

```sql
SELECT events.* FROM events                              -- friendly 409 for duplicates
WHERE events.posted_by = :user_id AND events.title = :title AND events.timestamp = :ts
LIMIT 1;

SELECT tags.* FROM tags WHERE tags.tag_id IN (:tag_ids);   -- every tag must exist

BEGIN;
INSERT INTO events (event_id, title, ..., current_participants) VALUES (..., 1);
INSERT INTO event_tags (event_id, tag_id, created_at) VALUES (:event_id, :tag_id, now()), ...;
INSERT INTO participations (participation_id, event_id, user_id, status, ...)
VALUES (:id, :event_id, :user_id, 'going', ...);          -- the organiser
COMMIT;
```

If two identical requests race past the pre-check, `uq_events_owner_title_timestamp`
rejects the second insert and the route returns 409.

---

## GET /api/events/{id} — detail

```sql
SELECT events.* FROM events WHERE events.event_id = :id;

SELECT participations.*, users.*
FROM participations JOIN users ON users.user_id = participations.user_id
WHERE participations.event_id = :id
ORDER BY participations.joined_at;
```

The response adds `participants` (organiser first) and `viewer` (the caller's status and
whether they organise the event), so the page needs a single request.

---

## POST /api/events/{id}/join

```sql
BEGIN;
SELECT events.* FROM events WHERE events.event_id = :id FOR UPDATE;   -- serialises joins
SELECT participations.* FROM participations
WHERE participations.event_id = :id AND participations.user_id = :user_id LIMIT 1;
-- checks: not already joined, event in the future, current_participants < max_participants
INSERT INTO participations (..., status) VALUES (..., 'interested');
SELECT count(participations.participation_id) FROM participations
WHERE participations.event_id = :id;
UPDATE events SET current_participants = :count, updated_at = now() WHERE event_id = :id;
INSERT INTO notifications (...) VALUES (...);   -- to the organiser: new_participant
INSERT INTO notifications (...) VALUES (...);   -- to the participant: event_joined
COMMIT;
```

The row lock makes concurrent joins run one after another, so the capacity check always sees
the latest count. If any statement fails (including a notification insert) the whole
transaction rolls back. A duplicate join that slips past the check violates
`uq_participations_event_user` and returns 409.

---

## DELETE /api/events/{id}/leave

```sql
BEGIN;
SELECT events.* FROM events WHERE events.event_id = :id FOR UPDATE;
SELECT participations.* FROM participations
WHERE participations.event_id = :id AND participations.user_id = :user_id LIMIT 1;
-- checks: joined, not the organiser, event in the future
DELETE FROM participations WHERE participations.participation_id = :participation_id;
SELECT count(participations.participation_id) FROM participations WHERE participations.event_id = :id;
UPDATE events SET current_participants = :count, updated_at = now() WHERE event_id = :id;
INSERT INTO notifications (...) VALUES (...);   -- to the organiser: participant_left
COMMIT;
```

Leave takes the same row lock as join. Without it, a leave that counts while a join is still
uncommitted would write back a stale count.

---

## PUT /api/events/{id}/update-status

```sql
SELECT events.* FROM events WHERE events.event_id = :id;
SELECT participations.* FROM participations
WHERE participations.event_id = :id AND participations.user_id = :user_id LIMIT 1;
UPDATE participations SET status = :status, updated_at = now()
WHERE participations.participation_id = :participation_id;
```

Both statuses count as participants, so the cached count does not change.

---

## PUT /api/events/{id} — update (organiser only)

```sql
BEGIN;
SELECT events.* FROM events WHERE events.event_id = :id FOR UPDATE;
-- checks: caller is the organiser, event in the future, fields valid,
--         max_participants not below current_participants
SELECT tags.* FROM tags WHERE tags.tag_id IN (:tag_ids);            -- when tag_ids is sent
UPDATE events SET title = :title, ..., updated_at = now() WHERE events.event_id = :id;
DELETE FROM event_tags WHERE event_id = :id AND tag_id = :removed;  -- only changed links
INSERT INTO event_tags (event_id, tag_id) VALUES (:id, :added);
SELECT participations.* FROM participations WHERE :id = participations.event_id;
INSERT INTO notifications (...) VALUES (...), ...;                  -- event_update, not to the organiser
COMMIT;
```

If nothing actually changed, no `UPDATE` is issued and nobody is notified.

---

## DELETE /api/events/{id} — delete (organiser or admin)

```sql
BEGIN;
SELECT events.* FROM events WHERE events.event_id = :id;
SELECT users.* FROM users WHERE users.user_id = :user_id;           -- role check
SELECT participations.* FROM participations WHERE :id = participations.event_id;
INSERT INTO notifications (...) VALUES (...), ...;                  -- event_cancelled (upcoming events only)
DELETE FROM events WHERE events.event_id = :id;
COMMIT;
```

The foreign keys finish the job: `participations` and `event_tags` rows are removed by
`ON DELETE CASCADE`, and the cancellation notices keep existing with `event_id` set to NULL
by `ON DELETE SET NULL`.

---

## GET /api/events/my and GET /api/events/joined

```sql
-- /my: events the caller organises
SELECT events.*, users_1.* FROM events
LEFT OUTER JOIN users AS users_1 ON users_1.user_id = events.posted_by
WHERE events.posted_by = :user_id
ORDER BY events.timestamp DESC, events.event_id
LIMIT :per_page OFFSET :offset;

-- /joined: events the caller joined, excluding their own
SELECT events.*, users_1.* FROM events
JOIN participations ON participations.event_id = events.event_id
LEFT OUTER JOIN users AS users_1 ON users_1.user_id = events.posted_by
WHERE participations.user_id = :user_id AND events.posted_by != :user_id
ORDER BY events.timestamp DESC, events.event_id
LIMIT :per_page OFFSET :offset;
```

With `upcoming=true` both add `events.timestamp > now()` and sort soonest first;
`date_from`/`date_to` add the same range conditions as the upcoming list. The Dashboard,
Calendar and Upcoming pages read every page of both lists.

---

## GET /api/search/ — events part

Same filters as the upcoming list, but past events are included and upcoming ones come first:

```sql
SELECT events.*, users_1.* FROM events
LEFT OUTER JOIN users AS users_1 ON users_1.user_id = events.posted_by
WHERE <filters>
ORDER BY CASE WHEN events.timestamp < :now THEN 1 ELSE 0 END, events.timestamp, events.event_id
LIMIT :limit;
```

People are searched only when a text query or tags are given:

```sql
SELECT users.* FROM users
WHERE users.is_active IS true
  AND (users.name ILIKE :q ESCAPE '\' OR users.username ILIKE :q ESCAPE '\' OR users.bio ILIKE :q ESCAPE '\')
  AND users.user_id IN (SELECT user_tags.user_id FROM user_tags WHERE user_tags.tag_id IN (:tag_ids))
ORDER BY users.name, users.user_id
LIMIT :limit;
```

---

## Background reminders

Every five minutes, under `pg_try_advisory_xact_lock(810002)` so only one worker does it:

```sql
SELECT events.* FROM events
WHERE events.timestamp > :now AND events.timestamp <= :now + interval '24 hours';

-- for each event: participants without a reminder for the current schedule
SELECT participations.user_id FROM participations
WHERE participations.event_id = :event_id
  AND participations.user_id NOT IN (
      SELECT notifications.user_id FROM notifications
      WHERE notifications.event_id = :event_id
        AND notifications.type = 'event_reminder'
        AND notifications.created_at >= :event_time - interval '24 hours');

INSERT INTO notifications (...) VALUES (...), ...;
```

A reminder created before the current 24-hour window belongs to an earlier time of the event,
so moving an event later produces a new reminder, while repeated ticks never duplicate one.
