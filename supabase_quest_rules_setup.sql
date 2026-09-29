-- ==============================================================================
-- QUEST-FORGE: Quest Rules, NPC Monsters & Magic Item Durability Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Add quest columns for Monster NPC flag and Magic Item restrictions
ALTER TABLE public.quests 
  ADD COLUMN IF NOT EXISTS monsters_are_npc BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_items TEXT DEFAULT 'Trinket,Talisman,Artifact',
  ADD COLUMN IF NOT EXISTS reward_gold_defeat INTEGER DEFAULT 0;

-- 2. Optional: Index on category & active status
CREATE INDEX IF NOT EXISTS idx_quests_category_active 
  ON public.quests (category, is_active);
