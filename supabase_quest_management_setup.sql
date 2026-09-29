-- ==============================================================================
-- QUEST-FORGE: Quest Management & Deletion RLS Security Policies
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all quest-related tables
ALTER TABLE IF EXISTS public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quest_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.queue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.encounter_monsters ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent naming collisions
DROP POLICY IF EXISTS "Allow select on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow insert on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow update on quests" ON public.quests;
DROP POLICY IF EXISTS "Allow delete on quests" ON public.quests;

DROP POLICY IF EXISTS "Allow select on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow insert on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow update on user_quests" ON public.user_quests;
DROP POLICY IF EXISTS "Allow delete on user_quests" ON public.user_quests;

DROP POLICY IF EXISTS "Allow select on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow insert on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow update on quest_queues" ON public.quest_queues;
DROP POLICY IF EXISTS "Allow delete on quest_queues" ON public.quest_queues;

DROP POLICY IF EXISTS "Allow select on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow insert on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow update on queue_members" ON public.queue_members;
DROP POLICY IF EXISTS "Allow delete on queue_members" ON public.queue_members;

DROP POLICY IF EXISTS "Allow select on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow insert on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow update on encounter_monsters" ON public.encounter_monsters;
DROP POLICY IF EXISTS "Allow delete on encounter_monsters" ON public.encounter_monsters;

-- 3. Quests Table Policies (Full CRUD for Quest Masters / Players)
CREATE POLICY "Allow select on quests" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Allow insert on quests" ON public.quests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on quests" ON public.quests FOR UPDATE USING (true);
CREATE POLICY "Allow delete on quests" ON public.quests FOR DELETE USING (true);

-- 4. User Quests Table Policies
CREATE POLICY "Allow select on user_quests" ON public.user_quests FOR SELECT USING (true);
CREATE POLICY "Allow insert on user_quests" ON public.user_quests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on user_quests" ON public.user_quests FOR UPDATE USING (true);
CREATE POLICY "Allow delete on user_quests" ON public.user_quests FOR DELETE USING (true);

-- 5. Quest Queues Table Policies
CREATE POLICY "Allow select on quest_queues" ON public.quest_queues FOR SELECT USING (true);
CREATE POLICY "Allow insert on quest_queues" ON public.quest_queues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on quest_queues" ON public.quest_queues FOR UPDATE USING (true);
CREATE POLICY "Allow delete on quest_queues" ON public.quest_queues FOR DELETE USING (true);

-- 6. Queue Members Table Policies
CREATE POLICY "Allow select on queue_members" ON public.queue_members FOR SELECT USING (true);
CREATE POLICY "Allow insert on queue_members" ON public.queue_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on queue_members" ON public.queue_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete on queue_members" ON public.queue_members FOR DELETE USING (true);

-- 7. Encounter Monsters Table Policies
CREATE POLICY "Allow select on encounter_monsters" ON public.encounter_monsters FOR SELECT USING (true);
CREATE POLICY "Allow insert on encounter_monsters" ON public.encounter_monsters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on encounter_monsters" ON public.encounter_monsters FOR UPDATE USING (true);
CREATE POLICY "Allow delete on encounter_monsters" ON public.encounter_monsters FOR DELETE USING (true);
