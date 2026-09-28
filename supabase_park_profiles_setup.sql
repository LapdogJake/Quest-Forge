-- ==============================================================================
-- QUEST-FORGE: Relational Park-Based Architecture Setup
-- Table: public.user_park_profiles (Individual Player Sheet per Park)
-- ==============================================================================

-- 1. Create the user_park_profiles table
CREATE TABLE IF NOT EXISTS public.user_park_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kingdom TEXT NOT NULL,
  park TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player',
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_park_profiles_user_park_key UNIQUE (user_id, park)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_park_profiles_user_park 
  ON public.user_park_profiles (user_id, park);

CREATE INDEX IF NOT EXISTS idx_user_park_profiles_park_roster 
  ON public.user_park_profiles (park);

-- 3. Ensure profiles table has kingdom, park, and tracks last active location
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard';

-- 4. Ensure user_inventory has park and kingdom columns
ALTER TABLE public.user_inventory DISABLE TRIGGER USER;

ALTER TABLE public.user_inventory 
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS durability_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1;

-- Backfill any existing items that have null park
UPDATE public.user_inventory 
SET park = 'Delver''s Rest', kingdom = 'The Freeholds of Amtgard'
WHERE park IS NULL;

ALTER TABLE public.user_inventory ENABLE TRIGGER USER;

-- Drop legacy triggers that prevent updates or lack park-isolation (validation is enforced per-park in app)
DROP TRIGGER IF EXISTS trigger_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS enforce_inventory_cap_trigger ON public.user_inventory;
DROP TRIGGER IF EXISTS trg_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS check_inventory_limit ON public.user_inventory;

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_park 
  ON public.user_inventory (user_id, park);

-- 5. Seed / Migrate existing player profiles into user_park_profiles
-- Migrates each existing user's current gold, park, kingdom, and role into their local park profile
INSERT INTO public.user_park_profiles (user_id, kingdom, park, role, gold)
SELECT 
  id AS user_id,
  COALESCE(kingdom, 'The Freeholds of Amtgard') AS kingdom,
  COALESCE(park, 'Delver''s Rest') AS park,
  COALESCE(role, 'player') AS role,
  COALESCE(gold, 0) AS gold
FROM public.profiles
ON CONFLICT (user_id, park) DO UPDATE 
SET 
  kingdom = EXCLUDED.kingdom,
  role = EXCLUDED.role,
  gold = EXCLUDED.gold;

-- Ensure Beta - Test park profile exists with 0 gold for testing
INSERT INTO public.user_park_profiles (user_id, kingdom, park, role, gold)
SELECT 
  id AS user_id,
  'Beta - Test' AS kingdom,
  'Beta - Test' AS park,
  'player' AS role,
  0 AS gold
FROM public.profiles
ON CONFLICT (user_id, park) DO NOTHING;

-- 6. Row Level Security Policies for user_park_profiles
ALTER TABLE public.user_park_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow insert on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow update on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow delete on user_park_profiles" ON public.user_park_profiles;

-- Anyone authenticated can view park profiles (allows roster views by QMs and looking up players)
CREATE POLICY "Allow select on user_park_profiles"
  ON public.user_park_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own park profile row (e.g. when checking into a new park)
CREATE POLICY "Allow insert on user_park_profiles"
  ON public.user_park_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users or QMs can update park profiles (gold rewards, role updates)
CREATE POLICY "Allow update on user_park_profiles"
  ON public.user_park_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
