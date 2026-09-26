# TableTop Prime — Code Audit

**Date:** September 2026 · **Scope:** full codebase (30 API routes, auth stack, pairing/scoring engines, Prisma schema + RLS, frontend, configs, scripts, git history) · **Emphasis:** security/auth + code quality
**Baseline verified during audit:** 382/382 tests pass · `npx tsc --noEmit` clean for `src/` · `npx eslint src/` 0 errors / 8 warnings (all "unused eslint-disable" noise) · i18n parity 804/804 keys
**Method:** every API route read in full against its handler verbs; auth helpers, proxy, Supabase clients, RLS SQL, edge function, and git history reviewed; claims below include file:line evidence. Live-DB state (actual RLS enablement) could not be queried from the repo — flagged where relevant.

---

## 0. Executive summary

The core is in good shape: authorization scaffolding is present on **all 30 API routes** (verified handler-by-handler), IDOR prevention via compound-unique scoped queries is real and documented, the Prisma schema is properly indexed and constrained, the engines are pure, deterministic, and well-tested (253 + 68 tests), and there are thoughtful touches most codebases miss (CSV formula-injection protection, NaN-scrubbed scoring rules, CSPRNG event codes, HSTS preload).

But the audit found **1 visible production bug, 3 genuine authorization gaps, a database exposure surface that is larger than the code comments believe, and a set of process landmines** (`ignoreBuildErrors: true`, git-tracked `.env`, dead modules with the exact type errors that the ignored build would have caught).

Severity counts: **3 High · 8 Medium · 6 Low** (plus quality items).

| # | Severity | Finding | Fix effort |
|---|----------|---------|-----------|
| S1 | High | RLS: no `ENABLE ROW LEVEL SECURITY` in repo; anon `USING (true)` policies expose 5 tables via PostgREST with zero legitimate consumers | 0.5–1 d |
| S3 | High | Scores API authz gap — fail-open when player has no Player row or round has no pairing | 1 h |
| C1 | High | `typescript.ignoreBuildErrors: true` + `reactStrictMode: false` in production build | 1 h |
| S2 | Med | `delete-expired-accounts` edge function: no request auth; duplicate of pg_cron SQL | 1 h |
| S4 | Med | Any participant can toggle any player's `checkedIn`/`ready` (sabotage vector) | 30 min |
| S5 | Med | `.env` is git-tracked; history contains real project URL + publishable key | 30 min |
| C2 | Med | Untyped API boundary: ~174 `any`, no request validation (no zod) anywhere | 3–5 d |
| C6 | Med | `landing.ctaDemo` missing from en/es.json → homepage hero CTA renders the literal key | 10 min |
| C7 | Med | Zero tests on API routes / authz logic (all 382 tests are pure-function) | 3–5 d |
| S6 | Med | Judge-call ack/resolve allowed for any participant (API contradicts its own RLS) | 30 min |
| S7 | Med | No app-level rate limiting (password change = online verification loop) | 0.5 d |
| S8 | Med | Every event is public at creation (code generated at create, no visibility flag) | 1–2 d |
| S9 | Low | Misc security items (template IDOR-lite, sync-profile race, deletion-flag inconsistency) | 0.5 d |
| C3 | Med | Dead 171-line duplicate auth module (`supabase/clients.ts` — zero importers) | 15 min |
| C4 | Med | `requireX()` helpers exist but 23 routes hand-roll the same pattern; union-return footgun | 1–2 d |
| C5 | Med | Dead code: `examples/`, `scripts/seed-user.ts`, `legal-view.tsx`, `db/custom.db`, 170 unused i18n keys | 1 h |
| C8 | Low | Misc quality items (dup blocks, unused eager loads, O(n) BGG scan, boolean coercion) | 1 d |

---

## 1. Security findings

### S1 · HIGH — RLS: the "second layer of security" doesn't cover the app, and the anon policies are pure attack surface

**Evidence**
- `supabase/migrations/rls-policies.sql` creates ~30 policies but contains **no `ALTER TABLE … ENABLE ROW LEVEL SECURITY` statement** — grep across all SQL files returns nothing. Policies without RLS enabled are inert. (Possibly enabled manually in the dashboard; not reproducible from the repo.)
- `src/lib/db.ts` + `.env` history: Prisma connects as `postgres.bjotgfuumjelvugzutwr` — the **table-owner/superuser role, which bypasses RLS entirely**. So even with RLS enabled, none of the app's own queries are ever guarded by it. The comments in `src/app/api/templates/route.ts:22` ("RLS also enforces this at the DB layer") and `rls-policies.sql:6-8` ("Even if an API route has a bug … the database itself will reject the query") describe protection that does not exist on the actual data path. Your API routes are the *only* effective authz layer.
- `rls-policies.sql:465-487` grants `TO anon` `SELECT … USING (true)` on **Player, RoundPairing, TableScore, PlacementScore, JudgeCall**, and effectively all Events (`USING ("eventCode" IS NOT NULL)` — and `events/route.ts:122` generates a code at creation, so that's every event). Via Supabase's auto-exposed PostgREST (`https://<ref>.supabase.co/rest/v1/<Table>`), **anyone holding the public publishable key — which ships in every page's JS — can dump all rows of these tables across all events**: player `userId`s, score `submittedBy`/`confirmedBy`, and JudgeCall free-text `message` fields included.
- These anon policies have **zero legitimate consumers**: the public share page fetches the app's own `/api/public/[eventCode]` (`src/app/share/[eventCode]/page.tsx:189`), which goes through Prisma, not anon REST. They exist only as attack surface.

**Fix**
1. Verify live state: `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('User','Event','Player','RoundPairing','RoundConfig','TableScore','PlacementScore','EventTemplate','JudgeCall','EventParticipant');`
2. Add explicit `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (and `FORCE` where appropriate) to the migration so the repo is the source of truth.
3. **Drop the six `TO anon` policies.** Nothing uses anon REST; `/api/public` is the public surface and it doesn't need them.
4. Either accept that Prisma-as-`postgres` is the security boundary (fine — but fix the comments), or connect Prisma as a dedicated role with `GRANT` + RLS if you want real DB-layer defense in depth.

### S2 · MEDIUM — `delete-expired-accounts` edge function is an unauthenticated admin endpoint (and a duplicate)

**Evidence**
- `supabase/functions/delete-expired-accounts/index.ts:57` — `Deno.serve(async (_req: Request) => …)` ignores the request entirely: no JWT verification, no service-role check. The setup comment at the top literally schedules it with `'Authorization', 'Bearer YOUR-ANON-KEY'` — i.e., the *public* key. Anyone can trigger it at will.
- Mitigating: it only processes users whose `deletionRequestedAt` is already >30 days old, so premature wipes aren't possible — but it can be spammed, and it performs admin deletes (auth.users deletion) on an unauthenticated trigger.
- It is also a **duplicate** of `supabase/migrations/delete-expired-accounts.sql` (same job as a pg_cron SQL function). Two implementations, two setup paths, one truth — the SQL version is referenced by `fix-security-lints.sql` as the one whose EXECUTE was locked down.

**Fix:** delete the edge function, keep the pg_cron SQL function, and update the setup docs.

### S3 · HIGH — Scores API fails open: participants without a Player row (or scoring an unp paired round) can write any table's score

**Evidence** — `src/app/api/events/[eventId]/scores/route.ts:86-113`
```ts
if (!isStaff) {
  const playerRow = await db.player.findFirst({ where: { eventId, userId }, ... })
  if (playerRow) {                       // ← gap 1: no Player row → block skipped entirely
    const currentPairing = await db.roundPairing.findFirst({ where: { eventId, round }, ... })
    if (currentPairing) {                // ← gap 2: round not paired → block skipped entirely
      ... if (!myTable || myTable.tableNumber !== tableNumber) return 403
```
A user who joined as a participant (`EventParticipant` row exists, so line 68 passes) but has no linked `Player` row — or who targets a round with no pairing yet (bonus rounds, future rounds) — passes the "own table only" check vacuously. They can then run `action: 'update'` against any `LOCKED` score, which flips it to `DISPUTED` (line 165-171) with attacker-controlled placements — and `DISPUTED` counts toward standings everywhere (`state: { in: ['LOCKED','DISPUTED'] }` in pairings, standings, export, public APIs). That's a standings-integrity attack on the core product.

Secondary: even for a properly seated player, `placements` content is never validated against the table's actual seated `playerIds` — the tableNumber is checked, not the payload.

**Fix:** fail closed — `if (!isStaff && (!playerRow || !currentPairing)) return 403`. Then validate `placements[].playerId` ⊆ `myTable.playerIds` for non-staff. ~15 lines + tests.

### S4 · MEDIUM — Any participant can toggle any player's check-in / ready flags

**Evidence** — `src/app/api/events/[eventId]/players/[playerId]/route.ts:22-25`: PATCH requires only `participant` (any role) and never checks that the `Player` row belongs to the caller (`player.userId === profile.id`). A PLAYER can un-check-in a competitor moments before pairing generation (`pairings/route.ts:148` filters `p.checkedIn`), silently excluding them from the round — a clean sabotage vector at a tournament. Also no boolean coercion: `body.checkedIn` can be any truthy value (line 30).

**Fix:** either organizer-only, or allow self-service only when `player.userId === profile.id`; coerce with `=== true`.

### S5 · MEDIUM — `.env` is tracked in git; history holds a real project ref + publishable key

**Evidence** — `git ls-files` lists `.env`. History (commit `2ae3c0f`) contains the real Supabase URL `https://bjotgfuumjelvugzutwr.supabase.co` and `sb_publishable_j_AdBowb3U4hTrhB7VtMqQ_…`. The publishable key is public-by-design and the DATABASE_URL carried a `[YOUR-PASSWORD]` placeholder, so **no secret is actually burned** — but the process is the risk: the next real credential that lands in `.env` gets committed automatically. (The repo also carries the legacy `NEXTAUTH_SECRET=…dev-secret…` in older commits; irrelevant now that next-auth is gone.)

**Fix:** `git rm --cached .env`, commit a `.env.example`, and consider the Supabase project ref mildly exposed (it's in client JS anyway — acceptable).

### S6 · MEDIUM — Judge-call acknowledge/resolve is allowed for any participant

**Evidence** — `src/app/api/events/[eventId]/judge-calls/[callId]/route.ts:20-23` checks `participant` only. Any player can resolve/acknowledge *other tables'* calls. This directly contradicts the DB policy (`rls-policies.sql:397-412`: UPDATE restricted to ORGANIZER/JUDGE) — one of the two layers is wrong, and it's the one that actually runs.

**Fix:** restrict ack/resolve to staff (or allow the caller to resolve only their own call).

### S7 · MEDIUM — No app-level rate limiting on any endpoint

**Evidence** — no rate limiter exists in the repo. Most sensitive: `/api/account/password` verifies `currentPassword` via `signInWithPassword` (`account/password/route.ts:40`) — an online verification loop. Supabase applies its own auth rate limits, which blunts this, but every other endpoint (event lookup, join-by-eventId, BGG search, score submission) is unthrottled.

**Fix:** `@upstash/rate-limit` (or Vercel WAF rules) on `/api/account/*`, `/api/participants`, `/api/bgg`, `/api/events/lookup`.

### S8 · MEDIUM — Every event is publicly shareable from creation, including DRAFTs

**Evidence** — `events/route.ts:122` generates `eventCode` at creation; `/api/public/[eventCode]` and `/share/[code]` serve **any** event with a code, with no status filter and no visibility flag; `publish/route.ts:28` is a no-op when a code already exists (it always does). Codes are 40-bit CSPRNG (`event-code.ts`), so enumeration is infeasible — but anyone who ever captures a code (screenshot, shared link, referrer) can watch a DRAFT event's roster and standings forever, and there is no organizer-facing "unshare" control.

**Fix:** add a `visibility`/`isPublic` column (default private, set on publish), gate `/api/public` on it, and make publish/unpublish real state transitions.

### S9 · LOW — Assorted

1. **Template IDOR-lite** — `events/route.ts:95` loads any `templateId` without the ownership filter that `templates/route.ts:23-31` (GET) and `templates/[templateId]` (DELETE) enforce. Impact ~nil (templates are globally readable by design), but it's inconsistent.
2. **`sync-profile` first-login race** — `supabase/server.ts:61-72`: two concurrent first-login calls both miss `findUnique`, both `create` → unique violation → one 500. Should be an upsert. Also `user.email!` assumes non-null email.
3. **Deletion-flag enforcement is narrower than documented** — `account/delete/route.ts:6` claims "write operations are blocked across all routes that check this flag," but only `account/password` and `account PATCH` check it. A deletion-pending user can still create events, join events, submit scores. Given the privacy policy's 30-day-deletion promise, tighten or reword.
4. **`publish/route.ts:34-39`** — after 5 collision attempts it proceeds with the colliding code → guaranteed unique-constraint 500 (astronomically unlikely, but the loop should `return 503`).
5. **No CSP header** — `next.config.ts` has a good header set (HSTS preload, XFO DENY, nosniff, referrer, permissions-policy); CSP absent. Understandable with AdSense, but a nonce-based CSP for app origin is worth planning.
6. **`auth/callback`** redirects to `requestUrl.origin` — fine on Vercel, spoofable only if a Host-header-trusting proxy sits in front; note only.

---

## 2. Code quality findings

### C1 · HIGH — Production build skips type checking

`next.config.ts:33` `typescript: { ignoreBuildErrors: true }` and line 35 `reactStrictMode: false`. Today `src/` typechecks clean, so this flag buys nothing and silently ships future type breakages. It exists almost certainly because of legacy files that *do* fail `tsc` (see C5) — the flag is treating the symptom. Remove the flag, delete the dead files, and let the build gate types again.

### C2 · MEDIUM — The API boundary is untyped end-to-end

- `src/hooks/use-event-data.ts:43-48`: `scoringRules: any; pairings: any[]; scores: any[]; roundConfigs: any[]` — the main data hook treats half the domain as `any`.
- `src/lib/serialize.ts:52`: `serializeEvent(event: any): any` — the server side is equally opaque.
- Routes build `updateData: any` (`events/[eventId]/route.ts:80`, `players/[playerId]/route.ts:29`, `account/route.ts:52`).
- No request validation library anywhere — 30 routes hand-roll `typeof` checks with varying rigor (contrast `events/[eventId]/route.ts` (good: status whitelist, range checks, NaN scrub) with `events/route.ts:117-119` (none: `minPlayersPerTable: -3` or `totalRounds: -5` persist happily)).
- ~174 `any` instances total; `pairings-tab.tsx` alone has 47.

**Fix:** define response DTOs in `src/lib/types` (they half-exist as `ApiEvent`), type `serializeEvent`, and add zod schemas for request bodies — start with the three highest-risk bodies (`scores` POST, `events` POST/PATCH, `round-configs` PUT). 3–5 days, transformative.

### C3 · MEDIUM — Dead 171-line near-duplicate of the auth module

`src/lib/supabase/clients.ts` duplicates `createServerClient`, `getAuthProfile`, `getOrCreateAuthProfile`, `requireAuth/Participant/Organizer` from `server.ts` (~95% identical) and has **zero importers** (verified). A security-relevant module existing twice is how the "fix one, forget the other" class of bug happens. Delete it.

### C4 · MEDIUM — `requireX()` helpers: good design, 12% adoption, footgun return type

3 route files use `requireOrganizer/requireParticipant` (participants, players, round-configs); the other 23 hand-roll the identical `getAuthProfile → findUnique → role check` sequence — that's ~20 copies of authz logic where a missed `role !== 'ORGANIZER'` is a silent hole (S4 is exactly this shape). The helper's return type (`participant | NextResponse`, caller must `instanceof NextResponse`) is also easy to forget. Consolidate: make the helpers throw (or return a discriminated union `{ ok, value }`), route all 30 routes through them, and the next S4 becomes structurally impossible.

### C5 · MEDIUM — Dead code inventory

| Path | Problem |
|---|---|
| `examples/websocket/*` (333 lines) | imports `socket.io` (uninstalled) — fails `tsc` |
| `scripts/seed-user.ts` | imports deleted `@/lib/auth/password` — fails `tsc` |
| `src/components/views/legal-view.tsx` | imported nowhere (10 of the 11 missing i18n keys live here) |
| `db/custom.db` + repo `.env` | SQLite leftovers; schema is `postgresql` — the tracked `.env` points at a DB that can't run this app |
| `supabase/functions/delete-expired-accounts/` | duplicate of the pg_cron SQL path (see S2) |
| 170 unused i18n keys | reported by `scripts/i18n-check.mjs` (it only prints them) |

Deleting all of the above also eliminates the two `tsc` failure clusters that presumably motivated `ignoreBuildErrors` (C1).

### C6 · MEDIUM — Live production bug: homepage hero CTA renders the literal string `landing.ctaDemo`

`src/components/views/landing-view.tsx:136` calls `t('landing.ctaDemo')`; the key exists in **neither** `en.json` nor `es.json`, and `translate()` (`src/lib/i18n.ts:45`) falls back to the raw key. So the secondary hero CTA on `tabletopprime.com` displays `landing.ctaDemo` to every visitor. `scripts/i18n-check.mjs` already reports it under "MISSING (11)" but **exits 0** — the check runs green while shipping a broken homepage. Add the key to both files (10 minutes), then make `i18n-check.mjs` exit non-zero on MISSING keys used outside dead files.

### C7 · MEDIUM — Zero tests on the layer that holds all the security logic

All 382 tests are pure-function tests (engine, format, schedule, event-code, bgg). The 30 API routes — where every authz decision lives and where S3/S4/S6 were found — have no tests at all. A small route-level test suite (mock `getAuthProfile` + a test DB or vi mocks) covering the authz matrix (anon / PLAYER / JUDGE / ORGANIZER × representative endpoints) would have caught S3 and S4 at commit time. 3–5 days for a meaningful matrix; start with `scores`, `players/[playerId]`, `judge-calls/[callId]`.

### C8 · LOW — Assorted

1. `pairings/route.ts:196-214` vs `287-305` — the generate/regenerate strategy-invocation blocks are near-duplicates (~40 lines); extract one helper.
2. `pairings/[round]/route.ts:51` — `include: { pairings: true, scores: true }` loads every score with placements, then never uses `scores` (only `pairings`); wasted payload on every call.
3. `bgg/route.ts:29` — `readFileSync` of a 2.8 MB JSON on cold start; fine, but consider a prebuilt index if search latency ever matters. Substring scan is O(48k)/request — acceptable.
4. `pairings/route.ts:204` — `(rc?.seatRotation as any)`; type it properly.
5. Judge-call POST accepts arbitrary `category` strings (no enum validation).
6. `events/[eventId]/route.ts:125-126` — `min/maxPlayersPerTable` pass through unvalidated (negative/absurd values persist; Prisma rejects non-Int with an unhelpful 500).

---

## 3. What's notably good

Worth keeping and copying forward:

- **Authz scaffolding present on 100% of routes** — every handler in all 30 route files authenticates and checks participant/role. The gaps found (S3/S4/S6) are logic errors *inside* correct scaffolding, not missing scaffolding.
- **IDOR discipline** — scoped compound-unique `where` clauses (`id_eventId`, `id_eventId` on JudgeCall) with P2025 → 404 mapping, documented in-code (`players/[playerId]/route.ts:33-38`).
- **CSV formula-injection protection** (`export/route.ts:22-33`) — rare to see.
- **Prisma schema** — every hot path indexed; uniques match invariants (`eventId+round`, `eventId+round+tableNumber`, `userId+eventId`); cascades correct; compound uniques double as IDOR guards.
- **Security headers** — HSTS preload, XFO DENY, nosniff, strict referrer, permissions-policy.
- **Event codes** — CSPRNG, 40-bit suffix, no-confusable charset, collision loop.
- **Engines** — pure functions, deterministic RNG (mulberry32), time-budgeted search, `__internals` export for tests; 321 engine tests is genuine coverage.
- **Input hardening where it matters most** — scoringRules NaN scrub + status whitelist on event PATCH.
- **No TODO/FIXME debt, lint clean, no secrets in client code, no `dangerouslySetInnerHTML` on user data** (banner SVG is self-generated; JSON-LD is static).

---

## 4. Fix roadmap (priority order)

### P0 — Now (half a day total, includes two production-visible items)
| Item | Action | Effort |
|---|---|---|
| C6 | Add `landing.ctaDemo` to en.json + es.json; make `i18n-check.mjs` fail on MISSING | 10 min |
| S3 | Fail-closed scores authz (`!playerRow || !currentPairing` → 403); validate placements ⊆ table | 1 h |
| S4 | Restrict player PATCH to self or organizer; boolean coercion | 30 min |
| S5 | `git rm --cached .env` + `.env.example` | 30 min |
| C5 | Delete `examples/`, `scripts/seed-user.ts`, `legal-view.tsx`, `db/custom.db`, `supabase/functions/delete-expired-accounts/` (S2) | 30 min |
| C1 | Remove `ignoreBuildErrors` + restore `reactStrictMode` (unblocked by the deletions above); verify `next build` passes | 30 min |

### P1 — This week (harden the DB story)
| Item | Action | Effort |
|---|---|---|
| S1 | Verify live RLS state; add `ENABLE ROW LEVEL SECURITY` to migrations; **drop the six `TO anon` policies**; correct the false "RLS enforces this" comments | 0.5–1 d |
| S6 | Judge-call ack/resolve → staff-only | 30 min |
| C3/C4 | Delete `clients.ts`; consolidate routes on throwing `requireX()` helpers | 1–2 d |
| S9.3 | Make `deletionRequestedAt` enforcement match its documentation (or fix the doc) | 1 h |

### P2 — Next 2–4 weeks (structural)
| Item | Action | Effort |
|---|---|---|
| C7 | Authz-matrix tests for the API layer (start: scores, players, judge-calls) | 3–5 d |
| C2 | zod request schemas for the 5 riskiest bodies; type `serializeEvent` + `ApiEvent` fully | 3–5 d |
| S7 | Rate limiting on auth-sensitive + public endpoints | 0.5 d |
| S9.1/6, C8.6 | Input-validation sweep (numeric ranges, enums, booleans) | 0.5–1 d |

### P3 — Backlog
- S8: event visibility flag (private by default, publish to share) — product decision + small migration.
- C8.1/2: pairings route dedup; drop unused eager load.
- i18n: purge 170 unused keys; wire `i18n-check` into CI as a blocker.
- CSP planning (nonce-based, AdSense-aware).
- Consider Prisma-as-dedicated-role if you want real DB-layer defense in depth (S1, option B).

---

*Audit performed on repository state as of this commit. All file:line references verified against the working tree; test/lint/typecheck claims re-executed during the audit.*
