-- ==============================================================================
-- QUEST-FORGE: COMPLETE MASTER DATABASE & RLS SETUP
-- Run this ENTIRE script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run)
-- ==============================================================================

-- ==============================================================================
-- 1. Profiles Table Updates
-- ==============================================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS last_active_qm_id UUID,
  ADD COLUMN IF NOT EXISTS last_active_qm_username TEXT;

-- ==============================================================================
-- 2. Park Questmasters Directory Table (Reigns)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.park_questmasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT park_questmasters_user_park_key UNIQUE (user_id, park)
);

CREATE INDEX IF NOT EXISTS idx_park_questmasters_park ON public.park_questmasters (park);
CREATE INDEX IF NOT EXISTS idx_park_questmasters_user ON public.park_questmasters (user_id);

ALTER TABLE public.park_questmasters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow insert on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow update on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow delete on park_questmasters" ON public.park_questmasters;

CREATE POLICY "Allow select on park_questmasters" ON public.park_questmasters FOR SELECT USING (true);
CREATE POLICY "Allow insert on park_questmasters" ON public.park_questmasters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on park_questmasters" ON public.park_questmasters FOR UPDATE USING (true);
CREATE POLICY "Allow delete on park_questmasters" ON public.park_questmasters FOR DELETE USING (true);

-- Seed Delver's Rest initial QM
INSERT INTO public.park_questmasters (user_id, username, kingdom, park)
SELECT id, username, COALESCE(kingdom, 'The Freeholds of Amtgard'), COALESCE(park, 'Delver''s Rest')
FROM public.profiles
WHERE role = 'qm' OR role = 'admin' OR role = 'questmaster'
ON CONFLICT (user_id, park) DO NOTHING;

-- ==============================================================================
-- 3. Isolated User Character Sheets per Park & QM (user_park_profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_park_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  qm_id UUID,
  qm_username TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure old legacy unique constraints do not block multi-QM sheets
ALTER TABLE public.user_park_profiles 
  DROP CONSTRAINT IF EXISTS user_park_profiles_user_park_key;

ALTER TABLE public.user_park_profiles
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT;

CREATE INDEX IF NOT EXISTS idx_user_park_profiles_user_park_qm 
  ON public.user_park_profiles (user_id, park, qm_id);

ALTER TABLE public.user_park_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow insert on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow update on user_park_profiles" ON public.user_park_profiles;
DROP POLICY IF EXISTS "Allow delete on user_park_profiles" ON public.user_park_profiles;

CREATE POLICY "Allow select on user_park_profiles" ON public.user_park_profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert on user_park_profiles" ON public.user_park_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on user_park_profiles" ON public.user_park_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow delete on user_park_profiles" ON public.user_park_profiles FOR DELETE USING (true);

-- ==============================================================================
-- 4. User Inventory Table & Durability Columns
-- ==============================================================================
ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS durability_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1;

UPDATE public.user_inventory 
SET park = 'Delver''s Rest', kingdom = 'The Freeholds of Amtgard'
WHERE park IS NULL;

-- Drop legacy inventory limit triggers
DROP TRIGGER IF EXISTS trigger_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS enforce_inventory_cap_trigger ON public.user_inventory;
DROP TRIGGER IF EXISTS trg_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS check_inventory_limit ON public.user_inventory;

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_park_qm 
  ON public.user_inventory (user_id, park, qm_id);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow insert on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow update on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow delete on user_inventory" ON public.user_inventory;

CREATE POLICY "Allow select on user_inventory" ON public.user_inventory FOR SELECT USING (true);
CREATE POLICY "Allow insert on user_inventory" ON public.user_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on user_inventory" ON public.user_inventory FOR UPDATE USING (true);
CREATE POLICY "Allow delete on user_inventory" ON public.user_inventory FOR DELETE USING (true);

-- ==============================================================================
-- 5. Quests Table & Battle Rule Columns
-- ==============================================================================
ALTER TABLE public.quests 
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT,
  ADD COLUMN IF NOT EXISTS reward_gold_defeat INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monsters_are_npc BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allowed_items TEXT DEFAULT 'Trinket,Talisman,Artifact';

CREATE INDEX IF NOT EXISTS idx_quests_qm_park ON public.quests (park, qm_id);
CREATE INDEX IF NOT EXISTS idx_quests_category_active ON public.quests (category, is_active);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow insert on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow update on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow delete on quests" ON public.quests;

CREATE POLICY "Allow select on quests" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Allow insert on quests" ON public.quests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on quests" ON public.quests FOR UPDATE USING (true);
CREATE POLICY "Allow delete on quests" ON public.quests FOR DELETE USING (true);

-- ==============================================================================
-- 6. User Quests (Assignments & Completions)
-- ==============================================================================
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow insert on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow update on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow delete on user_quests" ON public.user_quests;

CREATE POLICY "Allow select on user_quests" ON public.user_quests FOR SELECT USING (true);
CREATE POLICY "Allow insert on user_quests" ON public.user_quests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on user_quests" ON public.user_quests FOR UPDATE USING (true);
CREATE POLICY "Allow delete on user_quests" ON public.user_quests FOR DELETE USING (true);

-- ==============================================================================
-- 7. Quest Queues & Encounter Lines
-- ==============================================================================
ALTER TABLE public.quest_queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow insert on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow update on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow delete on quest_queues" ON public.quest_queues;

CREATE POLICY "Allow select on quest_queues" ON public.quest_queues FOR SELECT USING (true);
CREATE POLICY "Allow insert on quest_queues" ON public.quest_queues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on quest_queues" ON public.quest_queues FOR UPDATE USING (true);
CREATE POLICY "Allow delete on quest_queues" ON public.quest_queues FOR DELETE USING (true);

-- ==============================================================================
-- 8. Queue Members (Heroes Line)
-- ==============================================================================
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow insert on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow update on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow delete on queue_members" ON public.queue_members;

CREATE POLICY "Allow select on queue_members" ON public.queue_members FOR SELECT USING (true);
CREATE POLICY "Allow insert on queue_members" ON public.queue_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on queue_members" ON public.queue_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete on queue_members" ON public.queue_members FOR DELETE USING (true);

-- ==============================================================================
-- 9. Encounter Monsters (Monsters Line)
-- ==============================================================================
ALTER TABLE public.encounter_monsters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow insert on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow update on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow delete on encounter_monsters" ON public.encounter_monsters;

CREATE POLICY "Allow select on encounter_monsters" ON public.encounter_monsters FOR SELECT USING (true);
CREATE POLICY "Allow insert on encounter_monsters" ON public.encounter_monsters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on encounter_monsters" ON public.encounter_monsters FOR UPDATE USING (true);
CREATE POLICY "Allow delete on encounter_monsters" ON public.encounter_monsters FOR DELETE USING (true);

-- ==============================================================================
-- 10. Atomic Server-Side Durability Degradation Engine
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_combat_durability_damage(
  target_user_id UUID,
  target_park TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_park TEXT;
BEGIN
  IF target_park IS NOT NULL THEN
    active_park := target_park;
  ELSE
    SELECT park INTO active_park FROM public.profiles WHERE id = target_user_id;
  END IF;

  -- Delete depleted items
  DELETE FROM public.user_inventory
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) <= 1;

  -- Decrement durability on remaining items
  UPDATE public.user_inventory
  SET durability_current = COALESCE(durability_current, durability_max, 1) - 1
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) > 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_combat_durability_damage(UUID, TEXT) TO authenticated;
