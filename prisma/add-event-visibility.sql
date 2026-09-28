-- TableTop Prime — add Event.visibility column (audit S8)
--
-- Audit S8: "Every event is publicly shareable from creation" — the event
-- code alone (40-bit CSPRNG, but capturable via screenshot/shared link/
-- referrer) used to make every event's roster and standings watchable on
-- /share/[code] and /api/public/[code] forever, with no organizer-facing
-- "unshare" control.
--
-- This migration adds the visibility flag that turns publish/unpublish into
-- real state transitions:
--
--   PRIVATE (default) — /api/public/[code] and /share/[code] return 404.
--                       Join-by-code (/api/events/lookup) is unaffected.
--   PUBLIC            — the share page and public API serve the event.
--
-- Backfill: events that ALREADY have an eventCode were shareable under the
-- old model (their links may be printed on QR codes / posters), so they are
-- grandfathered in as PUBLIC to avoid breaking live links. Events without a
-- code have no public surface to preserve and start PRIVATE.
--
-- The column is NOT NULL with a server default so the backfill is a single
-- statement and Prisma's schema stays in sync.
--
-- Run with:  psql "postgresql://..." -f prisma/add-event-visibility.sql
--    (or apply via prisma db push — this file documents the production SQL)
--
-- Idempotent: guarded with IF NOT EXISTS / DO blocks.

CREATE TYPE "EventVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "visibility" "EventVisibility" NOT NULL DEFAULT 'PRIVATE';

DO $$
BEGIN
  -- Grandfather previously-shareable events: any event that already had a
  -- code was reachable at /share/[code] before this change.
  UPDATE "Event" SET "visibility" = 'PUBLIC' WHERE "eventCode" IS NOT NULL;
END $$;
