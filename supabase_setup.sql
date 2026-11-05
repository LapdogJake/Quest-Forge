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
  role TEXT NOT NULL DEFAULT 'player',
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  last_active_park TEXT DEFAULT 'Delver''s Rest',
  last_active_qm_id UUID,
  last_active_qm_username TEXT,
  quest_abilities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure email column is dropped from public profiles to protect player privacy (emails remain secure in auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Drop legacy unique constraint on username so recreated accounts or shared persona names across parks never block profile creation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
DROP INDEX IF EXISTS public.profiles_username_key;

-- Remove any orphaned profile rows from deleted auth.users accounts
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS last_active_park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS last_active_qm_id UUID,
  ADD COLUMN IF NOT EXISTS last_active_qm_username TEXT,
  ADD COLUMN IF NOT EXISTS quest_abilities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill public.profiles for any existing auth.users missing a profile row
INSERT INTO public.profiles (id, username, role, gold, kingdom, park, last_active_kingdom, last_active_park)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Adventurer'),
  'player',
  0,
  COALESCE(u.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard'),
  COALESCE(u.raw_user_meta_data->>'park', 'Delver''s Rest'),
  COALESCE(u.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard'),
  COALESCE(u.raw_user_meta_data->>'park', 'Delver''s Rest')
FROM auth.users u
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Park Questmasters Directory Table (Reigns)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.park_questmasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT park_questmasters_user_park_key UNIQUE (user_id, park)
);

-- Remove any orphaned questmaster rows from deleted auth.users accounts
DELETE FROM public.park_questmasters WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Ensure park_questmasters_user_id_fkey references auth.users(id) so QM registration never fails if profile row was delayed
ALTER TABLE public.park_questmasters
  DROP CONSTRAINT IF EXISTS park_questmasters_user_id_fkey;

ALTER TABLE public.park_questmasters
  ADD CONSTRAINT park_questmasters_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

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
  quest_abilities TEXT[] DEFAULT '{}',
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
  ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_abilities TEXT[] DEFAULT '{}';

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
  storage_location TEXT DEFAULT 'pouch',
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
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'pouch';

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
  repeatable BOOLEAN DEFAULT FALSE,
  is_repeatable BOOLEAN DEFAULT FALSE,
  max_active INTEGER DEFAULT 0,
  max_completions INTEGER DEFAULT 0,
  verification_method TEXT DEFAULT 'Quest Master',
  discipline TEXT DEFAULT 'Service',
  allow_mid_join BOOLEAN DEFAULT FALSE,
  rng_loot_drops BOOLEAN DEFAULT FALSE,
  battle_mode TEXT DEFAULT 'pvp',
  battle_teams JSONB DEFAULT '["red","blue"]'::jsonb,
  placement_rewards JSONB DEFAULT '[15,10,10,10,10,10]'::jsonb,
  monster_reward INTEGER DEFAULT 10,
  durability_wear INTEGER DEFAULT 1,
  defeat_penalty TEXT DEFAULT 'none',
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
  ADD COLUMN IF NOT EXISTS repeatable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_active INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_completions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'Quest Master',
  ADD COLUMN IF NOT EXISTS discipline TEXT DEFAULT 'Service',
  ADD COLUMN IF NOT EXISTS allow_mid_join BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rng_loot_drops BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS battle_mode TEXT DEFAULT 'pvp',
  ADD COLUMN IF NOT EXISTS battle_teams JSONB DEFAULT '["red","blue"]'::jsonb,
  ADD COLUMN IF NOT EXISTS placement_rewards JSONB DEFAULT '[15,10,10,10,10,10]'::jsonb,
  ADD COLUMN IF NOT EXISTS monster_reward INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS battle_config JSONB,
  ADD COLUMN IF NOT EXISTS durability_wear INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS defeat_penalty TEXT DEFAULT 'none';

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
ALTER TABLE public.user_quests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 7. Quest Queues & Encounter Lines
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quest_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quest_queues
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_quest_queues_quest ON public.quest_queues (quest_id, status);

-- ------------------------------------------------------------------------------
-- 8. Queue Members (Battle Teams & Monster Line)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.quest_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT DEFAULT 'red',
  team TEXT DEFAULT 'red',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.queue_members
  ADD COLUMN IF NOT EXISTS role_name TEXT DEFAULT 'red',
  ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'red',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_queue_members_queue ON public.queue_members (queue_id);

-- ------------------------------------------------------------------------------
-- 9. Encounter Monsters (Monsters Line)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encounter_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.quest_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT DEFAULT 'Monster',
  status TEXT DEFAULT 'claimed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.encounter_monsters
  ADD COLUMN IF NOT EXISTS role_name TEXT DEFAULT 'Monster',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_encounter_monsters_queue ON public.encounter_monsters (queue_id);

-- Explicit foreign key references to public.profiles for PostgREST schema cache joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_quests_user_id_profiles_fkey' AND table_name = 'user_quests'
  ) THEN
    ALTER TABLE public.user_quests 
      ADD CONSTRAINT user_quests_user_id_profiles_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'queue_members_user_id_profiles_fkey' AND table_name = 'queue_members'
  ) THEN
    ALTER TABLE public.queue_members 
      ADD CONSTRAINT queue_members_user_id_profiles_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'encounter_monsters_user_id_profiles_fkey' AND table_name = 'encounter_monsters'
  ) THEN
    ALTER TABLE public.encounter_monsters 
      ADD CONSTRAINT encounter_monsters_user_id_profiles_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

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

-- Strict Questmaster-level RLS across quests, character sheets, inventory, and QM registrations
-- Every Questmaster only controls rows instanced under their own qm_id (auth.uid())

-- 1) public.quests (Quests, Battles, and __REALM_ITEM_CONFIG__ are strictly owned by qm_id = auth.uid())
DROP POLICY IF EXISTS "Allow insert on quests" ON public.quests;
CREATE POLICY "Allow insert on quests"
  ON public.quests FOR INSERT
  WITH CHECK (qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow update on quests" ON public.quests;
CREATE POLICY "Allow update on quests"
  ON public.quests FOR UPDATE
  USING (qm_id = auth.uid())
  WITH CHECK (qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on quests" ON public.quests;
CREATE POLICY "Allow delete on quests"
  ON public.quests FOR DELETE
  USING (qm_id = auth.uid());

-- 2) public.user_park_profiles (Players manage their own sheet; QMs can only edit sheets instanced under their qm_id)
DROP POLICY IF EXISTS "Allow insert on user_park_profiles" ON public.user_park_profiles;
CREATE POLICY "Allow insert on user_park_profiles"
  ON public.user_park_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow update on user_park_profiles" ON public.user_park_profiles;
CREATE POLICY "Allow update on user_park_profiles"
  ON public.user_park_profiles FOR UPDATE
  USING (user_id = auth.uid() OR qm_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on user_park_profiles" ON public.user_park_profiles;
CREATE POLICY "Allow delete on user_park_profiles"
  ON public.user_park_profiles FOR DELETE
  USING (user_id = auth.uid() OR qm_id = auth.uid());

-- 3) public.user_inventory (Players manage their own items; QMs can only grant/edit/delete items instanced under their qm_id)
DROP POLICY IF EXISTS "Allow insert on user_inventory" ON public.user_inventory;
CREATE POLICY "Allow insert on user_inventory"
  ON public.user_inventory FOR INSERT
  WITH CHECK (user_id = auth.uid() OR qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow update on user_inventory" ON public.user_inventory;
CREATE POLICY "Allow update on user_inventory"
  ON public.user_inventory FOR UPDATE
  USING (user_id = auth.uid() OR qm_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on user_inventory" ON public.user_inventory;
CREATE POLICY "Allow delete on user_inventory"
  ON public.user_inventory FOR DELETE
  USING (user_id = auth.uid() OR qm_id = auth.uid());

-- 4) public.park_questmasters (Users can only register or remove their own QM reign)
DROP POLICY IF EXISTS "Allow insert on park_questmasters" ON public.park_questmasters;
CREATE POLICY "Allow insert on park_questmasters"
  ON public.park_questmasters FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update on park_questmasters" ON public.park_questmasters;
CREATE POLICY "Allow update on park_questmasters"
  ON public.park_questmasters FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on park_questmasters" ON public.park_questmasters;
CREATE POLICY "Allow delete on park_questmasters"
  ON public.park_questmasters FOR DELETE
  USING (user_id = auth.uid());

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
    'player',
    0,
    v_kingdom,
    v_park,
    v_kingdom,
    v_park
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
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

-- Backfill public.profiles for any existing auth.users missing a profile row
INSERT INTO public.profiles (id, username, role, gold, kingdom, park, last_active_kingdom, last_active_park)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Adventurer'),
  'player',
  0,
  COALESCE(u.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard'),
  COALESCE(u.raw_user_meta_data->>'park', 'Delver''s Rest'),
  COALESCE(u.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard'),
  COALESCE(u.raw_user_meta_data->>'park', 'Delver''s Rest')
FROM auth.users u
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 12. Atomic Server-Side Durability Degradation Engine (Scoped by Park & QM)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_combat_durability_damage(
  target_user_id UUID,
  target_park TEXT DEFAULT NULL,
  target_qm_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_park TEXT;
  active_qm_id UUID;
BEGIN
  IF target_park IS NOT NULL THEN
    active_park := target_park;
  ELSE
    SELECT COALESCE(last_active_park, park) INTO active_park FROM public.profiles WHERE id = target_user_id;
  END IF;

  IF target_qm_id IS NOT NULL THEN
    active_qm_id := target_qm_id;
  ELSE
    SELECT last_active_qm_id INTO active_qm_id FROM public.profiles WHERE id = target_user_id;
  END IF;

  DELETE FROM public.user_inventory
  WHERE user_id = target_user_id
    AND park = active_park
    AND (qm_id = active_qm_id OR (active_qm_id IS NULL AND qm_id IS NULL))
    AND (storage_location IS NULL OR storage_location = 'pouch')
    AND COALESCE(durability_current, durability_max, 1) <= 1;

  UPDATE public.user_inventory
  SET durability_current = COALESCE(durability_current, durability_max, 1) - 1
  WHERE user_id = target_user_id
    AND park = active_park
    AND (qm_id = active_qm_id OR (active_qm_id IS NULL AND qm_id IS NULL))
    AND (storage_location IS NULL OR storage_location = 'pouch')
    AND COALESCE(durability_current, durability_max, 1) > 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_combat_durability_damage(UUID, TEXT, UUID) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 14. Chronicles Table (Quest Journal, Lore & Announcements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qm_id UUID,
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Chronicle', 'Lore', 'Announcement')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Questmaster',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chronicles ADD COLUMN IF NOT EXISTS qm_id UUID;

CREATE INDEX IF NOT EXISTS idx_chronicles_qm_id ON public.chronicles (qm_id);
CREATE INDEX IF NOT EXISTS idx_chronicles_park ON public.chronicles (park);
CREATE INDEX IF NOT EXISTS idx_chronicles_qm_park ON public.chronicles (park, qm_id);
CREATE INDEX IF NOT EXISTS idx_chronicles_category ON public.chronicles (category);
CREATE INDEX IF NOT EXISTS idx_chronicles_created_at ON public.chronicles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chronicles_pinned ON public.chronicles (is_pinned);

ALTER TABLE public.chronicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view chronicles" ON public.chronicles;
CREATE POLICY "Public can view chronicles"
  ON public.chronicles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public and authenticated can insert chronicles" ON public.chronicles;
CREATE POLICY "Public and authenticated can insert chronicles"
  ON public.chronicles FOR INSERT
  TO authenticated
  WITH CHECK (qm_id = auth.uid() OR author_id = auth.uid());

DROP POLICY IF EXISTS "Public and authenticated can update chronicles" ON public.chronicles;
CREATE POLICY "Public and authenticated can update chronicles"
  ON public.chronicles FOR UPDATE
  TO authenticated
  USING (qm_id = auth.uid() OR author_id = auth.uid())
  WITH CHECK (qm_id = auth.uid() OR author_id = auth.uid());

DROP POLICY IF EXISTS "Public and authenticated can delete chronicles" ON public.chronicles;
CREATE POLICY "Public and authenticated can delete chronicles"
  ON public.chronicles FOR DELETE
  TO authenticated
  USING (qm_id = auth.uid() OR author_id = auth.uid());

-- Realtime Publication for live Chronicle updates (Safe / Idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chronicles;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 15. Player Lifetime Stats & Settings Table (public.player_stats)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  quests_completed INTEGER NOT NULL DEFAULT 0,
  gold_collected INTEGER NOT NULL DEFAULT 0,
  player_class TEXT NOT NULL DEFAULT 'Peasant',
  theme_mode TEXT NOT NULL DEFAULT 'dark',
  text_size TEXT NOT NULL DEFAULT 'normal',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on player_stats" ON public.player_stats;
CREATE POLICY "Allow select on player_stats"
  ON public.player_stats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert on player_stats" ON public.player_stats;
CREATE POLICY "Allow insert on player_stats"
  ON public.player_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.park_questmasters pq WHERE pq.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow update on player_stats" ON public.player_stats;
CREATE POLICY "Allow update on player_stats"
  ON public.player_stats FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.park_questmasters pq WHERE pq.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.park_questmasters pq WHERE pq.user_id = auth.uid()
    )
  );

-- Backfill player_stats for existing users
INSERT INTO public.player_stats (user_id)
SELECT u.id FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 16. Quest & Battle Archive Repository Table (public.quest_archive)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quest_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Quest',
  discipline TEXT DEFAULT 'Service',
  description TEXT DEFAULT '',
  reward_gold INTEGER NOT NULL DEFAULT 5,
  reward_gold_defeat INTEGER NOT NULL DEFAULT 10,
  monster_reward INTEGER NOT NULL DEFAULT 10,
  scenario_card TEXT DEFAULT '',
  repeatable BOOLEAN NOT NULL DEFAULT false,
  verification_method TEXT DEFAULT 'Quest Master',
  author_qm_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_qm_username TEXT NOT NULL DEFAULT 'Questmaster',
  origin_park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  origin_kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quest_archive_author ON public.quest_archive (author_qm_username);
CREATE INDEX IF NOT EXISTS idx_quest_archive_park ON public.quest_archive (origin_park);
CREATE INDEX IF NOT EXISTS idx_quest_archive_kingdom ON public.quest_archive (origin_kingdom);
CREATE INDEX IF NOT EXISTS idx_quest_archive_created_at ON public.quest_archive (created_at DESC);

ALTER TABLE public.quest_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on quest_archive" ON public.quest_archive;
CREATE POLICY "Allow select on quest_archive"
  ON public.quest_archive FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert on quest_archive" ON public.quest_archive;
CREATE POLICY "Allow insert on quest_archive"
  ON public.quest_archive FOR INSERT
  TO authenticated
  WITH CHECK (author_qm_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on quest_archive" ON public.quest_archive;
CREATE POLICY "Allow delete on quest_archive"
  ON public.quest_archive FOR DELETE
  TO authenticated
  USING (author_qm_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 17. Chronicle Comments Table (public.chronicle_comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronicle_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chronicle_id UUID NOT NULL REFERENCES public.chronicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL DEFAULT 'Adventurer',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chronicle_comments_chronicle_id
  ON public.chronicle_comments (chronicle_id, created_at ASC);

ALTER TABLE public.chronicle_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on chronicle_comments" ON public.chronicle_comments;
CREATE POLICY "Allow select on chronicle_comments"
  ON public.chronicle_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert on chronicle_comments" ON public.chronicle_comments;
CREATE POLICY "Allow insert on chronicle_comments"
  ON public.chronicle_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete on chronicle_comments" ON public.chronicle_comments;
CREATE POLICY "Allow delete on chronicle_comments"
  ON public.chronicle_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.park_questmasters pq WHERE pq.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 18. Permissions & Grants
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
