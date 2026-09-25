-- ============================================================================
-- Phase 1 Event Metadata — description + scheduleJson
-- ============================================================================
--
-- Adds two nullable text columns to public."Event":
--   • description  — plain text shown on dashboard + share page (max ~2000 chars,
--                   enforced at the API layer, not the DB)
--   • scheduleJson — JSON-encoded array of { start, end? } where start/end are
--                   ISO 8601 strings WITH offset (e.g. "2026-08-15T14:00:00-03:00").
--                   Stored as TEXT for Prisma simplicity; parsed on read.
--
-- Both columns are nullable so existing events continue to work with zero
-- backfill. The API treats NULL the same as "not set" and the UI hides the
-- corresponding sections.
--
-- IDEMPOTENT — safe to re-run.
-- ============================================================================

ALTER TABLE public."Event"
  ADD COLUMN IF NOT EXISTS "description"  TEXT,
  ADD COLUMN IF NOT EXISTS "scheduleJson" TEXT;

-- ----------------------------------------------------------------------------
-- Verification (run after applying):
-- ----------------------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'Event'
--   AND column_name IN ('description', 'scheduleJson');
-- Expected: 2 rows, both is_nullable = 'YES'
