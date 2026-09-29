-- ==============================================================================
-- QUEST-FORGE: Park-Isolated Quests & Battles Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Add park and kingdom isolation columns to the quests table
ALTER TABLE public.quests 
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard';

-- 2. Backfill existing quests without a park tag to 'Delver''s Rest'
UPDATE public.quests 
SET park = 'Delver''s Rest', 
    kingdom = 'The Freeholds of Amtgard'
WHERE park IS NULL OR park = '';

-- 3. High-Performance Indexes for Park Scoping
CREATE INDEX IF NOT EXISTS idx_quests_park_active 
  ON public.quests (park, is_active);

CREATE INDEX IF NOT EXISTS idx_quests_park_category 
  ON public.quests (park, category);
