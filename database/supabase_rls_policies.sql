-- Row Level Security (RLS) Policies for PlanPal+ Supabase
-- Run this AFTER creating the tables in Supabase SQL editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id OR user_id = get_current_user_id());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id OR user_id = get_current_user_id());

CREATE POLICY "Anyone can view public user profiles" ON users
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Events table policies
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (posted_by = get_current_user_id());

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (posted_by = get_current_user_id());

-- Participations table policies
CREATE POLICY "Users can view participations for events they can see" ON participations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.event_id = participations.event_id 
      AND events.is_active = true
    )
  );

CREATE POLICY "Users can manage their own participations" ON participations
  FOR ALL USING (user_id = get_current_user_id());

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = get_current_user_id());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- Allow system to create notifications


-- Tags table policies (public read, admin write)
CREATE POLICY "Anyone can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = get_current_user_id() 
      AND users.role = 'admin'
    )
  );

-- User Tags table policies
CREATE POLICY "Users can view user-tag relationships" ON user_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own tags" ON user_tags
  FOR ALL USING (user_id = get_current_user_id());

-- Event Tags table policies
CREATE POLICY "Anyone can view event tags" ON event_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.event_id = event_tags.event_id 
      AND events.is_active = true
    )
  );

CREATE POLICY "Event owners can manage event tags" ON event_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.event_id = event_tags.event_id 
      AND events.posted_by = get_current_user_id()
    )
  );

-- Service role policies (for backend operations)
-- These policies allow the service role to bypass RLS for admin operations

CREATE POLICY "Service role full access users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access events" ON events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access participations" ON participations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access tags" ON tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access user_tags" ON user_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access event_tags" ON event_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;