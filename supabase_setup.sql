-- ==============================================================================
-- QUEST-FORGE: UNIFIED MASTER DATABASE SCHEMA & RLS SETUP
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table & Columns
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  last_active_park TEXT DEFAULT 'Delver''s Rest',
  last_active_qm_id UUID,
  last_active_qm_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS last_active_park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_qm_id UUID,
  ADD COLUMN IF NOT EXISTS last_active_qm_username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- 2. Park Questmasters Directory Table (Reigns)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. Isolated Character Sheets per Park & QM (user_park_profiles)
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.user_park_profiles 
  DROP CONSTRAINT IF EXISTS user_park_profiles_user_park_key;

ALTER TABLE public.user_park_profiles
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_park_profiles_user_park_qm 
  ON public.user_park_profiles (user_id, park, qm_id);

-- ------------------------------------------------------------------------------
-- 4. User Inventory Table & Durability
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  base_cost INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  durability_current INTEGER DEFAULT 1,
  durability_max INTEGER DEFAULT 1,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  qm_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS durability_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1;

-- Drop legacy inventory limit triggers (caps are enforced per-park in the application)
DROP TRIGGER IF EXISTS trigger_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS enforce_inventory_cap_trigger ON public.user_inventory;
DROP TRIGGER IF EXISTS trg_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS check_inventory_limit ON public.user_inventory;

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_park_qm 
  ON public.user_inventory (user_id, park, qm_id);

-- ------------------------------------------------------------------------------
-- 5. Quests Table & Battle Rules
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scenario_card TEXT,
  reward_gold INTEGER NOT NULL DEFAULT 15 CHECK (reward_gold >= 0),
  category TEXT NOT NULL DEFAULT 'Combat',
  is_active BOOLEAN NOT NULL DEFAULT true,
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  qm_id UUID,
  qm_username TEXT,
  reward_gold_defeat INTEGER DEFAULT 0,
  monsters_are_npc BOOLEAN DEFAULT FALSE,
  allowed_items TEXT DEFAULT 'Trinket,Talisman,Artifact',
  is_repeatable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quests 
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT,
  ADD COLUMN IF NOT EXISTS scenario_card TEXT,
  ADD COLUMN IF NOT EXISTS reward_gold_defeat INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monsters_are_npc BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allowed_items TEXT DEFAULT 'Trinket,Talisman,Artifact',
  ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_quests_qm_park ON public.quests (park, qm_id);
CREATE INDEX IF NOT EXISTS idx_quests_category_active ON public.quests (category, is_active);

-- ------------------------------------------------------------------------------
-- 6. User Quests (Assignments & Completions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON public.user_quests (user_id, status);

-- ------------------------------------------------------------------------------
-- 7. Quest Queues & Encounter Lines
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quest_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quest_queues_quest ON public.quest_queues (quest_id, status);

-- ------------------------------------------------------------------------------
-- 8. Queue Members (Heroes Line)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.quest_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT DEFAULT 'Hero',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_members_queue ON public.queue_members (queue_id);

-- ------------------------------------------------------------------------------
-- 9. Encounter Monsters (Monsters Line)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encounter_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.quest_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT DEFAULT 'Monster',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encounter_monsters_queue ON public.encounter_monsters (queue_id);

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_questmasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_park_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_monsters ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS cleanup and creation
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'park_questmasters', 'user_park_profiles', 'user_inventory', 'quests', 'user_quests', 'quest_queues', 'queue_members', 'encounter_monsters']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow select on %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow insert on %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow update on %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow delete on %I" ON public.%I', tbl, tbl);

    EXECUTE format('CREATE POLICY "Allow select on %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow insert on %I" ON public.%I FOR INSERT WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow update on %I" ON public.%I FOR UPDATE USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow delete on %I" ON public.%I FOR DELETE USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 11. Automatic User Signup Trigger Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_kingdom TEXT;
  v_park TEXT;
BEGIN
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Adventurer');
  v_kingdom := COALESCE(new.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard');
  v_park := COALESCE(new.raw_user_meta_data->>'park', 'Delver''s Rest');

  INSERT INTO public.profiles (
    id,
    username,
    email,
    role,
    gold,
    kingdom,
    park,
    last_active_kingdom,
    last_active_park
  )
  VALUES (
    new.id,
    v_username,
    new.email,
    'player',
    0,
    v_kingdom,
    v_park,
    v_kingdom,
    v_park
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    kingdom = EXCLUDED.kingdom,
    park = EXCLUDED.park;

  INSERT INTO public.user_park_profiles (
    user_id,
    kingdom,
    park,
    role,
    gold
  )
  VALUES (
    new.id,
    v_kingdom,
    v_park,
    'player',
    0
  )
  ON CONFLICT DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 12. Atomic Server-Side Durability Degradation Engine
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_combat_durability_damage(
  target_user_id UUID,
  target_park TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_park TEXT;
BEGIN
  IF target_park IS NOT NULL THEN
    active_park := target_park;
  ELSE
    SELECT park INTO active_park FROM public.profiles WHERE id = target_user_id;
  END IF;

  DELETE FROM public.user_inventory
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) <= 1;

  UPDATE public.user_inventory
  SET durability_current = COALESCE(durability_current, durability_max, 1) - 1
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) > 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_combat_durability_damage(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 13. Permissions & Grants
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
