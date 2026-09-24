-- 001_align_existing_schema.sql
--
-- OPTIONAL one-time migration for a database that was created BEFORE 2026-09-25
-- (by an older init.sql or by db.create_all()). New databases don't need it:
-- init.sql and the SQLAlchemy models already contain all of this.
--
-- What it does (all steps are safe to re-run):
--   1. Creates revoked_tokens (logout token denylist)   - db.create_all() also does this
--   2. Event uniqueness: (title, timestamp, posted_by) instead of (title, posted_by),
--      so an organiser can reuse a title at a different time
--   3. ON DELETE rules on foreign keys, matching init.sql
--
-- Review it, then run it in the Supabase SQL editor (or psql) once.

BEGIN;

-- 1. Logout denylist
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(36) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_revoked_tokens_expires_at ON revoked_tokens(expires_at);

-- 2. Event uniqueness includes the timestamp
ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_event_constraint;
ALTER TABLE events ADD CONSTRAINT unique_event_constraint UNIQUE (title, timestamp, posted_by);

-- 3. Foreign keys with ON DELETE rules (default constraint names used by Postgres)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_posted_by_fkey;
ALTER TABLE events ADD CONSTRAINT events_posted_by_fkey
    FOREIGN KEY (posted_by) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_event_id_fkey;
ALTER TABLE participations ADD CONSTRAINT participations_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;
ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_user_id_fkey;
ALTER TABLE participations ADD CONSTRAINT participations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL;

ALTER TABLE user_tags DROP CONSTRAINT IF EXISTS user_tags_user_id_fkey;
ALTER TABLE user_tags ADD CONSTRAINT user_tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE user_tags DROP CONSTRAINT IF EXISTS user_tags_tag_id_fkey;
ALTER TABLE user_tags ADD CONSTRAINT user_tags_tag_id_fkey
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE;

ALTER TABLE event_tags DROP CONSTRAINT IF EXISTS event_tags_event_id_fkey;
ALTER TABLE event_tags ADD CONSTRAINT event_tags_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;
ALTER TABLE event_tags DROP CONSTRAINT IF EXISTS event_tags_tag_id_fkey;
ALTER TABLE event_tags ADD CONSTRAINT event_tags_tag_id_fkey
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE;

COMMIT;
