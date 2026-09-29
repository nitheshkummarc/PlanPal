# Database

PostgreSQL on Supabase. The schema is defined in [`database/init.sql`](../database/init.sql);
databases created before 2026-09-29 are upgraded with
[`database/migrations/001_align_existing_schema.sql`](../database/migrations/001_align_existing_schema.sql).
The SQLAlchemy models in `backend/app/models/__init__.py` use the same table, constraint and
index names, and `backend/tests/test_schema.py` fails if the two differ.

## Entity-relationship diagram

![PlanPal entity-relationship diagram](../assets/ER%20diagram.png)

The diagram is generated from [`er-diagram.mmd`](er-diagram.mmd) (Mermaid). After a schema
change, update that file and re-render the image:

```bash
npx -y @mermaid-js/mermaid-cli@11 -i docs/er-diagram.mmd -o "assets/ER diagram.png" -b white -s 3 -w 1800
```

`revoked_tokens` has no relationships: it stores the ids of tokens revoked at logout and
is checked on every authenticated request.

### Relationships

| Relationship | Cardinality | On delete of the parent |
| --- | --- | --- |
| users → events (`posted_by`) | one user organises zero or more events; every event has exactly one organiser | events deleted |
| users → participations | one user has zero or more participations | participations deleted |
| events → participations | one event has zero or more participations | participations deleted |
| users ↔ events via participations | many-to-many, at most one participation per pair | |
| users → notifications | one user receives zero or more notifications | notifications deleted |
| events → notifications | a notification refers to zero or one event | `event_id` set to NULL |
| users ↔ tags via user_tags | many-to-many (interests) | links deleted |
| events ↔ tags via event_tags | many-to-many (categories) | links deleted |

## Constraints

| Table | Constraint | Rule |
| --- | --- | --- |
| users | `users_email_key` | email unique |
| users | `ck_users_email_lowercase` | `email = lower(email)` |
| users | `uq_users_username_lower` (unique index) | username unique ignoring case |
| users | `ck_users_role` | role is `user` or `admin` |
| events | `uq_events_owner_title_timestamp` | one organiser cannot have two events with the same title and time |
| events | `ck_events_price` | paid events have a price > 0; free events have no price |
| events | `ck_events_max_participants_positive` | capacity is NULL or > 0 |
| events | `ck_events_current_participants_non_negative` | cached count ≥ 0 |
| participations | `uq_participations_event_user` | one participation per user per event |
| participations | `ck_participations_status` | status is `interested` or `going` |
| notifications | `ck_notifications_type` | type is one of the seven notification types |
| tags | `uq_tags_name_lower` (unique index) | name unique ignoring case |
| user_tags, event_tags | composite primary key | a link exists once |

## Indexes

Primary keys and unique constraints index their leading columns; the other indexes are:

| Index | Serves |
| --- | --- |
| `idx_events_timestamp` | upcoming-event lists, reminders, date filters |
| `idx_events_posted_by` | "my events" |
| `idx_events_{title,description,place,location,city,state}_trgm` (GIN, `pg_trgm`) | `ILIKE '%term%'` search |
| `idx_users_{name,username,bio}_trgm` (GIN, `pg_trgm`) | people search |
| `idx_participations_user_id` | "joined events" |
| `idx_notifications_user_created` (`user_id, created_at DESC`) | notification list |
| `idx_notifications_user_unread` (partial, `is_read IS false`) | unread badge count |
| `idx_notifications_event_id` | `ON DELETE SET NULL` and reminder checks |
| `idx_user_tags_tag_id`, `idx_event_tags_tag_id` | filtering by tag |
| `idx_revoked_tokens_expires_at` | cleanup of expired rows |

## Triggers and security

- `update_updated_at_column()` sets `updated_at` on every UPDATE of users, tags, events,
  participations and notifications.
- Row Level Security is enabled on every table with no policies, so the Supabase Data API
  (anon and authenticated roles) cannot read or write them. The Flask API connects as the
  table owner and is not affected.

## Normalisation notes

- The schema is in third normal form except for `events.current_participants`, a deliberate
  cached count. It is recalculated from `participations` inside the same transaction, under a
  row lock, whenever someone joins or leaves.
- `events.location` (street address) is separate from `city` and `state`, which are kept as
  columns because they are filtered and searched on.

The SQL executed by each event route is listed in [EVENT_ROUTES_ORM_SQL_REFERENCE.md](EVENT_ROUTES_ORM_SQL_REFERENCE.md).
