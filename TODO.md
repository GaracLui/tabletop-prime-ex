Good day! Great questions. Let me give you a practical methodology recommendation and then a structured roadmap for those four initiatives.

## Recommended Methodology: Kanban + Feature Slices

You don't need full Scrum (sprints, ceremonies, story points) — for a solo/small-team project like TableTop Prime, **Kanban with feature slices** is the best fit. Here's why and how:

### Why not Scrum?
- Scrum's 2-week sprints add ceremony (sprint planning, retro, standup) that doesn't pay off for a 1-2 person team
- Your work is naturally interrupt-driven (bug reports from real users at real tournaments)
- Features vary wildly in size (AdSense = 2 days, subscription system = 3+ weeks)

### Why Kanban + Feature Slices?

**Kanban**: continuous flow — pull work from a backlog, no timeboxes. Perfect for "I have a free weekend, let me ship something."

**Feature Slices**: instead of horizontal layers (all API first, then all UI, then all tests), cut **vertical slices** — one feature end-to-end (DB migration → API → UI → tests → docs). Each slice is independently deployable. This is what we've been doing implicitly — each task you've given me has been a slice.

### How to implement it

1. **Backlog board** (GitHub Projects, Notion, or even a markdown file): columns = Backlog → Ready → In Progress → Review → Done
2. **WIP limit of 2**: never more than 2 things "In Progress" at once — forces completion over starting new things
3. **Definition of Done** for each feature:
   - ✅ DB migration applied + tested
   - ✅ API route implemented + validated with tsc
   - ✅ UI implemented + validated on mobile (375px) + desktop
   - ✅ i18n keys added to en.json + es.json (run `npm run i18n:check`)
   - ✅ Tests added for core logic
   - ✅ Changelog entry written
   - ✅ Deployed + smoke-tested on production

### A practical ritual: "Release Friday"

Even without sprints, pick one day a week (Friday works well) as your ship day:
- Review what's in "Review" → move to "Done" → deploy
- Write the changelog entry for what shipped
- Pick 1-2 items from "Backlog" → move to "Ready" for next week
- Run `npm run i18n:check` + `npx tsc --noEmit` + `npx vitest run` as a gate

---

## Next Steps Roadmap

Here's how I'd sequence your four initiatives, with estimated effort and dependencies:

### Priority 1: Google AdSense (1-2 days) — *Quick win, funds the project*

**Why first**: it's the smallest effort, generates revenue immediately, and the legal page updates are straightforward.

**Work breakdown**:
1. Get AdSense account approved (requires ~20+ quality pages + traffic — you may need to wait for organic traffic to build)
2. Add `<Script>` tags in `layout.tsx` (with consent gating via Cookie Policy)
3. Create an `<AdSlot>` component (responsive, lazy-loaded, respects `prefers-reduced-motion`)
4. Place ads: landing page (1 unit), share page (1 unit, after standings), changelog (1 unit)
5. Update legal pages:
   - **Privacy Policy**: add section "Advertising" — explain Google AdSense, DoubleClick cookie, `google_ad_` cookies, opt-out link to `adssettings.google.com`
   - **Terms of Service**: add "Advertising" section — ads are third-party content, Google's terms apply
   - **Cookie Policy**: add Google AdSense cookies (`__gads`, `__gpi`, `IDE`, `NID`) to the cookie table + add a "Non-essential cookies" consent banner (GDPR requires consent for ad cookies in the EU/UK)
   - **Changelog**: add "Google AdSense integrated" entry

**Risk**: AdSense approval can take weeks. Apply early, work on other things while waiting.

**Blocker**: You need a cookie consent banner before serving ads in the EU/Argentina. I can build a simple one — a bottom bar with "Accept all" / "Reject non-essential" that sets a `consent` cookie and gates the ad script loading.

### Priority 2: BGG Integration (3-5 days) — *Quality-of-life for organizers*

**Why second**: it's self-contained (no dependencies on other features), improves the core organizer experience, and sets up patterns you'll reuse for the subscription system.

**Work breakdown**:
1. **BGG XML API client** (`src/lib/bgg.ts`): search by name → get game details (max players, min players, playtime, image, BGG ID). The BGG XML2 API is free, no auth needed: `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=catan`
2. **Game picker UI**: replace the plain `<Input>` for "Board game" with an autocomplete search that calls the BGG API as the user types (debounced 300ms). Shows game name + thumbnail + player count. Selecting fills `gameName`, `gameBggId`, `gameMaxPlayers` automatically.
3. **Cache BGG responses**: the BGG API is rate-limited (1 request/sec). Cache responses in a `BggGame` table or in-memory (with 24h TTL) to avoid hitting the limit.
4. **Display BGG data**: on the share page + dashboard, show the game thumbnail + player count range + average playtime from BGG.
5. **Changelog entry**

**Risk**: BGG API can be slow (2-5s response time). The UI must show a loading spinner and not block the form. Consider a "Search BGG" button instead of live autocomplete to avoid rate-limiting.

**Dependency**: None — can start immediately.

### Priority 3: Player Statistics (1-2 weeks) — *Engagement feature*

**Why third**: it's the biggest feature, requires new schema tables, and benefits from BGG integration (stats grouped by board game).

**Work breakdown**:
1. **Schema**: new `PlayerStat` table (or compute on-the-fly from existing `PlacementScore` + `TableScore` data). Decision: compute on-the-fly is simpler but slow for large events; a materialized `PlayerStat` table is faster but needs updating on every score change. I'd recommend **on-the-fly aggregation** with a dedicated `/api/stats/player/:playerId` endpoint that caches for 60s.
2. **Per-event stats**: the companion view shows the player's record in the current event — rounds played, average placement, win rate, total points, best round, worst round, head-to-head record vs specific opponents.
3. **Global stats**: a new "My Stats" view (or tab in Account) showing aggregated stats across all events the player has participated in — grouped by board game (leverages BGG integration from Priority 2), with charts (win rate over time, placement distribution).
4. **Share stats**: "I'm ranked #3 in Catan tournaments on TableTop Prime!" share button (already partially built).
5. **Changelog entry**

**Risk**: the companion view is already feature-heavy. Adding a "Stats" tab means a 5th tab — might be too many for mobile. Consider replacing the "Ready" tab with stats (since "Ready" is a simple toggle that could be a button on the Score tab instead).

**Dependency**: benefits from BGG integration (for grouping stats by game), but can be built without it.

### Priority 4: Subscription System (3-4 weeks) — *Monetization*

**Why last**: it's the highest-complexity, highest-risk feature, and you need traffic + product-market fit first (AdSense + BGG integration will help validate demand).

**Work breakdown**:
1. **Payment provider decision**: Stripe (best docs, 2.9%+30¢, supports Argentina) vs Mercado Pago (popular in Argentina, local payment methods) vs Supabase's built-in billing (if they add it). I'd recommend **Stripe** for global + **Mercado Pago** for Argentina-specific methods (PIX, Rapipago).
2. **Schema**: new `Subscription` table (userId, tier, status, stripeCustomerId, currentPeriodEnd, cancelAt). Update `User.primeTier` to sync with subscription status.
3. **Stripe webhook**: `/api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Must be idempotent + verified with Stripe signature.
4. **Checkout flow**: "Upgrade to Prime" button → Stripe Checkout → redirect back with updated tier. Handle the case where payment succeeds but webhook hasn't arrived yet (show "Processing..." state).
5. **Tier enforcement**: currently tier limits are displayed but not enforced. Add server-side checks: `if (event.players.length >= TIER_LIMITS[user.primeTier]) return 403`.
6. **Billing portal**: let users manage their subscription (upgrade/downgrade/cancel) via Stripe's hosted portal.
7. **Legal updates**: Privacy Policy (Stripe data processing), Terms of Service (refund policy, billing terms), Cookie Policy (Stripe cookies).
8. **Changelog entry**

**Risk**: payment bugs are expensive (chargebacks, lost revenue). Need thorough testing with Stripe's test mode before going live. Also: Argentine tax regulations may require facturación for digital services — check with an accountant.

**Dependency**: none technically, but financially you should validate demand first (AdSense revenue + user count) before investing 3-4 weeks in billing.

---

## Summary Timeline

```
Week 1-2:   [AdSense]     ← Quick revenue + legal updates
Week 2-3:   [BGG]        ← Organizer quality-of-life
Week 4-5:   [Stats]       ← Player engagement (can overlap with BGG)
Week 6-9:   [Subscriptions] ← Monetization (after validating demand)
```

**Total: ~8-9 weeks of focused work**, with features shipping independently throughout.

## What I can start on right now

If you want to begin, I'd recommend starting with the **cookie consent banner** — it's a prerequisite for AdSense (EU/Argentina requires consent for non-essential cookies) and it's a self-contained 2-3 hour task:

1. A bottom bar component: "We use cookies for authentication, analytics, and advertising. [Accept all] [Essential only]"
2. Sets a `consent` cookie with the user's choice
3. Gates the Vercel Analytics script + future AdSense script behind the consent
4. Only shows once (checks for existing consent cookie)

Want me to build that?
