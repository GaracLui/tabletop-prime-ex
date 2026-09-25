-- ============================================================================
-- Bonus Round Fixes — parentRound column + renumber existing bonus rounds
-- ============================================================================
--
-- This migration does two things:
--
-- 1. Adds a `parentRound` column to RoundPairing so bonus rounds can be
--    associated with a specific regular round (or 0 for "extra").
--
-- 2. Renumbers existing bonus rounds to use the 1001+ range to avoid
--    collision with regular rounds (1-50). This fixes the 500 error that
--    occurred when bonus rounds occupied round numbers 1, 2, 3... and the
--    organizer tried to generate regular round 1.
--
-- IDEMPOTENT — safe to re-run.
-- ============================================================================

-- Step 1: Add the parentRound column
ALTER TABLE public."RoundPairing"
  ADD COLUMN IF NOT EXISTS "parentRound" INTEGER;

-- Step 2: Renumber existing bonus rounds to the 1001+ range.
-- This is a one-time fix for events that already have bonus rounds at
-- low round numbers (1, 2, 3...) which collide with regular rounds.
--
-- Strategy: for each event, find all bonus rounds (isBonus = true) ordered
-- by round ASC, and renumber them starting at 1001.
--
-- We use a CTE with row_number() to compute the new round numbers, then
-- update in a single statement.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT "eventId"
    FROM public."RoundPairing"
    WHERE "isBonus" = true
  LOOP
    -- For each event with bonus rounds, renumber them to 1001+
    UPDATE public."RoundPairing" rp
    SET "round" = 1000 + new_num
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY round ASC) AS new_num
      FROM public."RoundPairing"
      WHERE "eventId" = r."eventId" AND "isBonus" = true
    ) sub
    WHERE rp.id = sub.id
      AND rp.round < 1000;  -- Only renumber if currently in the regular range
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Verification (run after applying):
-- ----------------------------------------------------------------------------
-- -- Check that no bonus rounds have round < 1000:
-- SELECT "eventId", round, "isBonus", label
-- FROM public."RoundPairing"
-- WHERE "isBonus" = true AND round < 1000;
-- -- Expected: 0 rows
--
-- -- Check the new column:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'RoundPairing'
--   AND column_name = 'parentRound';
-- -- Expected: 1 row, data_type = 'integer', is_nullable = 'YES'
