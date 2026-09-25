-- TableTop Prime — replace RoundFormat.CUSTOM with RoundFormat.ADJACENT_SWISS
--
-- The "Custom" pairing format (a re-skin of Social Golfer) is being removed from
-- the product. It is replaced by "Adjacent Swiss" (bracket-style Swiss): players
-- are grouped strictly by consecutive leaderboard position — Table 1 is always
-- the top table (TFT / MTG Commander finals / poker final-table style).
--
-- Postgres cannot remove a value from an existing enum type, so we recreate it:
--   1. Rename the old type.
--   2. Create the new type with the desired values.
--   3. Migrate both columns that use it (RoundPairing.format, RoundConfig.format),
--      mapping legacy CUSTOM rows to ROUND_ROBIN (CustomStrategy was identical
--      to SocialGolferStrategy, so ROUND_ROBIN preserves existing behavior).
--   4. Drop the old type.
--
-- HOW TO RUN:
--   • Easiest (recommended): use the Node wrapper that reads DATABASE_URL from
--     .env and prints progress:
--         node scripts/migrate-round-format.mjs
--     (For prod: set DATABASE_URL first, then run the same command.)
--
--   • Manual (psql):
--         psql "postgresql://user:pass@host:5432/db" -f prisma/replace-custom-format-with-adjacent-swiss.sql
--     (Note: the `<prod-url>` placeholder shown in older docs was a placeholder —
--      substitute your actual Supabase connection string, not literally `<prod-url>`.)
--
-- Idempotency: if this script is applied to a database that was already
-- migrated (e.g., via db push on a fresh DB), the ALTER TYPE ... RENAME will
-- fail because "RoundFormat_old" already exists or CUSTOM is already gone.
-- Check first with:
--   SELECT enum_range(NULL::"RoundFormat");

BEGIN;

-- 1. Rename old type out of the way.
ALTER TYPE "RoundFormat" RENAME TO "RoundFormat_old";

-- 2. Create the replacement type.
CREATE TYPE "RoundFormat" AS ENUM (
  'ROUND_ROBIN',
  'SWISS',
  'SINGLE_ELIM',
  'ADJACENT_SWISS'
);

-- 3a. RoundPairing.format: drop the existing DEFAULT (it references the old
--     type and can't be auto-cast), change the type, then re-add the default.
ALTER TABLE "RoundPairing" ALTER COLUMN "format" DROP DEFAULT;
ALTER TABLE "RoundPairing"
  ALTER COLUMN "format" TYPE "RoundFormat"
  USING (
    CASE
      WHEN "format"::text = 'CUSTOM' THEN 'ROUND_ROBIN'::"RoundFormat"
      ELSE "format"::text::"RoundFormat"
    END
  );
ALTER TABLE "RoundPairing" ALTER COLUMN "format" SET DEFAULT 'ROUND_ROBIN'::"RoundFormat";

-- 3b. RoundConfig.format: same dance.
ALTER TABLE "RoundConfig" ALTER COLUMN "format" DROP DEFAULT;
ALTER TABLE "RoundConfig"
  ALTER COLUMN "format" TYPE "RoundFormat"
  USING (
    CASE
      WHEN "format"::text = 'CUSTOM' THEN 'ROUND_ROBIN'::"RoundFormat"
      ELSE "format"::text::"RoundFormat"
    END
  );
ALTER TABLE "RoundConfig" ALTER COLUMN "format" SET DEFAULT 'ROUND_ROBIN'::"RoundFormat";

-- 4. Drop the old type.
DROP TYPE "RoundFormat_old";

COMMIT;
