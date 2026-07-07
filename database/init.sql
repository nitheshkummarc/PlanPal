-- PostgreSQL Database Setup Script for PlanPal+

-- Create database (run this as postgres superuser)
-- CREATE DATABASE planpal_db;
-- CREATE DATABASE planpal_dev;
-- CREATE DATABASE planpal_test;

-- Create user and grant permissions
-- CREATE USER planpal WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE planpal_db TO planpal;
-- GRANT ALL PRIVILEGES ON DATABASE planpal_dev TO planpal;
-- GRANT ALL PRIVILEGES ON DATABASE planpal_test TO planpal;

-- Connect to planpal_dev database
\c planpal_dev;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(500),
    preferences JSONB DEFAULT '[]',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP NOT NULL,
    place VARCHAR(200) NOT NULL,
    location VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('text')),
    posted_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Participations table
CREATE TABLE IF NOT EXISTS participations (
    participation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'going')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- Notifications table  
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- For UI hex color codes like #FF5733
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Tags junction table
CREATE TABLE IF NOT EXISTS user_tags (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tag_id)
);

-- Event Tags junction table
CREATE TABLE IF NOT EXISTS event_tags (
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, tag_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_events_posted_by ON events(posted_by);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_state ON events(state);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_is_paid ON events(is_paid);
CREATE INDEX IF NOT EXISTS idx_events_city_state ON events(city, state);

CREATE INDEX IF NOT EXISTS idx_participations_event_id ON participations(event_id);
CREATE INDEX IF NOT EXISTS idx_participations_user_id ON participations(user_id);
CREATE INDEX IF NOT EXISTS idx_participations_status ON participations(status);
CREATE INDEX IF NOT EXISTS idx_participations_joined_at ON participations(joined_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

-- User-Tag relationship indexes
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_created_at ON user_tags(created_at);

-- Event-Tag relationship indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_created_at ON event_tags(created_at);

-- JSONB GIN indexes for efficient JSON querying
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING GIN (preferences jsonb_path_ops);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participations_updated_at 
    BEFORE UPDATE ON participations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at 
    BEFORE UPDATE ON tags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion (optional) - wrapped in transaction for atomicity
BEGIN;

-- Insert users
INSERT INTO users (name, email, username, password_hash, bio, preferences, role) VALUES
('John Doe', 'john@example.com', 'johndoe', '$2b$12$dummy_hash_for_testing', 'Adventure enthusiast and outdoor lover', '["trekking", "concert"]', 'user'),
('Jane Smith', 'jane@example.com', 'janesmith', '$2b$12$dummy_hash_for_testing', 'Creative professional passionate about arts', '["workshop", "cultural"]', 'user'),
('Admin User', 'admin@planpal.com', 'admin', '$2b$12$dummy_hash_for_testing', 'System administrator', '[]', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert event (only if john exists)
INSERT INTO events (posted_by, title, description, timestamp, place, location, city, state, is_paid, price, source_type, max_participants)
SELECT 
    u.user_id,
    'Sample Trek Event',
    'A beautiful trekking experience in the mountains',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    'Mountain Base Camp',
    'Himachal Pradesh',
    'Manali',
    'Himachal Pradesh',
    true,
    500.00,
    'text',
    20
FROM users u WHERE u.email = 'john@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample tags
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
ON CONFLICT (name) DO NOTHING;

-- Insert sample user-tag relationships
INSERT INTO user_tags (user_id, tag_id)
SELECT u.user_id, t.tag_id 
FROM users u, tags t 
WHERE (u.email = 'john@example.com' AND t.name IN ('Adventure', 'Music', 'Nature'))
   OR (u.email = 'jane@example.com' AND t.name IN ('Art', 'Culture', 'Photography'))
ON CONFLICT DO NOTHING;

-- Insert sample event-tag relationships
INSERT INTO event_tags (event_id, tag_id)
SELECT e.event_id, t.tag_id 
FROM events e, tags t 
WHERE e.title = 'Sample Trek Event' AND t.name IN ('Adventure', 'Nature')
ON CONFLICT DO NOTHING;

COMMIT;
-- End of sample data transaction

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO planpal;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO planpal;
