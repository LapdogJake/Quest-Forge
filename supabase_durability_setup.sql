-- ==============================================================================
-- QUEST-FORGE: Durability & User Inventory Database Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Ensure Columns Exist on user_inventory
ALTER TABLE public.user_inventory 
  ADD COLUMN IF NOT EXISTS durability_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS durability_max INTEGER DEFAULT 1;

-- 2. Row Level Security Policies for user_inventory
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

-- Allow deletions (selling, decay cleanup, depleted items)
CREATE POLICY "Allow delete on user_inventory"
  ON public.user_inventory FOR DELETE
  TO authenticated
  USING (true);


-- ==============================================================================
-- 3. Dedicated Server-Side Atomic Stored Procedure / RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_combat_durability_damage(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A. Delete fully depleted items or expired items
  DELETE FROM public.user_inventory
  WHERE user_id = target_user_id
    AND (
      expires_at <= NOW()
      OR COALESCE(durability_current, durability_max, 1) <= 1
    );

  -- B. Decrement durability for active items with durability remaining
  UPDATE public.user_inventory
  SET durability_current = COALESCE(durability_current, durability_max, 1) - 1
  WHERE user_id = target_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND COALESCE(durability_current, durability_max, 1) > 1;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_combat_durability_damage(UUID) TO authenticated;
