-- ==============================================================================
-- QUEST-FORGE: Player-Hosted Questmaster (QM) Reigns & Dynamic Instance Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Table: public.park_questmasters (Directory of registered QMs per Park)
CREATE TABLE IF NOT EXISTS public.park_questmasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT park_questmasters_user_park_key UNIQUE (user_id, park)
);

-- Indexes for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_park_questmasters_park ON public.park_questmasters (park);
CREATE INDEX IF NOT EXISTS idx_park_questmasters_user ON public.park_questmasters (user_id);

-- RLS Security Policies for park_questmasters
ALTER TABLE public.park_questmasters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow insert on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow update on park_questmasters" ON public.park_questmasters;
DROP POLICY IF EXISTS "Allow delete on park_questmasters" ON public.park_questmasters;

CREATE POLICY "Allow select on park_questmasters" ON public.park_questmasters FOR SELECT USING (true);
CREATE POLICY "Allow insert on park_questmasters" ON public.park_questmasters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on park_questmasters" ON public.park_questmasters FOR UPDATE USING (true);
CREATE POLICY "Allow delete on park_questmasters" ON public.park_questmasters FOR DELETE USING (true);

-- 2. Add qm_id and qm_username to public.quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT;

CREATE INDEX IF NOT EXISTS idx_quests_qm_park ON public.quests (park, qm_id);

-- 3. Add qm_id to public.user_park_profiles (Player character sheet per QM reign)
ALTER TABLE public.user_park_profiles
  ADD COLUMN IF NOT EXISTS qm_id UUID,
  ADD COLUMN IF NOT EXISTS qm_username TEXT;

-- Drop old unique constraint on (user_id, park) so players can have independent sheets per QM reign
ALTER TABLE public.user_park_profiles 
  DROP CONSTRAINT IF EXISTS user_park_profiles_user_park_key;

CREATE INDEX IF NOT EXISTS idx_user_park_profiles_user_park_qm 
  ON public.user_park_profiles (user_id, park, qm_id);

-- 4. Add qm_id to public.user_inventory (Isolated bag per QM reign)
ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS qm_id UUID;

CREATE INDEX IF NOT EXISTS idx_user_inventory_user_park_qm 
  ON public.user_inventory (user_id, park, qm_id);

-- 5. Add last_active_qm_id to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_qm_id UUID,
  ADD COLUMN IF NOT EXISTS last_active_qm_username TEXT;

-- 6. Seed initial QM entry for Delver's Rest if any profiles exist
INSERT INTO public.park_questmasters (user_id, username, kingdom, park)
SELECT id, username, COALESCE(kingdom, 'The Freeholds of Amtgard'), COALESCE(park, 'Delver''s Rest')
FROM public.profiles
WHERE role = 'qm' OR role = 'admin'
ON CONFLICT (user_id, park) DO NOTHING;
