# TableTop Prime — Kanban Methodology

**Last updated:** August 2026
**Methodology:** Kanban with Feature Slices
**Team size:** 1-2 developers + AI assistant

---

## Why Kanban?

TableTop Prime is a small-team project where work is naturally
interrupt-driven (bug reports from real users at real tournaments).
Full Scrum (2-week sprints, ceremonies, story points) adds overhead
that doesn't pay off at this scale. Kanban provides continuous flow
without timeboxed rituals.

## Core Principles

### 1. Continuous Flow Over Sprints

There are no sprints, no sprint planning, no retrospectives. Work is
pulled from a prioritized backlog and completed at a natural pace.
When you have a free weekend, you ship something.

### 2. Feature Slices (Vertical)

Each task is a **vertical slice** — end-to-end, from database to UI:

```
DB migration → API route → UI component → i18n keys → tests → changelog
```

A slice is independently deployable. We never do "all the API work"
then "all the UI work" — each feature is complete when its slice is
done.

### 3. WIP Limit of 2

Never more than 2 items "In Progress" at once. This forces
**completion over starting new things** — a common failure mode in
solo projects is starting 10 features and finishing none.

### 4. Definition of Done (DoD)

A feature is "Done" only when ALL of these are checked:

- [ ] DB migration applied + tested on production Supabase
- [ ] API route implemented + validated with `npx tsc --noEmit`
- [ ] UI implemented + validated on mobile (375px) + desktop
- [ ] i18n keys added to `en.json` + `es.json` (`npm run i18n:check` passes)
- [ ] Tests added for core logic (`npx vitest run` passes)
- [ ] Changelog entry written
- [ ] Deployed + smoke-tested on production

### 5. Interrupt-Driven Priorities

Bug reports from real users at real tournaments take priority over
new features. A broken score submission at a live event is more
important than a new statistics page. This is built into the workflow
— the backlog has a "Hotfix" swim lane that can jump the queue.

---

## Board Structure

The Kanban board has 5 columns:

```
┌──────────┬────────┬──────────────┬────────┬──────┐
│ Backlog  │ Ready  │ In Progress  │ Review │ Done │
│          │        │ (max 2)      │        │      │
└──────────┴────────┴──────────────┴────────┴──────┘
```

| Column | Meaning | WIP Limit |
|--------|---------|-----------|
| **Backlog** | All ideas, features, and bugs not yet started. Prioritized by value + urgency. | — |
| **Ready** | Next 1-2 items to work on. Refined enough to start immediately (acceptance criteria defined, dependencies identified). | — |
| **In Progress** | Actively being coded. Only 2 items max — forces focus. | **2** |
| **Review** | Code complete, needs validation (tsc + eslint + tests + mobile check). Can be self-reviewed for solo work. | — |
| **Done** | Meets the Definition of Done. Ready to deploy. | — |

### Swim Lanes

Within each column, items are organized into 3 swim lanes:

| Lane | Priority | Examples |
|------|----------|---------|
| **Hotfix** 🔴 | Highest — jump the queue | Production 500 error, security vulnerability, data corruption |
| **Feature** 🟢 | Normal priority — pulled from backlog | New functionality, improvements |
| **Tech Debt** 🟡 | Lower priority — scheduled deliberately | Refactoring, test coverage, tooling |

---

## Rituals

### Release Friday (Weekly)

Pick one day a week (Friday works well) as the ship day:

1. **Review** (15 min): Move items from "Review" → "Done". Run the
   validation gate:
   ```bash
   npm run i18n:check
   npx tsc --noEmit
   npx eslint src/
   npx vitest run
   ```
2. **Deploy** (5 min): Push to production via Vercel.
3. **Changelog** (10 min): Write the changelog entry for what shipped
   this week.
4. **Plan** (10 min): Pick 1-2 items from "Backlog" → "Ready" for
   next week. Write brief acceptance criteria for each.

**Total time: ~45 minutes per week.** No standups, no ceremonies,
just ship + plan.

### Monthly Retrospective (Monthly, Optional)

At the end of each month, review:
- What shipped? (count Done items)
- What got stuck? (items in In Progress > 1 week)
- What patterns caused bugs? (adjust the DoD)
- Is the WIP limit working? (if always at 2, consider raising to 3)

---

## Backlog Management

### Writing Tasks

Each backlog item should have:

```
## [Feature] Player Statistics Page

**Why:** Players want to see their win rate and placement history.
**Acceptance criteria:**
- New "Stats" tab in the companion view
- Shows: rounds played, average placement, win rate, total points
- Works on mobile (375px) without overflow
- i18n keys in en.json + es.json
- Changelog entry

**Dependencies:** None (can start immediately)
**Estimate:** ~1 week
```

### Prioritization

Priority is determined by two factors:

1. **Value** — how much does this help users or the business?
2. **Urgency** — is there a deadline or live-event dependency?

```
High Value + High Urgency = Do now (Ready → In Progress)
High Value + Low Urgency  = Next sprint (Ready)
Low Value + High Urgency  = Quick fix (Backlog top)
Low Value + Low Urgency   = Backlog bottom (someday)
```

### Sizing

We don't use story points. Instead, each task has a rough size
estimate:

| Size | Meaning | Typical effort |
|------|---------|----------------|
| **S** | Small — one file, one feature | < 1 day |
| **M** | Medium — multiple files, one slice | 1-3 days |
| **L** | Large — new schema table, new view | 3-7 days |
| **XL** | Extra large — multi-week initiative | 1-4 weeks |

---

## Feature Slice Template

When starting a new feature, follow this checklist:

```
□ 1. Schema (if needed): Add to prisma/schema.prisma + write SQL migration
□ 2. API: Create/modify route handler(s) in src/app/api/
□ 3. Types: Update src/lib/types/index.ts if new types are needed
□ 4. Serializer: Update src/lib/serialize.ts if the API response changes
□ 5. Hooks: Add/modify hooks in src/hooks/use-event-data.ts
□ 6. UI: Create/modify components in src/components/views/
□ 7. i18n: Add keys to en.json + es.json, run npm run i18n:sort + i18n:check
□ 8. Mobile: Test on 375px viewport (overflow, touch targets, WCAG)
□ 9. Tests: Add tests in src/lib/tests/ for any new pure-logic code
□ 10. Changelog: Add entry to src/app/changelog/page.tsx
□ 11. Validate: npx tsc --noEmit && npx eslint src/ && npx vitest run
□ 12. Deploy: Push to Vercel + smoke-test on production
```

---

## Current Backlog (August 2026)

### In Progress
- (none)

### Ready
- Google AdSense integration (blocked on AdSense account approval)

### Backlog
1. **BGG Integration** — board game search autocomplete (M, 3-5 days)
2. **Player Statistics** — per-event + global stats (L, 1-2 weeks)
3. **Subscription System** — Stripe + tier enforcement (XL, 3-4 weeks)
4. **God file splitting** — pairings-tab.tsx, pairing-engine.ts, etc. (L)
5. **API route tests** — mock Prisma + Supabase auth (L)
6. **Migration drift** — reconcile hand-run SQL with Prisma migrations (M)

### Done (Recent)
- Cookie consent banner (GDPR/LGPD compliant)
- Mobile overflow + WCAG fixes
- Warm color scheme
- Changelog page
- OG image + PWA manifest + JSON-LD
- Full i18n (en + es, 718 keys)
- Procedural event banners
- Event description + schedule
- Bonus round fixes
- Security audit fixes (role escalation, IDOR, event codes)
- Drop/re-add bug fix
- Score permission model fix
- Ready-for-Next-Round implementation
- Share page table redesign

---

## Tools

| Tool | Purpose |
|------|---------|
| **GitHub Projects** (or Notion) | Kanban board |
| **Vercel** | Deployment + preview environments |
| **Supabase Dashboard** | Database + auth management |
| `npm run i18n:check` | i18n key parity validator |
| `npm run i18n:sort` | Alphabetical key sorter |
| `npx tsc --noEmit` | TypeScript type check |
| `npx eslint src/` | Lint check |
| `npx vitest run` | Test runner |

---

## Anti-Patterns to Avoid

1. **Don't start new features while bugs are in the queue.** A
   broken production feature is more important than a new feature.
   Move the bug to "In Progress" first.

2. **Don't skip the Definition of Done.** "It works on my machine"
   is not Done. Run the validation gate. Test on mobile. Add i18n
   keys. Write the changelog.

3. **Don't let the WIP limit creep up.** If you find yourself with
   3-4 items "In Progress", stop and finish one before starting
   another. Context-switching kills productivity.

4. **Don't deploy without testing on production.** Preview
   deployments on Vercel are free — use them. Click through the
   feature on the actual deployed URL before marking as Done.

5. **Don't accumulate tech debt silently.** If you notice a code
   smell or missing test while working on a feature, add a "Tech
   Debt" item to the backlog. Don't fix it inline (scope creep) —
   note it and move on.
