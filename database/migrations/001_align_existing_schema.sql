-- 001_align_existing_schema.sql
--
-- Brings a database created before 2026-09-29 (by an older init.sql or by
-- db.create_all()) to the schema in database/init.sql. New databases created from
-- init.sql do not need it. Every step is safe to re-run.
--
-- Data changes it makes:
--   * email addresses are lower-cased
--   * users.preferences (tag names) are converted to user_tags rows, then the column is dropped
--   * events.source_type and events.is_active are dropped (the event timestamp decides
--     whether an event is upcoming)
--   * free events lose any stored price; paid events without a positive price become free
--   * current_participants is recounted from participations
--   * notifications of types the application no longer creates (e.g. test notifications) are deleted
--
-- Before running, check that no two accounts differ only by letter case, otherwise the
-- unique indexes below cannot be created:
--   SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
--   SELECT lower(username), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
--   SELECT lower(name), count(*) FROM tags GROUP BY 1 HAVING count(*) > 1;
--
-- Run it in the Supabase SQL editor (or psql) as the owner of the tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(36) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ---------------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
UPDATE users SET email = lower(email) WHERE email <> lower(email);
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

-- Interests move from the preferences JSON array (tag names) to user_tags
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'preferences') THEN
        EXECUTE $sql$
            INSERT INTO user_tags (user_id, tag_id)
            SELECT u.user_id, t.tag_id
            FROM users u
            CROSS JOIN LATERAL jsonb_array_elements_text(u.preferences::jsonb) AS p(name)
            JOIN tags t ON lower(t.name) = lower(p.name)
            WHERE jsonb_typeof(u.preferences::jsonb) = 'array'
            ON CONFLICT DO NOTHING
        $sql$;
        ALTER TABLE users DROP COLUMN preferences;
    END IF;
END $$;

-- ---------------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------------
ALTER TABLE events DROP COLUMN IF EXISTS source_type;
ALTER TABLE events DROP COLUMN IF EXISTS is_active;
UPDATE events SET is_paid = FALSE WHERE is_paid IS NULL;
UPDATE events SET price = NULL WHERE NOT is_paid AND price IS NOT NULL;
UPDATE events SET is_paid = FALSE WHERE is_paid AND (price IS NULL OR price <= 0);
UPDATE events SET max_participants = NULL WHERE max_participants <= 0;
UPDATE events e SET current_participants = (
    SELECT count(*) FROM participations p WHERE p.event_id = e.event_id
);

-- ---------------------------------------------------------------------------------
-- participations, notifications
-- ---------------------------------------------------------------------------------
UPDATE participations SET joined_at = COALESCE(joined_at, created_at, NOW()) WHERE joined_at IS NULL;
UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;
DELETE FROM notifications WHERE type NOT IN (
    'welcome', 'event_joined', 'event_reminder', 'event_update',
    'new_participant', 'participant_left', 'event_cancelled'
);

-- ---------------------------------------------------------------------------------
-- NOT NULL columns and defaults
-- ---------------------------------------------------------------------------------
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE tags SET created_at = NOW() WHERE created_at IS NULL;
UPDATE tags SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE events SET created_at = NOW() WHERE created_at IS NULL;
UPDATE events SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE participations SET created_at = NOW() WHERE created_at IS NULL;
UPDATE participations SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE notifications SET created_at = NOW() WHERE created_at IS NULL;
UPDATE notifications SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE user_tags SET created_at = NOW() WHERE created_at IS NULL;
UPDATE event_tags SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE users
    ALTER COLUMN user_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN role SET DEFAULT 'user', ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN is_active SET DEFAULT TRUE, ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tags
    ALTER COLUMN tag_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE events
    ALTER COLUMN event_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN is_paid SET DEFAULT FALSE, ALTER COLUMN is_paid SET NOT NULL,
    ALTER COLUMN current_participants SET DEFAULT 0, ALTER COLUMN current_participants SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE participations
    ALTER COLUMN participation_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN status SET DEFAULT 'interested',
    ALTER COLUMN joined_at SET DEFAULT NOW(), ALTER COLUMN joined_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notifications
    ALTER COLUMN notification_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN is_read SET DEFAULT FALSE, ALTER COLUMN is_read SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE user_tags
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE event_tags
    ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL;

-- ---------------------------------------------------------------------------------
-- Constraints (old names from both init.sql and db.create_all() are removed)
-- ---------------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role;
ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('user', 'admin'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_email_lowercase;
ALTER TABLE users ADD CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;

ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_event_constraint;
ALTER TABLE events DROP CONSTRAINT IF EXISTS uq_events_owner_title_timestamp;
ALTER TABLE events ADD CONSTRAINT uq_events_owner_title_timestamp UNIQUE (posted_by, title, timestamp);
ALTER TABLE events DROP CONSTRAINT IF EXISTS ck_events_price;
ALTER TABLE events ADD CONSTRAINT ck_events_price
    CHECK ((is_paid AND price > 0) OR (NOT is_paid AND price IS NULL));
ALTER TABLE events DROP CONSTRAINT IF EXISTS ck_events_max_participants_positive;
ALTER TABLE events ADD CONSTRAINT ck_events_max_participants_positive
    CHECK (max_participants IS NULL OR max_participants > 0);
ALTER TABLE events DROP CONSTRAINT IF EXISTS ck_events_current_participants_non_negative;
ALTER TABLE events ADD CONSTRAINT ck_events_current_participants_non_negative
    CHECK (current_participants >= 0);

ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_event_id_user_id_key;
ALTER TABLE participations DROP CONSTRAINT IF EXISTS unique_event_user_participation;
ALTER TABLE participations DROP CONSTRAINT IF EXISTS uq_participations_event_user;
ALTER TABLE participations ADD CONSTRAINT uq_participations_event_user UNIQUE (event_id, user_id);
ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_status_check;
ALTER TABLE participations DROP CONSTRAINT IF EXISTS ck_participations_status;
ALTER TABLE participations ADD CONSTRAINT ck_participations_status CHECK (status IN ('interested', 'going'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ck_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (type IN (
    'welcome', 'event_joined', 'event_reminder', 'event_update',
    'new_participant', 'participant_left', 'event_cancelled'
));

-- Foreign keys with their ON DELETE rules
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

-- ---------------------------------------------------------------------------------
-- Indexes: drop redundant or unused ones, create the current set
-- ---------------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_preferences_gin;
DROP INDEX IF EXISTS idx_user_email;
DROP INDEX IF EXISTS idx_user_username;
DROP INDEX IF EXISTS idx_user_active;
DROP INDEX IF EXISTS idx_user_role;
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_tags_created_at;
DROP INDEX IF EXISTS idx_events_city;
DROP INDEX IF EXISTS idx_events_state;
DROP INDEX IF EXISTS idx_events_is_active;
DROP INDEX IF EXISTS idx_events_is_paid;
DROP INDEX IF EXISTS idx_events_city_state;
DROP INDEX IF EXISTS idx_event_city_state;
DROP INDEX IF EXISTS idx_event_timestamp;
DROP INDEX IF EXISTS idx_event_active;
DROP INDEX IF EXISTS idx_event_posted_by;
DROP INDEX IF EXISTS idx_event_is_paid;
DROP INDEX IF EXISTS ix_events_city;
DROP INDEX IF EXISTS ix_events_state;
DROP INDEX IF EXISTS ix_events_is_active;
DROP INDEX IF EXISTS idx_participations_event_id;
DROP INDEX IF EXISTS idx_participations_status;
DROP INDEX IF EXISTS idx_participations_joined_at;
DROP INDEX IF EXISTS idx_participation_status;
DROP INDEX IF EXISTS idx_participation_joined_at;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notification_user_id;
DROP INDEX IF EXISTS idx_notification_is_read;
DROP INDEX IF EXISTS idx_notification_type;
DROP INDEX IF EXISTS idx_notification_created_at;
DROP INDEX IF EXISTS idx_user_tags_user_id;
DROP INDEX IF EXISTS idx_user_tags_created_at;
DROP INDEX IF EXISTS idx_event_tags_event_id;
DROP INDEX IF EXISTS idx_event_tags_created_at;
DROP INDEX IF EXISTS ix_revoked_tokens_expires_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_bio_trgm ON users USING gin (bio gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_name_lower ON tags (lower(name));
CREATE INDEX IF NOT EXISTS idx_events_posted_by ON events (posted_by);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_description_trgm ON events USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_place_trgm ON events USING gin (place gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_location_trgm ON events USING gin (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_city_trgm ON events USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_state_trgm ON events USING gin (state gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_participations_user_id ON participations (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read IS false;
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications (event_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);

-- ---------------------------------------------------------------------------------
-- updated_at triggers (databases created by db.create_all() had none)
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_participations_updated_at ON participations;
CREATE TRIGGER update_participations_updated_at BEFORE UPDATE ON participations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------------
-- Row Level Security: block the Supabase Data API; the API connects as table owner
-- ---------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;
