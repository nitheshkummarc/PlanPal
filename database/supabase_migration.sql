-- Supabase Migration Script for PlanPal+
-- Run this in the Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (modified for Supabase Auth integration)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT, -- Keep for custom auth, can be null if using Supabase Auth
    bio TEXT,
    profile_image_url VARCHAR(500),
    preferences JSONB DEFAULT '[]',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_event_constraint UNIQUE (title, timestamp, posted_by)
);

-- Participations table
CREATE TABLE IF NOT EXISTS participations (
    participation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'going')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- For UI hex color codes like #FF5733
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Tags junction table
CREATE TABLE IF NOT EXISTS user_tags (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, tag_id)
);

-- Event Tags junction table
CREATE TABLE IF NOT EXISTS event_tags (
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (event_id, tag_id)
);

-- Indexes for better performance (same as original but with better naming)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

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
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING GIN (preferences);

-- Updated function to handle TIMESTAMP WITH TIME ZONE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
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

-- Row Level Security (RLS) Policies will be added in next step
-- Note: RLS is enabled by default on Supabase but policies need to be created