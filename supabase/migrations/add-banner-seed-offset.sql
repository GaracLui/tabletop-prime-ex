-- ============================================================================
-- Phase 2 Procedural Banner — bannerSeedOffset column
-- ============================================================================
--
-- Adds an integer column to public."Event" that lets organizers "reroll"
-- their procedurally generated SVG banner. The banner is a pure function
-- of (eventId + bannerSeedOffset), so changing this value produces a
-- different banner without storing any image data.
--
-- Default 0 = use the event ID alone as the seed.
--
-- IDEMPOTENT — safe to re-run.
-- ============================================================================

ALTER TABLE public."Event"
  ADD COLUMN IF NOT EXISTS "bannerSeedOffset" INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- Verification (run after applying):
-- ----------------------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'Event'
--   AND column_name = 'bannerSeedOffset';
-- Expected: 1 row, data_type = 'integer', is_nullable = 'NO',
--           column_default = '0'
