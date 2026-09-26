# TableTop Prime — UI/UX Audit

**Date:** September 2026 · **Scope:** full frontend surface — 93 TSX files: landing/marketing, auth, organizer dashboard (5 tabs), player companion (4 tabs), judge queue, public share pages, stats, account, legal/persona pages, shadcn/ui primitives, i18n system (en/es)
**Method:** four parallel deep-read passes (async/feedback, WCAG 2.1 AA, mobile ergonomics, copy/i18n/consistency) over every view/component, followed by manual verification of every headline claim (file:line re-read) and exact WCAG contrast computation from the design tokens (`oklch → linear sRGB → WCAG luminance`, pipeline validated against the reference gray #767676 = 4.54:1). Read-only — no code was changed.
**Baseline:** post-P0/P1/P2 code-audit tree (commit `cef14f8`). `scripts/i18n-check.mjs`: **805/805 keys, 0 missing, 170 unused (21%)**, 579 keys referenced. The three code-audit contrast assumptions in `globals.css` (muted-foreground tokens) **pass** — measured 5.28:1 light / 7.63:1 dark.

---

## 0. Executive summary

The UI is in materially better shape than a typical MVP of this age: every async surface has *some* feedback convention, toasts cover ~25 mutation sites, icon-only buttons carry localized `aria-label`s with exactly one exception, the i18n discipline is unusually high (10 hardcoded literals across 186 files), and several mobile patterns (viewport/safe-area, PlayerChip truncation, 16px input base, mobile tab Select) show v6-hardening history with in-code rationale.

But the audit found **seven High-severity issues**, and they cluster around a common theme: *the app tells users things that aren't true, and hides from users who don't use a mouse.* Concretely: every async failure in the app renders as an eternal "Loading…" spinner or a lying empty state (there is **no `onError` handler and no `isError` branch anywhere**); three mutations toast success **before/outside** the mutation completing; the core score-state badges (LOCKED/PENDING/DISPUTED — the product's most-repeated UI element) fail WCAG contrast at **2.15:1–2.46:1** where 4.5:1 is required; the one screen keyboard users must operate (open an event) is **mouse-only**; and the most destructive actions in the product (delete template, delete bonus round with its scores, regenerate a round) have **no confirmation at all** while trivial ones use three different confirmation paradigms.

On mobile — the business-critical surface, per the product's own at-table workflow — the fundamentals are right (real mobile nav, table scroll wrappers, column pruning), but the two actions performed most often at a table (check-in toggle, quick-score open) are **24–28 px targets**, dialogs taller than the viewport are **clipped with no scroll path**, and per-input `text-xs` overrides reintroduce **iOS auto-zoom** the base styles deliberately prevented.

Severity counts: **7 High · 12 Medium · 6 Low** (31 findings; several bundle related instances).

| # | Severity | Finding | Fix effort |
|---|----------|---------|-----------|
| U1 | High | Every async failure renders as infinite "Loading…" or a lying empty state — zero `onError`/`isError` handling in the entire data layer | 0.5–1 d |
| U2 | High | False success confirmations: toasts fire synchronously with `.mutate()`, catch-alls swallow failures then toast success | 2–3 h |
| U3 | High | Core state badges fail WCAG contrast: white on `amber-500` **2.15:1**, `emerald-500` **2.46:1**, `rose/blue-500` **3.76:1** (need 4.5:1 at 12 px) | 2–3 h |
| U4 | High | Event cards are mouse-only clickable `<div>`s — keyboard users cannot open any event | 30 min |
| U5 | High | ~25 unnamed form controls in the primary scoring/config forms (`<Label>` without `htmlFor`, placeholder-as-label) — WCAG 4.1.2/3.3.2 | 0.5–1 d |
| U6 | High | Template delete, bonus-round delete (+ its scores), and round regenerate have **no confirmation**; three confirmation paradigms coexist app-wide | 0.5 d |
| U7 | High | Dialogs taller than the viewport are clipped with no scroll path — Create Event / Bulk Add / Bonus Round footers unreachable on phones | 2–4 h |
| U8 | Med | Public share page: one dropped 30 s poll replaces standings with a full-page error card until the next success | 2–3 h |
| U9 | Med | No skeleton loaders — 10+ surfaces collapse to a single pulsing text line (repeated layout jumps on every cold load) | 0.5–1 d |
| U10 | Med | Judge queue gives zero feedback (unused toast var, no pending states); `TOAST_LIMIT = 1` lets rapid toasts clobber each other | 2–3 h |
| U11 | Med | Touch targets below guideline on the core at-table actions: 24 px check-in toggle, 28 px quick-score, 0-gap reorder cluster | 2–3 h |
| U12 | Med | Per-input `text-sm`/`text-xs` overrides reintroduce iOS zoom-on-focus (worst: mobile-only schedule inputs at 12 px) | 1–2 h |
| U13 | Med | Locale persistence desync: `setLocale` writes localStorage only; persona pages + `<html lang>` read a cookie that never updates | 1–2 h |
| U14 | Med | Raw `err.message` surfaced verbatim in 38 toast sites (11 with no fallback) — English server strings / `HTTP 500` shown to Spanish users | 0.5–1 d |
| U15 | Med | Hardcoded English clusters bypass the 805-key i18n system: pricing matrix, share/WhatsApp text, OAuth legal line, error/404 pages, changelog | 0.5 d |
| U16 | Med | Dates formatted in browser locale, not app locale — Spanish UI shows en-US dates (share header, schedules, GDPR dates) | 2–3 h |
| U17 | Med | Ordinal bug: "21th, 22th, 23th" — `ordinalN: "{n}th"` logic duplicated 7× instead of one helper | 1 h |
| U18 | Med | Heading outline broken app-wide: `CardTitle` is a `<div>`; auth page has no `<h1>`; `/stats` jumps h1→h4 | 2–3 h |
| U19 | Med | Async data swaps are never announced to screen readers (share standings, companion confirm-flip, judge live-region writes static text) | 0.5 d |
| U20 | Low | Dead responsive/i18n weight: `use-mobile.ts` has zero consumers; 170 unused keys (21%); ordinal helper ×7 | 2–3 h |
| U21 | Low | Enter-key handlers bypass disabled buttons → double-submit possible on join/create/add-player | 1 h |
| U22 | Low | SPA view swaps never move focus or announce navigation | 1–2 h |
| U23 | Low | Safe-area gaps: toast viewport + cookie bar ignore `env(safe-area-inset-*)`; cookie "dialog" has no focus management | 1–2 h |
| U24 | Low | Terminology drift: "tournament" vs "event", Game Points/Pts/pts, raw enum leaks (`PLAYER`, `DISPUTED`, `FREE`) in copy | 2–3 h |
| U25 | Low | Interaction nits: hover-only "Learn more" invisible on touch, share-button icon-only without `aria-label`, footer nav as buttons | 1–2 h |

---

## 1. Findings

### 1.1 Feedback & async integrity

### U1 · HIGH — Every async failure renders as infinite "Loading…" or a lying empty state

**Evidence**
- `src/hooks/use-event-data.ts` — **zero `onError` handlers** across ~20 mutations and ~10 queries (grep-verified). There is no error UX at the data layer; every call site must remember to handle failures, and most don't.
- `src/components/views/dashboard-view.tsx:44-50` — `if (ctx.isLoading || !event) return <loading>` with **no `isError` branch**. A failed (or 403) `useEvent` shows "Loading event…" **forever**. Same pattern in every tab: `pairings-tab.tsx:131`, `scoring-tab.tsx:83`, `event-details-tab.tsx:113`, `round-config-tab.tsx:51-53`.
- `src/components/views/my-events-view.tsx:356-371` — `(!events || events.length === 0)` renders the "no events yet — create your first!" empty state **on fetch failure**, lying to the user about their data. Same conflation at `standings-tab.tsx:72-78` ("no scores yet" on error) and `companion-view.tsx:202-204`.
- `src/app/page.tsx:57-63` — auth bootstrap failure = full-screen pulse text indefinitely.
- Compounding factor: `src/components/query-provider.tsx:12-18` sets `retry: 1` and `refetchOnWindowFocus: false` globally — after one failed retry, the UI freezes in the wrong state until an unrelated remount.

**Why it matters:** on flaky venue wifi (the exact deployment context), a single dropped request bricks the organizer's dashboard with no retry affordance. The谎言 empty state actively misleads ("my events are gone").

**Fix:** add `isError` branches with a retry button to the five dashboard surfaces and both full-page shells; distinguish `!data && !isError` (empty) from `isError` (error card); optionally set a `QueryClient` default `onError` that toasts, so every mutation gets baseline coverage. `react-query` exposes `isError`/`refetch` on every hook — this is mechanical.

### U2 · HIGH — False success confirmations

**Evidence**
- `src/components/views/dashboard/event-lifecycle-bar.tsx:24-27` — `handle()` calls `updateEvent.mutate({ status: s })` and **immediately** toasts "Status changed". No `await`, no callbacks, no catch: if the PATCH fails, the user sees a green confirmation for a change that never happened. This is the event-lifecycle control (draft → active → finished).
- `src/components/views/dashboard/event-details-tab.tsx:563-567` — promote-all loop: `catch { /* already has a Player row — skip */ }` swallows **every** error class (network, authz, validation), then toasts "{n} confirmed" regardless.
- `src/components/views/companion-view.tsx:103-109` — `await webShare(...)` return value (`'failed'`) ignored — failed share/copy gives zero feedback (while `share-button.tsx:94-128` toasts all three outcomes correctly).
- Contrast: `use-event-data.ts` mutations *do* throw on failure and most call sites do `catch → destructive toast` — the false-confirmations are concentrated where handlers fire toasts outside the try/mutation lifecycle.

**Fix:** fire success toasts from `onSuccess` callbacks or after `mutateAsync` resolves; narrow the promote-all catch to the specific P2002 "already exists" case; propagate the share result.

### U8 · MED — Public share page: one dropped poll = full-page error flicker

**Evidence** — `src/app/share/[eventCode]/page.tsx:197-231` — the 30 s `setInterval(fetchData)` catch does `setError(err.message)`; the render gate `if (error || !data)` then **throws away the previously rendered standings** and shows a full-page "check the code" error card until a later poll succeeds. A single dropped packet makes the public page — the product's face to every guest scanning the QR — blank out. (Also: `setError` is never cleared on subsequent success until `setData` runs, and `loading` is never used to show stale-while-revalidate.)

**Fix:** keep the last good `data` in state; render it with a subtle "updating…" indicator; only show the full-page error when there is no data at all (genuine 404).

### U9 · MED — No skeleton loaders; repeated layout jumps

**Evidence** — the only dimension-stable loader in the app is the QR modal (`src/lib/share/qr-modal.tsx:59`, `h-[280px] w-[280px] bg-muted`). Everywhere else, loading replaces structure with one pulsing line: `my-events-view.tsx:158-164` (entire view incl. header + CTAs), `dashboard-view.tsx:44-50` (banner + lifecycle bar + 5-tab frame), `companion-view.tsx:55-61`, `judge-view.tsx:77-83`, `share page:211-217` (the public page guests see), `standings-tab.tsx:42`, plus per-tab re-flashes (`pairings-tab.tsx:131`, `scoring-tab.tsx:83`, `event-details-tab.tsx:113`). A cold dashboard load produces 4–5 sequential "flash of nothing" jumps.

**Fix:** one `<Skeleton>` primitive (div with `animate-pulse bg-muted rounded`) shaped per surface (card row, table rows, tab frame). Low risk, high perceived-performance gain.

### U10 · MED — Judge queue gives zero feedback; toast limit clobbers

**Evidence**
- `src/components/views/judge-view.tsx:59` — `const { toast: _toast } = useToast()` destructured and **never used**: acknowledge/resolve (`:152-163`) call `updateCall.mutate(...)` with no callbacks, buttons are **not disabled** during the mutation → rapid double-clicks send duplicate PATCHes and failures are invisible. The judge queue is the only mutating surface with neither success nor error feedback.
- `src/hooks/use-toast.ts:11-12` — `TOAST_LIMIT = 1` + `TOAST_REMOVE_DELAY = 1000000` (~16.7 min store retention): a second toast instantly replaces the first (e.g. a success clobbered by a later error in bulk operations); visual dismissal relies on Radix's default 5 s, never configured.

**Fix:** wire `_toast` into ack/resolve with `isPending` disabled states; raise `TOAST_LIMIT` to 2–3 and set an explicit `duration`.

### 1.2 Accessibility (WCAG 2.1 AA)

### U3 · HIGH — Core state badges fail WCAG contrast (computed, not estimated)

**Evidence** — computed from the exact oklch values (Tailwind v4 palette) using WCAG relative luminance; pipeline validated against #767676 = 4.54:1:

| Combo (all at `text-xs` = 12 px, threshold 4.5:1) | Ratio | Verdict |
|---|---|---|
| white on `bg-amber-500` (PENDING_CONFIRM, JUDGE role) | **2.15:1** | FAIL |
| white on `bg-emerald-500` (LOCKED, PLAYER role, ACTIVE) | **2.46:1** | FAIL |
| white on `bg-rose-500` (DISPUTED) | **3.76:1** | FAIL (passes only ≥18.7 px bold) |
| white on `bg-blue-500` (FINISHED) | **3.76:1** | FAIL |
| `muted-foreground/60` on background (error pages) | **2.42:1** | FAIL |

For credit: the design tokens themselves pass — `muted-foreground` measures **5.28:1** light / **7.63:1** dark (the `globals.css:59` comment "darker for WCAG AA" is honest), body text ~19:1, and `destructive` as text just passes at 4.56:1.

The failing combos are the **most-repeated status UI in the product**: score-state badges in `pairings-tab.tsx:438-441,729-733`, `edit-scores-card.tsx:159-163`, `score-tab.tsx:223,267`, `round-status-card.tsx:43`, `share/[eventCode]/page.tsx:273-279`; role badges in `my-events-view.tsx:543-549` and `event-details-tab.tsx:657-662`; judge pending count `judge-view.tsx:112`. That is: **the LOCKED/PENDING/DISPUTED state of every score at every table is rendered below legibility thresholds** — disproportionately affecting the aging-presbyopia demographic that organizes tabletop tournaments, and anyone reading a phone screen in sunlight at a venue.

**Fix:** one token-level change, everywhere at once — stop pairing white text with 500-level backgrounds on small text. Either (a) switch badges to the Tailwind tint pattern (`bg-amber-100 text-amber-900` / dark: `bg-amber-900/40 text-amber-200`), or (b) keep saturated backgrounds but darken text to `-950` and lighten to `-200` in dark mode. Verify with the same computation (target ≥4.5:1).

### U4 · HIGH — Keyboard users cannot open any event

**Evidence** — `src/components/views/my-events-view.tsx:524-529` — the entire event card is `<Card className="cursor-pointer" onClick={onClick} onMouseEnter={handleHover} onFocus={handleHover}>`. No `role`, no `tabIndex`, no key handler; nothing inside the card opens the event either (header = banner/title/badge; body = description/counts). The card is the **only** navigation into the dashboard/companion/judge views (SPA view-swap via `openEvent`, `page.tsx:97-107`). Keyboard and screen-reader users can see their events list but cannot enter any of them — a hard blocker at the app's front door (WCAG 2.1.1 Keyboard).

**Fix:** smallest correct change: put an `onClick`-equivalent on a real button, or make the card a `<button>`/add `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space). Best change: navigate on a real `<Link>`/`<a>` for middle-click/new-tab too.

### U5 · HIGH — ~25 unnamed form controls in the primary scoring/config forms

**Evidence** — the de-facto pattern is a visual `<Label>` (or plain `<span>`) placed next to a control with **no `htmlFor`/`id`/`aria-label`**, so every screen reader announces "combobox" / "edit text" with no name. Worst concentrations — i.e. the forms that decide tournament results:

- `companion/score-tab.tsx:319-341` — the **player score-entry form**: placement Select and game-points Input are placeholder-only. This is the product's core action.
- `dashboard/quick-score-dialog.tsx:178-197` — per-player placement Select + points Input, unnamed; plus `<Label>` wrapping a `<Button>` (`:149-167`) — the implicit label association lands on the wrong control.
- `judge/edit-scores-card.tsx:128-209` and `judge/proxy-score-card.tsx:98-135` — round/table selects, placement, points, note textarea all unnamed.
- `dashboard/round-config-tab.tsx:127-169` — format label + min/max inputs + seat-rotation select.
- `dashboard/scoring-tab.tsx:302-345` — modifier rows: 4 unnamed controls per row (type/label/value/applies-to), spans not labels; placement-points input `:213` labeled by an unassociated span.
- `dashboard/event-details-tab.tsx:414-676` — bulk-add textarea, add-player input (has `aria-invalid` but the duplicate-warning `<p>` at `:449` is not linked via `aria-describedby`, no `role="alert"`), participant search, role selects.
- `bgg-game-picker.tsx:157-159` — the search **submit button is icon-only with no `aria-label`** (the one icon-button gap in the app; the Input next to it is placeholder-only too).
- Bonus-round create dialog `pairings-tab.tsx:832-866` — both Selects and the player search unnamed.

Related: required-field marking is inconsistent (`auth-view.tsx:234,247` uses `required` — good; scoring/create forms don't), and validation lives in toasts (`quick-score-dialog.tsx:77`) rather than `aria-describedby`-linked inline text (WCAG 3.3.1/3.3.2).

**Fix:** mechanical sweep — give each control an `id` + `htmlFor`, or `aria-label` where the visible caption is a span. ~25 controls across 8 files; one sitting. Also link the two inline validation messages (`event-details-tab.tsx:449`, `account-view.tsx:283-299`) with `aria-describedby`.

### U6 · HIGH — Irreversible actions with no confirmation; three paradigms coexist

**Evidence**
- **No confirmation at all:** template delete — `event-details-tab.tsx:741-749`, a small ghost "Delete" button calls `handleDelete(tpl.id)` directly (permanent). Bonus-round delete — `pairings-tab.tsx:703-712`, 28 px icon button, deletes the round **and its scores**, no confirm. Regenerate round — `pairings-tab.tsx:258` → `handleRegenerate`, which per `use-event-data.ts:373-376` "clears any score for affected tables" — one accidental click on a button that sits directly next to "Generate next round".
- **Native `confirm()`** (unstyled, English browser chrome, no destructive styling) for the *most* destructive actions: delete whole event `event-lifecycle-bar.tsx:30`, remove player+scores `event-details-tab.tsx:374`, remove participant `:537`.
- **Proper `AlertDialog`** for exactly two flows: account deletion (`account-view.tsx:370-397` — consequence-first copy, pending-disabled confirm, the gold standard) and tiebreaker re-rank (`scoring-tab.tsx:166-190`).

So the app's confirmation rigor is **inversely correlated with blast radius** in two of three cases, and three paradigms (AlertDialog / native confirm / nothing) coexist for comparable severity. Compounding: `alert-dialog.tsx:127` — `AlertDialogAction` defaults to the *primary* variant, so every consumer must remember to hand-style the destructive confirm.

**Fix:** route all destructive actions through `AlertDialog`; add a `destructive` variant to `AlertDialogAction` once; write consequence-stating copy (entity named + what data disappears). The three no-confirmation actions are the P0 subset.

### U18 · MED — Heading outline is broken app-wide

**Evidence** — `src/components/ui/card.tsx:31-38` — `CardTitle` renders a `<div data-slot="card-title">`, not a heading; every card title in the app (standings, scoring, players, judge queue, templates) is invisible to the heading outline (WCAG 1.3.1). Consequences: `auth-view.tsx:189-191` — the auth screen has **no `<h1>` at all** (its title is a CardTitle); `stats/page.tsx:188` and `global-stats.tsx:111` jump h1→h4; `scoring-tab.tsx:204,234,278,364` and `event-metadata-card.tsx:234,282` use Radix `<Label>` as section headings. For contrast, the marketing/persona/legal pages are exemplary (`landing-view.tsx:105` h1 + `aria-labelledby` sections, `legal-page.tsx:92` breadcrumbs).

**Fix:** give `CardTitle` an `as`/`render` prop (default `<h3>`) or add `role="heading" aria-level={n}`; add an h1 to auth; fix the two h4 skips.

### U19 · MED — Async data swaps are never announced to screen readers

**Evidence** — toasts are the only announcement channel, and they only fire on the *acting* device: when the tablemate confirms a score, the player's companion flips `Entry → Pending → Locked` views silently (`companion/score-tab.tsx:192-209`, WCAG 4.1.3); the public share page replaces standings DOM every 30 s with no `aria-live` (`share page:197-231` — a page explicitly meant to be watched); `judge-view.tsx:70-75,98` has the app's only `aria-live` region but writes a **static** string every change, so new calls are never described (table/category unannounced); `round-status-card.tsx:49-54` progress bar lacks `role="progressbar"`/`aria-valuenow`; search result counts (`event-details-tab.tsx:460,622-624`) appear silently.

**Fix:** one `aria-live="polite"` region per watched surface fed by a one-line summary of what changed (e.g. "Standings updated · round 3"), wired where `setData` already runs. The judge live-region exists — make its text stateful instead of static.

### 1.3 Mobile ergonomics (the at-table surface)

### U7 · HIGH — Dialogs taller than the viewport are clipped, no scroll path

**Evidence** — `src/components/ui/dialog.tsx:63` — `DialogContent` is `fixed top-[50%] w-full max-w-[calc(100%-2rem)] sm:max-w-lg` with **no `max-h` and no `overflow-y-auto`**. Any dialog taller than the viewport clips its bottom — including the footer buttons — with no way to scroll. At-risk flows on a 375×667 phone with keyboard open: **Create Event** (`my-events-view.tsx:218-327` — name + BGG picker + 3 numerics + template + footer), **Bulk Add** (`event-details-tab.tsx:409-431` — `rows={8}` textarea with `autoFocus` → keyboard opens over the centered dialog), **Create Bonus Round** (`pairings-tab.tsx:812-896` — 2 selects + player-search + checkbox list + footer). The good counter-example exists in-repo: `quick-score-dialog.tsx:131-132` scrolls a `max-h-[55vh]` list while keeping Cancel/Save visible.

**Fix:** one-line-class fix at the primitive: `max-h-[85dvh] overflow-y-auto sm:max-w-lg` on `DialogContent` (or a full-screen mobile variant via the existing Sheet). Reconsider `autoFocus` in the bulk-add/bonus/BGG dialogs on touch devices.

### U11 · MED — Touch targets below guideline on the core at-table actions

**Evidence** — base `Button` sizes are h-8/h-9 (32/36 px, `ui/button.tsx:25-28`); the worst offenders go lower, and they are precisely the high-frequency at-table actions: **check-in toggle `h-6` = 24 px** (`event-details-tab.tsx:471`, one per player row — the button organizers hammer at table-side), quick-score trigger `h-7` = 28 px (`quick-score-dialog.tsx:116`), add-placement/add-modifier `h-6` (`scoring-tab.tsx:205,279`), reintroduce `h-6` (`pairings-tab.tsx:618`), bonus-round delete icon `h-7` (`:706`), filter chips `h-7` at `gap-1.5` = 6 px spacing (`my-events-view.tsx:460`). Clearest adjacent-target violation: the reorder cluster — ChevronUp + ChevronDown + Trash at `h-9 w-9` with **zero gap** (`scoring-tab.tsx:404-418`). (WCAG 2.5.8 floor is 24 px; Apple HIG recommends 44 pt; the app's own `ready-tab.tsx:68-90` full-width card toggle and 48 px mobile tab Select show the standard to aim at.)

**Fix:** raise the five h-6/h-7 rows to `h-9` (or pad hit areas), add `gap-1` to the reorder cluster. Low-risk class changes; the check-in toggle is the one that matters.

### U12 · MED — iOS zoom-on-focus reintroduced by per-input overrides

**Evidence** — the primitive is correct: `ui/input.tsx:11` / `textarea.tsx:10` use `text-base md:text-sm` (16 px on phones prevents iOS auto-zoom). But `cn()` uses tailwind-merge, so per-instance `text-sm`/`text-xs` **override** the base and zoom returns: `round-config-tab.tsx:139,144`, `scoring-tab.tsx:312`, `event-details-tab.tsx:459,619`, `pairings-tab.tsx:865` — and worst, the **mobile-only** schedule datetime inputs at `text-xs` = 12 px (`event-metadata-card.tsx:330,342`). Every score/points input has correct `inputMode` (12+ sites verified — genuinely good), so it's only the zoom that's broken. `autoComplete` is right on auth/account except missing `name` on signup/profile name fields (`auth-view.tsx:216-222`, `account-view.tsx:173`).

**Fix:** replace `text-sm`/`text-xs` with `md:text-sm max-md:text-base` on phone-reachable inputs (or just drop the override); add `autoComplete="name"`.

### U23 · LOW — Safe-area and cookie-banner gaps

**Evidence** — the app handles safe areas in the right places (`header.tsx:92` inset-top, `page.tsx:96` inset-bottom, `layout.tsx:132-141` `viewportFit: cover` + `maximumScale: 5` with a WCAG-cited comment preserving zoom) but misses two fixed surfaces: the toast viewport (`ui/toast.tsx:19`, fixed top, no inset — content can sit under the notch) and the cookie bar (`cookie-consent.tsx:98`, fixed bottom, no inset — buttons near the home indicator). The cookie banner is also a hand-rolled `role="dialog" aria-live="polite"` without focus management or `aria-modal` (`:97-102`) where Radix AlertDialog would do. Minor: `auth-view.tsx:159,185` uses `100vh` (not `dvh`) so iOS URL-bar collapse offsets the centered card.

### 1.4 Copy & i18n

### U13 · MED — Locale persistence desync: the switcher silently doesn't work on server pages

**Evidence** — language state is dual: `ui-store.ts:50-56` persists `locale` to **localStorage**; `proxy.ts:44-61` sets the `ttp-locale` cookie **once at first visit** from `Accept-Language` and never again. `setLocale` (`ui-store.ts:45`) writes localStorage only. Meanwhile `layout.tsx:288-291` renders `<html lang>` from the cookie, and the persona/legal server pages (`organizer/page.tsx:56`, `judge/player/formats` same pattern) pick content from the cookie. Net: a user switches to Español in-app (instant, client-side — works everywhere), then visits `/organizer` or reloads → server renders **English** + `<html lang="en">` until hydration flicks back. The language switcher effectively doesn't work on 5 server-rendered routes.

**Fix:** make `setLocale` also `document.cookie = 'ttp-locale=…; max-age=…; path=/'` (one line), matching what the server reads.

### U14 · MED — Raw `err.message` surfaced verbatim (English/`HTTP 500` to Spanish users)

**Evidence** — `use-event-data.ts:60-62` throws `new Error(data.error || \`HTTP ${res.status}\`)`; server error strings are English-only (`pairings/route.ts:136` "Not enough checked-in players", `participants/route.ts:58` "Email is required", `publish/route.ts:41` "Could not allocate a unique event code…"). 38 call sites render `err.message` **first**, making the translated `|| t('…failed')` fallbacks dead code — and **11 sites have no fallback at all**: `proxy-score-card.tsx:84`, `edit-scores-card.tsx:98`, `score-tab.tsx:140,155`, `judge-tab.tsx:51`, `pairings-tab.tsx:542,561,629`, `event-details-tab.tsx:353,391,718`. The public share page renders `err.message` raw (`share page:198`). Network failures surface as browser-internal English ("Failed to fetch").

**Fix:** return stable error **codes** from the API (they half-exist as strings — map them), translate client-side; keep `err.message` only as `ToastDescription` detail under a localized title. One shared `toUserError(err, t)` helper covers all 38 sites.

### U15 · MED — Hardcoded English clusters bypass the i18n system

**Evidence** — after scanning 186 files, literal leakage is genuinely low — these are the remaining clusters, and they're user-visible: (1) the **entire pricing matrix** is English-only — `pricing.ts:10-58` plan names/targets/14 feature strings rendered on the landing page (`landing-view.tsx:346-370`) while its title/subtitle *are* translated; (2) **share/clipboard text** organizers paste into WhatsApp — `share/utils.ts:58-120` ("Round X of Y · ACTIVE" — leaking the raw enum, "pts", "See full standings:", "Join … on TableTop Prime!"); (3) the landing hero's OAuth compliance line "By signing in, you agree to our Privacy Policy and Terms of Service." (`landing-view.tsx:152-160`) — legalese in English for Spanish users; (4) "Learn more →" ×3 (`:208,219,230`); (5) error/404 pages (`error.tsx`, `global-error.tsx`, `not-found.tsx`) fully English; (6) the changelog page (public); (7) `scheduleCardLabel` prefixes "Starts "/"Ended " (`schedule.ts:126-132`) — shown on every event card and the share header; (8) `stats-tab.tsx:195-236` chart labels ('1st', '📊 Avg', 'rounds played') + two `sr-only Close` strings in `dialog.tsx:75`/`sheet.tsx:77` while `common.close` sits unused.

**Fix:** one localization pass over those seven clusters; wire the existing unused keys where they exist.

### U16 · MED — Dates in browser locale, not app locale

**Evidence** — `src/lib/schedule.ts:20-53` (`formatDateTime/Date/Time`) uses `Intl.DateTimeFormat(undefined, …)` — browser locale. A user who picked Español on an en-US browser sees "Aug 15, 2026 · 2:00 PM" in every schedule surface (`share page:314`, `event-details-tab.tsx:303`), plus `lastRefresh.toLocaleTimeString()` (`share page:330`) and GDPR dates (`account-view.tsx:362,365`). The app locale is available in both contexts (zustand store client-side; cookie server-side) — `Intl` just never receives it.

**Fix:** thread the app locale into `schedule.ts` helpers (default arg from `useI18n()`/cookie) and the three `toLocale*` call sites.

### U17 · MED — Ordinal bug: "21th, 22th, 23th"

**Evidence** — `en.json:125` `"ordinalN": "{n}th"`; five identical helpers append it blindly (`judge/shared.ts:27`, `companion/shared.ts:18`, `companion/score-tab.tsx:35`, `judge/edit-scores-card.tsx:34`, `judge/proxy-score-card.tsx:31`), two inline variants hardcode the 1st/2nd/3rd case only (`scoring-tab.tsx:213`, `quick-score-dialog.tsx:182`), and `stats-tab.tsx:195` skips i18n entirely (`best === 1 ? '1st' : \`${best}th\``). Placements 21st/22nd/23rd — plausible in a 40-player event — render "21th". `src/lib/ui-utils.ts:8-12` contains a correct `ordinal()` that **zero files import**.

**Fix:** one exported `formatOrdinal(n, t)` handling 11–13 + last-digit rules; delete the seven copies; use it in stats-tab (also fixes the leak).

### U24 · LOW — Terminology drift & raw enum leaks

**Evidence** — "tournament" appears exactly once ("Create your first **tournament**", `en.json:472`) in a product that otherwise says "event"; the score unit renders four ways (Game Points `:209` / Game Pts `:413` / `pts` common / csv duplicates `:320-321`); the judge queue shows the truncation "Ack" while full "Acknowledge" keys sit unused (`judge-view.tsx:155` vs `en.json:666-667`); raw DB enums leak into copy: `joinSuccess: 'Joined "{name}" as PLAYER'` (es: "como JUGADOR" — all-caps reads as shouting), "marks it as DISPUTED" (`en.json:513,676`), and the account badge shows the raw tier value `FREE`/`TIER_1` (`account-view.tsx:185`). Duplicate near-identical keys exist (`dashboard.cancel` vs `common.cancel`; `dashboard.eventCode`/`eventCodeLabel`). `formatRole`/`formatEventStatus`/`formatScoreState` already exist as the fix pattern — extend to tier/role-in-copy.

### 1.5 Consistency & dead weight

### U20 · LOW — Dead responsive/i18n weight

**Evidence** — `src/hooks/use-mobile.ts` (`useIsMobile`, 768 px matchMedia) has **zero consumers** (grep-verified) — all mobile adaptation is CSS-only (which also means zero hydration mismatch: fine to delete or to finally use); `ui-utils.ts:8-12` `ordinal()` dead (see U17); **170 of 805 keys (21%) unused** per `i18n-check.mjs` — whole families: `dashboard.csv.*` (26 keys — the CSV export renders headers differently), the removed companion demo/QR flow (`companion.simulateScan`, `selectDemoPlayer`…), `auth.role/judge/organizer/player`, `nav.home`. The checker only *prints* them (exit 0), so the pile grows.

**Fix:** purge pass with the checker's dynamic-call caveat, then wire the unused-keys count into CI as a warning threshold.

### U21 · LOW — Enter-key handlers bypass disabled buttons (double-submit)

**Evidence** — forms aren't wrapped in `<form onSubmit>` (also loses implicit submission semantics for SRs), so each has a manual `onKeyDown Enter → handle()`: `my-events-view.tsx:197` (join — `handleJoin` guards only `!joinCode.trim()`, not `joinLoading`), `:231` (create — same shape), `event-details-tab.tsx:441` (add player — checks duplicate but not `addPlayers.isPending`). The buttons themselves are correctly `disabled={x.isPending}`; Enter just bypasses them.

**Fix:** wrap in real `<form onSubmit={e => {e.preventDefault(); handle()}}>` (fixes U21 and the SR form semantics together), or add the `loading` guard inside the handlers.

### U22 · LOW — SPA navigation is silent and focus-free

**Evidence** — `src/app/page.tsx:97-107` swaps views on `useUIStore.view` with no focus move and no announcement; after clicking an event in the header menu, focus stays on the menu button while the whole page content changes (WCAG 2.4.3/4.1.3). Fix is standard: on view change, `headingRef.current?.focus()` (with `tabIndex={-1}`) — or move to real routes, which would also fix U4's link semantics and the footer's buttons-as-nav (`footer.tsx:45,50,55` — no middle-click, no URL).

### U25 · LOW — Interaction nits

**Evidence** — (1) landing "Learn more →" spans are `opacity-0 group-hover:opacity-100` (`landing-view.tsx:207,218,229`) — invisible on touch and focus, and the feature cards link to *themselves* (`href="#slug"`, announced as six pointless links); (2) `share-button.tsx:141-144` collapses to icon-only on mobile **without** `aria-label` — the identical pattern in `companion-view.tsx:99-113` and `header.tsx:139-147` has it; (3) ToastClose is invisible until hover/focus (`toast.tsx:80`) — on touch it never appears (swipe-dismiss compensates); (4) toast viewport / cookie bar safe-area (see U23); (5) error pages use `text-muted-foreground/60` = 2.42:1 for the error-ID line (`error.tsx:33`, `global-error.tsx:40`).

---

## 2. What's notably good

Worth keeping and copying forward:

- **Tournament-floor freshness engineering** (`use-event-data.ts:102-124`): 10 s poll + `refetchOnWindowFocus: 'always'` + `refetchOnReconnect` + `refetchOnMount: 'always'`, with a candid comment documenting why Realtime was removed and how mobile timers throttle. Exactly right for phones on venue wifi.
- **The check-in-all button** (`event-details-tab.tsx:400-404`) is the app's template async button: pending disables, label swaps to "Checking in…", result-count toast after completion. (U2/U10 are the places that forgot to copy it.)
- **Consequence-first AlertDialogs** where they exist: account deletion (`account-view.tsx:370-397` — two paragraphs of impact, 30-day timeline, destructive-styled, Cancel-focused) and the tiebreaker re-rank warning (`scoring-tab.tsx:166-190`).
- **Diagnostics-aware success toasts** (`pairings-tab.tsx:147-201`): pairing generation reports rematch-conflict count and affected tables instead of a blind "Success".
- **PlayerChip** (`player-chip.tsx:4-24`): a documented, centralized truncation component (`min-w-0 flex-1 truncate` + `title`) that fixed long-name overflow across 14 call sites — the right way to kill a systemic bug.
- **Viewport & safe-area done properly** (`layout.tsx:132-141`): `maximumScale: 5` explicitly preserving user zoom (WCAG 1.4.4-cited comment), `viewportFit: cover`, header/main insets.
- **A11y discipline where it counts**: skip links on both shells (`page.tsx:69-74,87-92`); consistent `aria-pressed` toggles (ready toggle, password show/hide, filter groups with `role="group"`); every icon-only button but one carries a localized `aria-label`; decorative SVGs always `aria-hidden`; server-rendered `<html lang>` + client sync.
- **Marketing/legal/persona markup is model**: h1→h2→h3 outlines, `aria-labelledby` sections, `<dl>` stat rows, visible breadcrumbs with `aria-current` (`landing-view.tsx`, `persona/**`, `legal-page.tsx`).
- **i18n architecture**: CI-checkable en/es parity (805/805, 0 missing), safe fallback chain (locale → English → key), `{var}` interpolation, per-locale persona/legal content modules with structural parity, and only ~10 leaked literals in 186 files.
- **Numeric input hygiene**: every score/points input across 12+ sites carries correct `inputMode="numeric|decimal"`; `autoCapitalize="characters"` on join codes.

---

## 3. Fix roadmap (priority order)

### P0 — Now (~1.5 days; user-facing correctness + the keyboard/contrast blockers)
| Item | Action | Effort |
|---|---|---|
| U3 | Badge contrast: replace `bg-{amber,emerald,rose,blue}-500 text-white` with tint pairs (or `-950` text); re-verify ≥4.5:1 | 2–3 h |
| U4 | Keyboard-operable event cards (real button/Link + focus styles) | 30 min |
| U6 | AlertDialog for template delete, bonus-round delete, regenerate; destructive variant on `AlertDialogAction`; replace the 3 native `confirm()` | 0.5 d |
| U2 | Success toasts only after mutation success (`onSuccess`/await); fix promote-all catch | 2–3 h |
| U8 | Share page: keep last-good standings on poll failure | 2 h |
| U17 | One `formatOrdinal` helper; fix 21st/22nd/23rd; use in stats-tab | 1 h |

### P1 — Structural a11y + mobile (~3–4 days)
| Item | Action | Effort |
|---|---|---|
| U1 | `isError` branches + retry on dashboard shell, 5 tabs, my-events, share, auth bootstrap; separate empty vs error | 0.5–1 d |
| U5 | Label sweep: `htmlFor`/`aria-label` for ~25 controls (score-tab, quick-score, judge cards, round-config, scoring, event-details, bgg picker); `aria-describedby` for the 2 inline validators | 0.5–1 d |
| U7 | `max-h-[85dvh] overflow-y-auto` on DialogContent; revisit `autoFocus` on touch | 2–4 h |
| U11 | Touch targets: h-6/h-7 → h-9 on the 5 core actions; `gap-1` reorder cluster | 2–3 h |
| U12 | Undo `text-xs/sm` overrides on phone inputs (iOS zoom); `autoComplete="name"` | 1–2 h |
| U10 | Judge queue feedback (toast + pending states); `TOAST_LIMIT` 2–3 + explicit duration | 2–3 h |

### P2 — Feedback quality + i18n integrity (~3–4 days)
| Item | Action | Effort |
|---|---|---|
| U9 | Skeleton primitive + shapes for the 6 main loading surfaces | 0.5–1 d |
| U14 | API error codes → localized toasts via one `toUserError()` helper (38 sites) | 0.5 d |
| U15 | Localize pricing matrix, share text, OAuth line, error/404, changelog, scheduleCardLabel, stats-tab labels | 0.5 d |
| U13 | `setLocale` writes `ttp-locale` cookie | 1 h |
| U16 | App locale into `schedule.ts` + 3 `toLocale*` sites | 2–3 h |
| U18 | `CardTitle` heading prop; h1 on auth; fix h1→h4 skips | 2–3 h |
| U19 | `aria-live` regions for share standings + companion confirm-flip; stateful judge live region; progressbar roles | 0.5 d |

### P3 — Backlog
- U20: purge 170 unused keys (mind dynamic `t()` calls), delete `use-mobile.ts` or give it a consumer, dedupe ordinal helpers.
- U21/U22: wrap Enter-forms in `<form onSubmit>`; focus-move on SPA view swap (or move to real routes, killing footer buttons-as-nav too).
- U23/U25: safe-area insets on toast viewport + cookie bar; Radix AlertDialog for cookie consent; `dvh` on auth; landing self-links + hover-only hints; share-button `aria-label`.
- U24: terminology pass (tournament→event, unit style, enum leaks via `formatX` helpers, dedupe `dashboard.cancel`).
- Consider: unified `EmptyState` component (icon + text + CTA) to retire the three coexisting shapes; full-screen mobile dialog variant via Sheet; error/404 pages consuming `useI18n`.

---

*Audit performed on the post-P0/P1/P2 tree (`cef14f8`). All file:line references verified against the working tree; contrast ratios computed from token values with a validated pipeline; i18n counts re-executed during the audit. No code was modified.*

