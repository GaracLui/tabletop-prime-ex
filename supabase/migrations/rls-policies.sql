-- ============================================================================
-- Row Level Security (RLS) Policies — TableTop Prime
-- ============================================================================
--
-- IMPORTANT — what RLS does and does NOT protect here (S1):
--
--   The app's own data path is Prisma, connecting as the `postgres`
--   table-owner role. Table owners are NOT subject to RLS (unless FORCE
--   is used), so **none of the app's queries are guarded by these
--   policies**. Our API routes are the ONLY effective authorization layer
--   for the app's own queries — do not rely on RLS as a safety net for a
--   buggy route handler.
--
--   What these policies DO protect is the Supabase-exposed PostgREST
--   surface (https://<ref>.supabase.co/rest/v1/...), which authenticates
--   with the anon key / user JWTs as the `anon` / `authenticated` roles.
--   That is why:
--     * ENABLE ROW LEVEL SECURITY statements below are mandatory —
--       policies without RLS enabled on the table are inert decoration;
--     * the former `TO anon` SELECT policies were DROPPED — they granted
--       anyone with the public anon key a full dump of Player,
--       RoundPairing, TableScore, PlacementScore, JudgeCall (and every
--       Event via its eventCode) across ALL events, with zero legitimate
--       consumers (the public share page goes through /api/public, i.e.
--       Prisma, not anon REST).
--
--   FORCE ROW LEVEL SECURITY is deliberately NOT used: Prisma connects as
--   the table owner and has no policies TO it — forcing RLS would make
--   every app query return zero rows. (If you later want true DB-layer
--   defense in depth, connect Prisma as a dedicated role with explicit
--   GRANTs + policies — see AUDIT.md S1 option B.)
--
-- Design principles (from Supabase RLS best practices):
--   1. Use PERMISSIVE policies (not RESTRICTIVE) — additive, not blocking
--   2. Use auth.uid() wrapped in (select auth.uid()) for performance
--   3. Separate into 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
--   4. Always specify TO authenticated (never TO anon — see above)
--   5. SELECT → USING only, INSERT → WITH CHECK only, UPDATE → both,
--      DELETE → USING only
--
-- Our app's authorization model:
--   - User has a Prisma User row linked via supabaseAuthId = auth.users.id
--   - EventParticipant links User to Event with a role (ORGANIZER/JUDGE/PLAYER)
--   - API routes check authorization in code; RLS guards only the
--     PostgREST surface (authenticated-role access), not the app itself
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (one time setup).
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (S1)
-- ============================================================================
-- Policies are inert unless RLS is enabled on the table. The original
-- version of this file created ~30 policies but never enabled RLS — the
-- live DB may have had it enabled manually in the dashboard; this makes
-- the repo the source of truth. ALTER TABLE ... ENABLE is idempotent.
--
-- FORCE ROW LEVEL SECURITY is intentionally omitted: Prisma connects as
-- the table owner (`postgres`), which has no policies TO it — FORCE would
-- break every app query. See the header comment above.
-- ============================================================================

ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoundPairing"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoundConfig"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TableScore"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlacementScore"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JudgeCall"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventTemplate"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's Prisma User ID from their Supabase auth UID
-- This avoids expensive joins in every policy.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM "User" WHERE "supabaseAuthId" = (select auth.uid())::text LIMIT 1;
$$;

-- ============================================================================
-- User table — users can read/update their own profile
-- ============================================================================

CREATE POLICY "Users can read their own profile"
  ON "User" FOR SELECT TO authenticated
  USING ( id = (select public.current_user_id()) );

CREATE POLICY "Users can update their own profile"
  ON "User" FOR UPDATE TO authenticated
  USING ( id = (select public.current_user_id()) )
  WITH CHECK ( id = (select public.current_user_id()) );

-- No INSERT via RLS — users are created by the sync-profile API route
-- No DELETE via RLS — deletion is handled by the pg_cron function

-- ============================================================================
-- Event table — participants can read events they're in, organizers can modify
-- ============================================================================

CREATE POLICY "Participants can read their events"
  ON "Event" FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can update their events"
  ON "Event" FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    id IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete their events"
  ON "Event" FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- No INSERT via RLS — events are created by the API route (which sets organizerId)

-- ============================================================================
-- EventParticipant — users can read participants of their events,
-- organizers can manage them
-- ============================================================================

CREATE POLICY "Participants can read event participants"
  ON "EventParticipant" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant" ep2
      WHERE ep2."userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Users can create their own participation"
  ON "EventParticipant" FOR INSERT TO authenticated
  WITH CHECK ( "userId" = (select public.current_user_id()) );

CREATE POLICY "Organizers can manage event participants"
  ON "EventParticipant" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant" ep2
      WHERE ep2."userId" = (select public.current_user_id()) AND ep2.role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant" ep2
      WHERE ep2."userId" = (select public.current_user_id()) AND ep2.role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete event participants"
  ON "EventParticipant" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant" ep2
      WHERE ep2."userId" = (select public.current_user_id()) AND ep2.role = 'ORGANIZER'
    )
  );

CREATE POLICY "Users can delete their own participation"
  ON "EventParticipant" FOR DELETE TO authenticated
  USING ( "userId" = (select public.current_user_id()) );

-- ============================================================================
-- Player — participants can read players in their events,
-- organizers can create/update/delete
-- ============================================================================

CREATE POLICY "Participants can read event players"
  ON "Player" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can create players"
  ON "Player" FOR INSERT TO authenticated
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can update players"
  ON "Player" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete players"
  ON "Player" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- RoundPairing — participants can read, organizers can create/update/delete
-- ============================================================================

CREATE POLICY "Participants can read pairings"
  ON "RoundPairing" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can create pairings"
  ON "RoundPairing" FOR INSERT TO authenticated
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can update pairings"
  ON "RoundPairing" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete pairings"
  ON "RoundPairing" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- RoundConfig — same pattern as RoundPairing
-- ============================================================================

CREATE POLICY "Participants can read round configs"
  ON "RoundConfig" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can create round configs"
  ON "RoundConfig" FOR INSERT TO authenticated
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can update round configs"
  ON "RoundConfig" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete round configs"
  ON "RoundConfig" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- TableScore — participants can read, organizers can create/update/delete
-- ============================================================================

CREATE POLICY "Participants can read table scores"
  ON "TableScore" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can create table scores"
  ON "TableScore" FOR INSERT TO authenticated
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can update table scores"
  ON "TableScore" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete table scores"
  ON "TableScore" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- PlacementScore — participants can read, organizers can create/update/delete
-- ============================================================================

CREATE POLICY "Participants can read placement scores"
  ON "PlacementScore" FOR SELECT TO authenticated
  USING (
    "tableScoreId" IN (
      SELECT ts.id FROM "TableScore" ts
      JOIN "EventParticipant" ep ON ep."eventId" = ts."eventId"
      WHERE ep."userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers can create placement scores"
  ON "PlacementScore" FOR INSERT TO authenticated
  WITH CHECK (
    "tableScoreId" IN (
      SELECT ts.id FROM "TableScore" ts
      JOIN "EventParticipant" ep ON ep."eventId" = ts."eventId"
      WHERE ep."userId" = (select public.current_user_id()) AND ep.role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can update placement scores"
  ON "PlacementScore" FOR UPDATE TO authenticated
  USING (
    "tableScoreId" IN (
      SELECT ts.id FROM "TableScore" ts
      JOIN "EventParticipant" ep ON ep."eventId" = ts."eventId"
      WHERE ep."userId" = (select public.current_user_id()) AND ep.role = 'ORGANIZER'
    )
  )
  WITH CHECK (
    "tableScoreId" IN (
      SELECT ts.id FROM "TableScore" ts
      JOIN "EventParticipant" ep ON ep."eventId" = ts."eventId"
      WHERE ep."userId" = (select public.current_user_id()) AND ep.role = 'ORGANIZER'
    )
  );

CREATE POLICY "Organizers can delete placement scores"
  ON "PlacementScore" FOR DELETE TO authenticated
  USING (
    "tableScoreId" IN (
      SELECT ts.id FROM "TableScore" ts
      JOIN "EventParticipant" ep ON ep."eventId" = ts."eventId"
      WHERE ep."userId" = (select public.current_user_id()) AND ep.role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- JudgeCall — participants can read, participants can create (call judge),
-- organizers/judges can update (acknowledge/resolve)
-- ============================================================================

CREATE POLICY "Participants can read judge calls"
  ON "JudgeCall" FOR SELECT TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Participants can create judge calls"
  ON "JudgeCall" FOR INSERT TO authenticated
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
    )
  );

CREATE POLICY "Organizers and judges can update judge calls"
  ON "JudgeCall" FOR UPDATE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
      AND role IN ('ORGANIZER', 'JUDGE')
    )
  )
  WITH CHECK (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id())
      AND role IN ('ORGANIZER', 'JUDGE')
    )
  );

CREATE POLICY "Organizers can delete judge calls"
  ON "JudgeCall" FOR DELETE TO authenticated
  USING (
    "eventId" IN (
      SELECT "eventId" FROM "EventParticipant"
      WHERE "userId" = (select public.current_user_id()) AND role = 'ORGANIZER'
    )
  );

-- ============================================================================
-- EventTemplate — anyone authenticated can read, anyone can create,
-- creator can delete (templates are global, not per-event)
-- ============================================================================

CREATE POLICY "Anyone can read event templates"
  ON "EventTemplate" FOR SELECT TO authenticated
  USING ( true );

CREATE POLICY "Anyone can create event templates"
  ON "EventTemplate" FOR INSERT TO authenticated
  WITH CHECK ( true );

CREATE POLICY "Anyone can update event templates"
  ON "EventTemplate" FOR UPDATE TO authenticated
  USING ( true )
  WITH CHECK ( true );

CREATE POLICY "Anyone can delete event templates"
  ON "EventTemplate" FOR DELETE TO authenticated
  USING ( true );

-- ============================================================================
-- _prisma_migrations — block all access (internal Prisma table)
-- ============================================================================

CREATE POLICY "Block all access to prisma migrations"
  ON "_prisma_migrations" FOR SELECT TO authenticated
  USING ( false );

-- ============================================================================
-- Public/anon access — REVOKED (S1)
-- ============================================================================
-- The /share/[eventCode] page and /api/public/[eventCode] endpoint do NOT
-- use anon PostgREST — they go through the app's own API (Prisma as table
-- owner, which bypasses RLS). The former six `TO anon` SELECT policies
-- therefore had zero legitimate consumers and were pure attack surface:
-- anyone holding the public publishable key (which ships in every page's
-- JS) could dump all rows of these tables across ALL events via
-- https://<ref>.supabase.co/rest/v1/<Table> — player userIds,
-- submittedBy/confirmedBy, and JudgeCall free-text included.
--
-- Drop them explicitly (IF EXISTS keeps this script re-runnable on DBs
-- that never had them):
-- ============================================================================

DROP POLICY IF EXISTS "Public can read events by code"    ON "Event";
DROP POLICY IF EXISTS "Public can read players"           ON "Player";
DROP POLICY IF EXISTS "Public can read pairings"          ON "RoundPairing";
DROP POLICY IF EXISTS "Public can read table scores"      ON "TableScore";
DROP POLICY IF EXISTS "Public can read placement scores"  ON "PlacementScore";
DROP POLICY IF EXISTS "Public can read judge calls"       ON "JudgeCall";

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- 1) RLS actually enabled on every app table (the check that motivated S1):
--
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('User','Event','Player','RoundPairing','RoundConfig',
--                   'TableScore','PlacementScore','EventTemplate','JudgeCall',
--                   'EventParticipant','_prisma_migrations')
-- ORDER BY relname;
-- → every row must show relrowsecurity = true.
--
-- 2) No anon policies remain:
--
-- SELECT tablename, policyname, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND 'anon' = ANY(roles);
-- → must return zero rows.
--
-- 3) Full policy inventory:
--
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- 4) Check the Supabase Security Advisor — no "RLS Enabled No Policy"
--    warnings for the tables above.
-- ============================================================================
