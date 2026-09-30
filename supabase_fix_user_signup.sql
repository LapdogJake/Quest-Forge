-- ==============================================================================
-- QUEST-FORGE: SIGNUP & USER PROFILE SETUP SCRIPT
-- Run this in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run)
-- ==============================================================================

-- 1. Ensure public.profiles table exists and has proper columns & defaults
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  gold INTEGER NOT NULL DEFAULT 0,
  kingdom TEXT NOT NULL DEFAULT 'The Freeholds of Amtgard',
  park TEXT NOT NULL DEFAULT 'Delver''s Rest',
  last_active_kingdom TEXT DEFAULT 'The Freeholds of Amtgard',
  last_active_park TEXT DEFAULT 'Delver''s Rest',
  last_active_qm_id UUID,
  last_active_qm_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist in case table was partially created
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
  ADD COLUMN IF NOT EXISTS last_active_qm_username TEXT;

-- 2. Ensure RLS policies on public.profiles allow user creation & management
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow delete on profiles" ON public.profiles;

CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow delete on profiles" ON public.profiles FOR DELETE USING (true);

-- 3. Create or Replace the Rock-Solid Auth Trigger Function
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
  -- Extract metadata provided during signup
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Adventurer');
  v_kingdom := COALESCE(new.raw_user_meta_data->>'kingdom', 'The Freeholds of Amtgard');
  v_park := COALESCE(new.raw_user_meta_data->>'park', 'Delver''s Rest');

  -- Insert or update user profile
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

  -- Also initialize their park profile
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
    -- Prevent signup failure even if profile insert has an edge case
    RETURN new;
END;
$$;

-- 4. Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions to authenticated and service_role
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
