-- =============================================================================
-- Carbon Karma — Complete Supabase PostgreSQL Schema
-- =============================================================================
-- This schema defines the complete database structure for the Carbon Karma
-- platform, including tables, indexes, triggers, RLS policies, and seed data.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE carbon_category AS ENUM (
  'electricity',
  'transport',
  'food',
  'cooking_fuel',
  'waste',
  'shopping',
  'water',
  'other'
);

CREATE TYPE transport_mode AS ENUM (
  'petrol_car',
  'diesel_car',
  'electric_car',
  'cng_auto',
  'two_wheeler',
  'bus',
  'metro',
  'train',
  'domestic_flight',
  'international_flight',
  'bicycle',
  'walking'
);

CREATE TYPE food_type AS ENUM (
  'veg_meal',
  'non_veg_meal',
  'vegan_meal',
  'dairy_product',
  'packaged_food'
);

CREATE TYPE karma_action_type AS ENUM (
  'earned',
  'bonus',
  'streak',
  'community',
  'redeemed'
);

CREATE TYPE log_source AS ENUM (
  'manual',
  'ai_receipt',
  'ai_photo',
  'action_library',
  'baseline_quiz'
);

CREATE TYPE difficulty_level AS ENUM (
  'easy',
  'medium',
  'hard'
);

-- =============================================================================
-- TABLE: profiles
-- =============================================================================
-- Stores user profile data, preferences, karma score, and carbon baseline.
-- Linked to Supabase Auth via auth.uid().

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  
  -- Carbon baseline (from onboarding quiz)
  baseline_monthly_kg_co2 NUMERIC(10,2) DEFAULT 0,
  baseline_completed BOOLEAN NOT NULL DEFAULT FALSE,
  baseline_data JSONB DEFAULT '{}',
  
  -- Karma & gamification
  karma_points INTEGER NOT NULL DEFAULT 0,
  karma_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_kg_co2_saved NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Preferences
  high_contrast_mode BOOLEAN NOT NULL DEFAULT FALSE,
  dyslexia_font BOOLEAN NOT NULL DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"daily_tips": true, "weekly_report": true, "ripple_feed": true}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for city-based aggregation (Local Impact Map)
CREATE INDEX idx_profiles_city ON profiles(city) WHERE city IS NOT NULL;
CREATE INDEX idx_profiles_karma ON profiles(karma_points DESC);

-- =============================================================================
-- TABLE: carbon_logs
-- =============================================================================
-- Individual carbon emission entries logged by users.
-- Each entry represents a single activity with its CO2 impact.

CREATE TABLE carbon_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Categorization
  category carbon_category NOT NULL,
  subcategory TEXT, -- e.g., specific transport mode, food type
  
  -- Carbon data
  kg_co2 NUMERIC(10,4) NOT NULL,
  is_saving BOOLEAN NOT NULL DEFAULT FALSE, -- true = reduced emissions (positive action)
  
  -- Activity details
  description TEXT NOT NULL,
  quantity NUMERIC(10,2), -- e.g., kWh, km, liters
  unit TEXT, -- e.g., 'kWh', 'km', 'liters', 'meals'
  
  -- Source tracking
  source log_source NOT NULL DEFAULT 'manual',
  ai_confidence NUMERIC(3,2), -- 0.00 to 1.00, null if not AI-parsed
  receipt_image_url TEXT, -- Supabase Storage path if uploaded
  raw_ai_response JSONB, -- Full AI response for debugging
  
  -- Metadata
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- when the activity happened
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- when the record was created
  
  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity IS NULL OR quantity >= 0),
  CONSTRAINT valid_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1))
);

CREATE INDEX idx_carbon_logs_user_date ON carbon_logs(user_id, logged_at DESC);
CREATE INDEX idx_carbon_logs_user_category ON carbon_logs(user_id, category);
-- DATE_TRUNC('month', ...) is STABLE not IMMUTABLE — removed from index.
-- Monthly queries use the logged_at index and filter at query time.

-- =============================================================================
-- TABLE: actions
-- =============================================================================
-- Pre-defined eco-actions library. Admin-seeded, read-only for users.
-- Each action has a carbon saving value and karma reward.

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Action details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category carbon_category NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'easy',
  
  -- Impact
  kg_co2_saved NUMERIC(10,4) NOT NULL,
  karma_reward INTEGER NOT NULL DEFAULT 10,
  
  -- Display
  icon_name TEXT NOT NULL DEFAULT 'leaf', -- Lucide icon name
  color TEXT NOT NULL DEFAULT '#22c55e', -- Hex color for UI
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  times_logged INTEGER NOT NULL DEFAULT 0, -- Global counter
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actions_category ON actions(category) WHERE is_active = TRUE;

-- =============================================================================
-- TABLE: karma_transactions
-- =============================================================================
-- Karma point ledger. Every karma change is recorded here.

CREATE TABLE karma_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  points INTEGER NOT NULL, -- positive = earned, negative = spent
  action_type karma_action_type NOT NULL,
  description TEXT NOT NULL,
  
  -- References
  carbon_log_id UUID REFERENCES carbon_logs(id) ON DELETE SET NULL,
  action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_karma_transactions_user ON karma_transactions(user_id, created_at DESC);

-- =============================================================================
-- TABLE: ripple_events
-- =============================================================================
-- Anonymous feed of positive actions across the community.
-- Used for the Karma Ripple Feed with Supabase Realtime.

CREATE TABLE ripple_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Event details (anonymized)
  city TEXT,
  category carbon_category NOT NULL,
  kg_co2_saved NUMERIC(10,4) NOT NULL,
  action_description TEXT NOT NULL, -- "cycling to work", "skipping meat", etc.
  
  -- Display
  emoji TEXT NOT NULL DEFAULT '🌱',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for realtime feed ordering
CREATE INDEX idx_ripple_events_created ON ripple_events(created_at DESC);
-- Index for city-based filtering
CREATE INDEX idx_ripple_events_city ON ripple_events(city) WHERE city IS NOT NULL;

-- =============================================================================
-- TABLE: chat_messages
-- =============================================================================
-- AI Coach conversation history per user.

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at ASC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-increment action times_logged counter
CREATE OR REPLACE FUNCTION increment_action_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source = 'action_library' THEN
    UPDATE actions
    SET times_logged = times_logged + 1
    WHERE id = (
      SELECT action_id FROM karma_transactions
      WHERE carbon_log_id = NEW.id
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_carbon_log_created
  AFTER INSERT ON carbon_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_action_counter();

-- Auto-update karma points on profile when a transaction is created
CREATE OR REPLACE FUNCTION update_profile_karma()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    karma_points = karma_points + NEW.points,
    karma_level = GREATEST(1, FLOOR((karma_points + NEW.points) / 100) + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_karma_transaction_created
  AFTER INSERT ON karma_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_karma();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ripple_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
-- Users can read only their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile is created automatically via trigger, no direct insert needed
-- But allow insert for the trigger function
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---- CARBON LOGS ----
-- Users can only see their own logs
CREATE POLICY "carbon_logs_select_own"
  ON carbon_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own logs
CREATE POLICY "carbon_logs_insert_own"
  ON carbon_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own logs
CREATE POLICY "carbon_logs_update_own"
  ON carbon_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own logs
CREATE POLICY "carbon_logs_delete_own"
  ON carbon_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ---- ACTIONS (read-only for all authenticated users) ----
CREATE POLICY "actions_select_all"
  ON actions FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ---- KARMA TRANSACTIONS ----
-- Users can only read their own transactions
CREATE POLICY "karma_transactions_select_own"
  ON karma_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "karma_transactions_insert_own"
  ON karma_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- RIPPLE EVENTS ----
-- All authenticated users can read ripple events (anonymous feed)
CREATE POLICY "ripple_events_select_all"
  ON ripple_events FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only insert their own ripple events
CREATE POLICY "ripple_events_insert_own"
  ON ripple_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- CHAT MESSAGES ----
-- Users can only see their own messages
CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own messages
CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages (clear history)
CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STORAGE BUCKET POLICIES
-- =============================================================================
-- Run these in the Supabase Dashboard → Storage → Policies

-- Create bucket for receipt uploads
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Policy: Users can upload to their own folder
-- CREATE POLICY "receipts_insert_own"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'receipts'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Policy: Users can read their own uploads
-- CREATE POLICY "receipts_select_own"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'receipts'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- =============================================================================
-- SEED DATA: Pre-defined Eco Actions
-- =============================================================================

INSERT INTO actions (title, description, category, difficulty, kg_co2_saved, karma_reward, icon_name, color) VALUES
  -- Transport actions
  ('Cycle to Work', 'Chose bicycle over car for your daily commute', 'transport', 'medium', 4.20, 25, 'bike', '#22c55e'),
  ('Take the Metro', 'Used public metro/train instead of driving', 'transport', 'easy', 3.50, 20, 'train-front', '#3b82f6'),
  ('Carpool Today', 'Shared a ride with colleagues or friends', 'transport', 'easy', 2.80, 15, 'users', '#8b5cf6'),
  ('Walk Short Distance', 'Walked instead of taking a vehicle for a short trip', 'transport', 'easy', 1.50, 10, 'footprints', '#f59e0b'),
  ('Work from Home', 'Avoided commute by working remotely', 'transport', 'easy', 5.00, 20, 'home', '#06b6d4'),
  
  -- Food actions
  ('Vegetarian Meal', 'Chose a vegetarian meal over non-vegetarian', 'food', 'easy', 2.60, 15, 'salad', '#22c55e'),
  ('Vegan Day', 'Went fully plant-based for the entire day', 'food', 'medium', 4.50, 30, 'vegan', '#16a34a'),
  ('No Food Waste', 'Finished all food without any waste today', 'food', 'easy', 0.80, 10, 'utensils-crossed', '#f97316'),
  ('Local Produce', 'Bought locally sourced fruits and vegetables', 'food', 'easy', 1.20, 10, 'apple', '#84cc16'),
  ('Home Cooked Meal', 'Cooked at home instead of ordering delivery', 'food', 'easy', 1.50, 10, 'cooking-pot', '#ea580c'),
  
  -- Electricity actions
  ('LED Switch', 'Switched off unnecessary lights or used LED bulbs', 'electricity', 'easy', 0.50, 5, 'lightbulb', '#facc15'),
  ('AC Thermostat Up', 'Raised AC temperature by 2°C', 'electricity', 'easy', 1.20, 10, 'thermometer', '#38bdf8'),
  ('Unplug Devices', 'Unplugged idle electronic devices to save standby power', 'electricity', 'easy', 0.30, 5, 'plug', '#a855f7'),
  ('Air Dry Clothes', 'Air-dried clothes instead of using a dryer', 'electricity', 'easy', 2.50, 15, 'wind', '#06b6d4'),
  ('Solar Charging', 'Used solar power to charge devices', 'electricity', 'hard', 0.80, 20, 'sun', '#f59e0b'),
  
  -- Waste & water actions
  ('Refuse Plastic', 'Used reusable bags instead of plastic', 'waste', 'easy', 0.40, 10, 'recycle', '#22c55e'),
  ('Compost Waste', 'Composted organic kitchen waste', 'waste', 'medium', 0.60, 15, 'sprout', '#84cc16'),
  ('Shorter Shower', 'Took a 5-minute or shorter shower', 'water', 'easy', 0.50, 5, 'droplets', '#3b82f6'),
  
  -- Shopping actions
  ('Second Hand Purchase', 'Bought a pre-owned item instead of new', 'shopping', 'medium', 5.00, 25, 'shopping-bag', '#d946ef'),
  ('Repair Instead of Replace', 'Got an item repaired rather than buying new', 'shopping', 'medium', 8.00, 30, 'wrench', '#f97316');

-- =============================================================================
-- VIEWS for Dashboard Analytics
-- =============================================================================

-- Monthly carbon summary per user
CREATE OR REPLACE VIEW user_monthly_carbon AS
SELECT
  user_id,
  DATE_TRUNC('month', logged_at) AS month,
  category,
  SUM(CASE WHEN is_saving THEN 0 ELSE kg_co2 END) AS total_emitted,
  SUM(CASE WHEN is_saving THEN kg_co2 ELSE 0 END) AS total_saved,
  COUNT(*) AS log_count
FROM carbon_logs
GROUP BY user_id, DATE_TRUNC('month', logged_at), category;

-- Weekly carbon summary per user
CREATE OR REPLACE VIEW user_weekly_carbon AS
SELECT
  user_id,
  DATE_TRUNC('week', logged_at) AS week,
  SUM(CASE WHEN is_saving THEN 0 ELSE kg_co2 END) AS total_emitted,
  SUM(CASE WHEN is_saving THEN kg_co2 ELSE 0 END) AS total_saved,
  COUNT(*) AS log_count
FROM carbon_logs
GROUP BY user_id, DATE_TRUNC('week', logged_at);

-- City-level karma aggregation for Local Impact Map
CREATE OR REPLACE VIEW city_karma_summary AS
SELECT
  p.city,
  p.state,
  COUNT(DISTINCT p.id) AS user_count,
  SUM(p.karma_points) AS total_karma,
  SUM(p.total_kg_co2_saved) AS total_kg_saved
FROM profiles p
WHERE p.city IS NOT NULL
GROUP BY p.city, p.state;
