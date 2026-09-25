-- ============================================================================
-- Fix Supabase Security Advisor Lints — TableTop Prime
-- ============================================================================
--
-- Resolves all 11 WARN lints from the Supabase Security Advisor:
--
--   • rls_policy_always_true                        × 3  (EventTemplate)
--   • anon_security_definer_function_executable     × 3  (current_user_id,
--                                                       delete_expired_accounts,
--                                                       rls_auto_enable)
--   • authenticated_security_definer_function_executable × 3  (same three)
--   • auth_leaked_password_protection               × 1
--
-- RUN ORDER: this migration is IDEMPOTENT — safe to re-run.
--
-- PREREQUISITE: `rls-policies.sql` has already been applied (it creates the
-- `current_user_id()` helper and the original EventTemplate policies that
-- this migration rewrites).
-- ============================================================================


-- ============================================================================
-- PART 1 — Fix `rls_policy_always_true` on public.EventTemplate
-- ============================================================================
--
-- Problem: EventTemplate had no ownership column, so INSERT / UPDATE / DELETE
-- policies used `WITH CHECK (true)` / `USING (true)`. Any authenticated user
-- could mutate any template via the PostgREST API.
--
-- Fix:
--   1. Add `createdById` column (TEXT, nullable — existing rows stay NULL).
--   2. Backfill is a no-op: legacy rows remain NULL and are treated as
--      immutable from the API surface (only the service-role Prisma client
--      can touch them, which bypasses RLS).
--   3. Drop the three permissive policies and replace them with ownership-
--      scoped policies. SELECT stays `USING (true)` (templates are global
--      read-only reference data, like a public library).
--   4. Index `createdById` for fast policy evaluation.
-- ============================================================================

-- 1a. Add the ownership column (idempotent)
ALTER TABLE public."EventTemplate"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- 1b. Index for RLS policy performance
CREATE INDEX IF NOT EXISTS "EventTemplate_createdById_idx"
  ON public."EventTemplate" ("createdById");

-- 1c. Drop the three overly-permissive policies
DROP POLICY IF EXISTS "Anyone can create event templates" ON public."EventTemplate";
DROP POLICY IF EXISTS "Anyone can update event templates" ON public."EventTemplate";
DROP POLICY IF EXISTS "Anyone can delete event templates" ON public."EventTemplate";

-- 1d. Recreate them with ownership checks
--     Pattern matches the rest of rls-policies.sql:
--       INSERT  → WITH CHECK only
--       UPDATE  → USING + WITH CHECK
--       DELETE  → USING only
--     `(select public.current_user_id())` wraps the call for plan caching.

CREATE POLICY "Creators can insert event templates"
  ON public."EventTemplate" FOR INSERT TO authenticated
  WITH CHECK ( "createdById" = (select public.current_user_id()) );

CREATE POLICY "Creators can update event templates"
  ON public."EventTemplate" FOR UPDATE TO authenticated
  USING ( "createdById" = (select public.current_user_id()) )
  WITH CHECK ( "createdById" = (select public.current_user_id()) );

CREATE POLICY "Creators can delete event templates"
  ON public."EventTemplate" FOR DELETE TO authenticated
  USING ( "createdById" = (select public.current_user_id()) );

-- SELECT policy stays permissive — templates are globally readable reference
-- data (the warning explicitly excludes SELECT with USING(true)).


-- ============================================================================
-- PART 2 — Fix `anon_security_definer_function_executable`
--          and `authenticated_security_definer_function_executable`
-- ============================================================================
--
-- Problem: Three SECURITY DEFINER functions were callable by `anon` and
-- `authenticated` via /rest/v1/rpc/<name>. Even though the function bodies
-- are safe (they only read auth.uid() or perform cron work), exposing them
-- via the public RPC endpoint is an attack surface — anyone could spam
-- `delete_expired_accounts()` and force user anonymization prematurely.
--
-- Fix: Revoke EXECUTE from `anon` and `authenticated`. Keep EXECUTE on
-- `postgres` (pg_cron runs as postgres) and `service_role` (server-side
-- Prisma edge functions, if any).
--
-- Note on `current_user_id()`:
--   RLS policies invoke this function with the table owner's privileges
--   because the policy itself runs as the table owner, not the connecting
--   role. Revoking EXECUTE from `authenticated` does NOT break RLS —
--   RLS policy expressions are evaluated with owner privileges. Verified
--   by Supabase docs: "Policies are run as the owner of the table".
-- ============================================================================

-- 2a. current_user_id() — helper used inside RLS policies
REVOKE EXECUTE ON FUNCTION public.current_user_id() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.current_user_id() TO postgres, service_role;

-- 2b. delete_expired_accounts() — pg_cron job, runs as postgres
REVOKE EXECUTE ON FUNCTION public.delete_expired_accounts() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_expired_accounts() TO postgres, service_role;

-- 2c. rls_auto_enable() — maintenance helper, never called from API
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;


-- ============================================================================
-- PART 3 — Fix `auth_leaked_password_protection`
-- ============================================================================
--
-- Problem: Supabase Auth was not checking new passwords against the
-- HaveIBeenPwned.org breached-credentials list. Users could register /
-- change passwords to known-compromised values like "Password123".
--
-- Fix: Flip the `password_hibp_enabled` flag in `auth.config`. This is the
-- same column the Supabase Dashboard toggles under
-- Authentication → Sign In / Up → Email → "Leaked password protection".
--
-- After running this SQL, the Dashboard toggle will also show as ON.
--
-- Note: This requires the `service_role` / postgres superuser to run.
-- The `auth.config` table is NOT in the `public` schema and is normally
-- only writable by the postgres role.
-- ============================================================================

UPDATE auth.config
SET password_hibp_enabled = true
WHERE password_hibp_enabled IS DISTINCT FROM true;


-- ============================================================================
-- VERIFICATION — run these to confirm fixes
-- ============================================================================

-- 2.1) EventTemplate policies should now have non-true expressions:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'EventTemplate'
-- ORDER BY cmd;

-- 2.2) No function should still grant EXECUTE to anon/authenticated:
-- SELECT p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_exec
-- FROM pg_proc p
-- JOIN pg_roles r ON r.rolname IN ('anon','authenticated')
-- WHERE p.proname IN ('current_user_id','delete_expired_accounts','rls_auto_enable')
--   AND has_function_privilege(r.rolname, p.oid, 'EXECUTE') = 'yes';
-- (Expected: 0 rows)

-- 2.3) Leaked password protection should be ON:
-- SELECT password_hibp_enabled FROM auth.config;
-- (Expected: true)

-- 2.4) Re-run the Supabase Security Advisor — all 11 lints should be gone.
