-- ============================================================================
-- Account Deletion Automation — Pure SQL + pg_cron
-- ============================================================================
--
-- This script creates a Postgres function that automatically deletes expired
-- account deletion requests (older than 30 days) and anonymizes user data.
--
-- No Edge Function needed — pg_cron runs as the postgres superuser and can
-- access both the public schema (our Prisma tables) and the auth schema
-- (auth.users).
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (one time setup).
-- ============================================================================

-- Step 1: Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create the deletion function
CREATE OR REPLACE FUNCTION public.delete_expired_accounts()
RETURNS TABLE(deleted_count int, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted int := 0;
  v_errors jsonb[] := ARRAY[]::jsonb[];
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT id, "supabaseAuthId", email, "deletionRequestedAt"
    FROM "User"
    WHERE "deletionRequestedAt" IS NOT NULL
      AND "deletionRequestedAt" < NOW() - INTERVAL '30 days'
  LOOP
    BEGIN
      -- 1. Anonymize the User row (remove PII, keep the row for FK integrity)
      UPDATE "User"
      SET email = 'deleted+' || v_record.id || '@local',
          name = NULL,
          "deletionRequestedAt" = NULL
      WHERE id = v_record.id;

      -- 2. Delete EventParticipant rows (user is no longer in any event)
      DELETE FROM "EventParticipant"
      WHERE "userId" = v_record.id;

      -- 3. Null out userId on Player rows (historical scores preserved)
      UPDATE "Player"
      SET "userId" = NULL
      WHERE "userId" = v_record.id;

      -- 4. Null out organizerId on Event rows (events stay accessible)
      UPDATE "Event"
      SET "organizerId" = NULL
      WHERE "organizerId" = v_record.id;

      -- 5. Anonymize the auth.users entry (changes email → locks them out)
      --    This is possible because pg_cron runs as postgres superuser.
      IF v_record."supabaseAuthId" IS NOT NULL THEN
        UPDATE auth.users
        SET email = 'deleted+' || v_record."supabaseAuthId" || '@local',
            encrypted_password = '',
            email_confirmed_at = NULL,
            raw_user_meta_data = '{}'::jsonb
        WHERE id = v_record."supabaseAuthId";
      END IF;

      v_deleted := v_deleted + 1;

      -- Log each deletion
      RAISE LOG 'delete_expired_accounts: anonymized user % (%)', v_record.id, v_record.email;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, jsonb_build_object(
        'userId', v_record.id,
        'error', SQLERRM
      ));
      RAISE WARNING 'delete_expired_accounts: error for user %: %', v_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_deleted, jsonb_build_object(
    'deleted', v_deleted,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$;

-- Step 3: Grant execute to postgres (pg_cron runs as postgres)
GRANT EXECUTE ON FUNCTION public.delete_expired_accounts() TO postgres;

-- Step 4: Schedule it to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'delete-expired-accounts',
  '0 3 * * *',
  $$SELECT * FROM public.delete_expired_accounts();$$
);

-- ============================================================================
-- VERIFICATION QUERIES (run these to check things are working)
-- ============================================================================

-- Check the schedule is set:
-- SELECT * FROM cron.job WHERE jobname = 'delete-expired-accounts';

-- Run the function manually (test):
-- SELECT * FROM public.delete_expired_accounts();

-- Check pending deletions:
-- SELECT id, email, "deletionRequestedAt" FROM "User" WHERE "deletionRequestedAt" IS NOT NULL;

-- Check function logs:
-- Supabase dashboard → Logs → Postgres logs → filter by "delete_expired_accounts"

-- ============================================================================
-- TO UNSCHEDULE (if needed):
-- ============================================================================

-- SELECT cron.unschedule('delete-expired-accounts');

-- ============================================================================
-- TO MANUALLY CANCEL A DELETION REQUEST (before the 30-day window):
-- ============================================================================

-- UPDATE "User" SET "deletionRequestedAt" = NULL WHERE id = 'USER-ID-HERE';

-- ============================================================================
-- WHAT GETS DELETED vs PRESERVED
-- ============================================================================
--
-- DELETED (PII removed):
--   - User email → anonymized to deleted+id@local
--   - User name → set to null
--   - auth.users email → anonymized (can't log in)
--   - auth.users password → cleared
--   - auth.users metadata → cleared
--   - EventParticipant rows → deleted (user leaves all events)
--
-- PRESERVED (historical record):
--   - Player rows → userId nulled, name + scores kept
--   - Event rows → organizerId nulled, event data kept
--   - Scores / placements → kept (tournament results are archival)
--   - Pairings → kept (tournament structure is archival)
--   - JudgeCall rows → kept (judge call history)
--
-- ============================================================================
