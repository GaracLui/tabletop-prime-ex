/**
 * Organizer persona page content — English.
 *
 * Target keyword: "board game tournament organizer software"
 * This is a server-rendered SEO landing page. No client-side interactivity —
 * CTAs are plain <a> links to /#auth which the home page handles.
 */
import { Dices, ShieldCheck, SlidersHorizontal, Gavel, FileSpreadsheet, Repeat } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: Dices,
    title: 'Multiplayer Pairing Engine',
    desc: 'Generate pairings for 2–6 players per table. Choose Round Robin (maximize new opponents), Swiss (similar records play), Single Elimination (knockout bracket), or Adjacent Swiss (bracket-style, TFT / Commander finals). Rematches are minimized automatically with a min-conflicts search algorithm.',
  },
  {
    icon: ShieldCheck,
    title: 'Dual-Score Verification',
    desc: 'Every table score is submitted by one player and confirmed by another. Typos, misclicks, and bad-faith entries are caught at the source — no more arguing over who won or what the game points were.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Custom Scoring Rules',
    desc: 'Configure placement points (1st, 2nd, 3rd, …), stack attendance bonuses, round multipliers, and league modifiers. Five tiebreaker methods (game points, first places, best placement, table strength, drop-worst-round) ensure fair rankings even when points are tied.',
  },
  {
    icon: Gavel,
    title: 'Judge Dispatch',
    desc: 'Players tap "Call Judge" from their phone with their table number and issue category. Judges see a live, mobile-optimized queue with one-tap acknowledge and resolve. No more shouting across the hall.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV Export & Templates',
    desc: 'Export standings and full match history (every table, every round, every placement) as CSV at any time. Save event templates for recurring weekly leagues — spin up in seconds, not minutes.',
  },
  {
    icon: Repeat,
    title: 'Seat Rotation',
    desc: 'Rotate first-player position each round for games with seat advantage (Catan, Carcassonne, Ticket to Ride). Choose Clockwise or Balanced rotation per round — every player gets every seat exactly once over N rounds.',
  },
]

export function OrganizerContentEn() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Free for clubs and conventions
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Board Game Tournament Organizer Software
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Run board game tournaments from your phone. Generate multiplayer pairings
            (Swiss, Round Robin, Adjacent Swiss, Single Elimination), configure custom
            scoring rules with tiebreakers, dispatch judges in real time, and export
            results as CSV — all in one mobile-first platform built for local associations
            and conventions.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start organizing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Players</dt>
            <dd className="mt-1 text-2xl font-semibold">2–200+</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Set up in</dt>
            <dd className="mt-1 text-2xl font-semibold">2 min</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Price</dt>
            <dd className="mt-1 text-2xl font-semibold">Free</dd>
          </div>
        </dl>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="features-title">
        <div className="mb-10 text-center">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run a tournament
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            From the first check-in to the final CSV export — TableTop Prime handles the
            operational chaos so you can focus on the game.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Card key={i} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {f.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6" aria-labelledby="how-title">
        <div className="rounded-lg border border-border/60 bg-card p-6 sm:p-8">
          <h2 id="how-title" className="mb-4 text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <ol className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <li>
              <strong className="text-foreground">1. Create the event.</strong> Set the game
              name (with BGG lookup), table size (2–6 players), total rounds, and scoring rules
              (placement points + modifiers + tiebreakers).
            </li>
            <li>
              <strong className="text-foreground">2. Add players.</strong> Players check in
              from their phone via a QR code or share link — no app install, no account needed
              for players.
            </li>
            <li>
              <strong className="text-foreground">3. Generate pairings.</strong> Pick a format
              per round (Round Robin, Swiss, Single Elimination, or Adjacent Swiss). The engine
              minimizes rematches automatically and shows feasibility diagnostics.
            </li>
            <li>
              <strong className="text-foreground">4. Score & confirm.</strong> One player
              submits the table score, a second confirms it. Standings update live on the public
              share page for parents and friends following from home.
            </li>
            <li>
              <strong className="text-foreground">5. Export & archive.</strong> Download the
              full results as CSV. Save the event as a template for next week's league night.
            </li>
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to run your next tournament?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Pairings, scoring, judge dispatch, and live standings — all from your phone.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create your first event
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free · no credit card · 2 minutes to set up
          </p>
        </div>
      </section>
    </>
  )
}
