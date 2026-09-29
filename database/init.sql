-- PlanPal database schema (PostgreSQL 13+ / Supabase).
--
-- This file is the authoritative schema for new databases. The SQLAlchemy models in
-- backend/app/models/__init__.py mirror it, including constraint and index names;
-- backend/tests/test_schema.py fails if the two drift apart.
-- Existing databases are brought up to date with the scripts in database/migrations/.

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- trigram indexes for ILIKE '%term%' search

-- Users. Emails are stored in lower case; usernames are unique ignoring case.
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INTEGER NOT NULL DEFAULT 0,  -- incremented to invalidate issued tokens
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT ck_users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT ck_users_role CHECK (role IN ('user', 'admin'))
);

CREATE TABLE IF NOT EXISTS tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(7),  -- '#RRGGBB'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Events. The organiser is also stored as a participant with status 'going'.
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    place VARCHAR(200) NOT NULL,
    location VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(10, 2),
    posted_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    max_participants INTEGER,
    current_participants INTEGER NOT NULL DEFAULT 0,  -- cached COUNT of participations
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_events_owner_title_timestamp UNIQUE (posted_by, title, timestamp),
    CONSTRAINT ck_events_price CHECK ((is_paid AND price > 0) OR (NOT is_paid AND price IS NULL)),
    CONSTRAINT ck_events_max_participants_positive CHECK (max_participants IS NULL OR max_participants > 0),
    CONSTRAINT ck_events_current_participants_non_negative CHECK (current_participants >= 0)
);

CREATE TABLE IF NOT EXISTS participations (
    participation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'interested',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_participations_event_user UNIQUE (event_id, user_id),
    CONSTRAINT ck_participations_status CHECK (status IN ('interested', 'going'))
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    -- Kept when the event is deleted, so the user still sees the cancellation
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_notifications_type CHECK (type IN (
        'welcome', 'event_joined', 'event_reminder', 'event_update',
        'new_participant', 'participant_left', 'event_cancelled'
    ))
);

-- User interests
CREATE TABLE IF NOT EXISTS user_tags (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tag_id)
);

-- Event categories
CREATE TABLE IF NOT EXISTS event_tags (
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, tag_id)
);

-- JWT ids revoked at logout; rows can be deleted once expires_at has passed
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(36) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes. Primary keys and UNIQUE constraints already index their leading columns,
-- so only additional access paths are listed here.
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

-- Keep updated_at current on every UPDATE (the models also set it)
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

-- Row Level Security. All access goes through the Flask API, which connects as the
-- table owner and therefore bypasses RLS. Enabling RLS without policies blocks the
-- Supabase Data API (anon/authenticated roles) from reading or writing any table.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;

-- Default tags (same list as backend/app/seed.py)
INSERT INTO tags (name, description, color) VALUES
('Adventure', 'Outdoor activities and adventure sports', '#FF6B35'),
('Music', 'Concerts, festivals, and musical events', '#F7931E'),
('Technology', 'Tech meetups, workshops, and conferences', '#00B4D8'),
('Art', 'Art exhibitions, galleries, and creative workshops', '#9B59B6'),
('Sports', 'Sports events, matches, and fitness activities', '#27AE60'),
('Food', 'Food festivals, cooking classes, and dining events', '#E74C3C'),
('Culture', 'Cultural events, heritage walks, and traditions', '#8E44AD'),
('Education', 'Learning workshops, seminars, and courses', '#3498DB'),
('Nature', 'Nature walks, bird watching, and eco-tourism', '#2ECC71'),
('Photography', 'Photography walks, exhibitions, and workshops', '#34495E'),
('Travel', 'Travel meetups, destination planning, and trips', '#E67E22'),
('Fitness', 'Yoga, gym sessions, and fitness challenges', '#1ABC9C')
ON CONFLICT DO NOTHING;
