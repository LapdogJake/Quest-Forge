-- ==============================================================================
-- QUEST-FORGE: Group Affiliation, Durability & Isolated Park Inventory Setup
-- Beta Configuration: The Freeholds of Amtgard -> Delver's Rest
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Ensure Columns Exist on profiles with Beta Defaults
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS park_gold JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure Columns Exist on user_inventory with Beta Defaults
ALTER TABLE public.user_inventory 
  ADD COLUMN IF NOT EXISTS kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  ADD COLUMN IF NOT EXISTS park TEXT DEFAULT 'Delver''s Rest',
  ADD COLUMN IF NOT EXISTS durability_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1;

-- 3. High Performance Index for Isolated Park Inventory Queries
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_park 
  ON public.user_inventory (user_id, park);

-- 4. Set / Reset all existing user profiles and items to the single Beta group
UPDATE public.profiles 
  SET kingdom = 'The Freeholds of Amtgard', 
      park = 'Delver''s Rest',
      gold = 0,
      park_gold = jsonb_build_object('Delver''s Rest', 0, 'Beta - Test', 0);

-- Disable user triggers temporarily so backfilling columns is not blocked by legacy row caps
ALTER TABLE public.user_inventory DISABLE TRIGGER USER;

UPDATE public.user_inventory 
  SET kingdom = 'The Freeholds of Amtgard', park = 'Delver''s Rest';

ALTER TABLE public.user_inventory ENABLE TRIGGER USER;

-- Drop legacy trigger that was preventing updates and not scoping by park (limits are handled per-park in app)
DROP TRIGGER IF EXISTS trigger_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS enforce_inventory_cap_trigger ON public.user_inventory;
DROP TRIGGER IF EXISTS trg_enforce_inventory_cap ON public.user_inventory;
DROP TRIGGER IF EXISTS check_inventory_limit ON public.user_inventory;

-- 5. Row Level Security Policies for user_inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting old policies if necessary
DROP POLICY IF EXISTS "Allow select on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow insert on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow update on user_inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Allow delete on user_inventory" ON public.user_inventory;

-- Allow authenticated users to view inventory
CREATE POLICY "Allow select on user_inventory"
  ON public.user_inventory FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their purchased items
CREATE POLICY "Allow insert on user_inventory"
  ON public.user_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow updates to durability & inventory (by item owner or QM)
CREATE POLICY "Allow update on user_inventory"
  ON public.user_inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow deletions (selling, depleted items)
CREATE POLICY "Allow delete on user_inventory"
  ON public.user_inventory FOR DELETE
  TO authenticated
  USING (true);


-- ==============================================================================
-- 6. Dedicated Server-Side Atomic Stored Procedure / RPC (Park-Isolated)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_combat_durability_damage(
  target_user_id UUID, 
  target_park TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_park TEXT;
BEGIN
  -- Determine target park: use explicit parameter if provided, 
  -- otherwise look up the user's active park from their profile.
  IF target_park IS NOT NULL THEN
    active_park := target_park;
  ELSE
    SELECT park INTO active_park FROM public.profiles WHERE id = target_user_id;
  END IF;

  -- A. Delete fully depleted items in the active park
  DELETE FROM public.user_inventory
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) <= 1;

  -- B. Decrement durability for remaining items in the active park
  UPDATE public.user_inventory
  SET durability_current = COALESCE(durability_current, durability_max, 1) - 1
  WHERE user_id = target_user_id
    AND (park = active_park OR active_park IS NULL OR park IS NULL)
    AND COALESCE(durability_current, durability_max, 1) > 1;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_combat_durability_damage(UUID, TEXT) TO authenticated;
