/**
 * Formats explainer page content — English.
 *
 * Target keyword: "Swiss vs Round Robin tournament format"
 * Server-rendered SEO landing page. CTAs are <a> links to /#auth.
 */
import { Dices, Trophy, Layers, Crown, Check, X, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FORMATS = [
  {
    icon: Dices,
    name: 'Round Robin',
    what: 'A social format that maximizes new opponents. The engine uses a Social Golfer algorithm to mix tables every round, ensuring no two players share a table twice whenever mathematically possible.',
    how: 'Players are shuffled each round and assigned to tables randomly (with rematch avoidance). Standings are ignored — everyone keeps playing regardless of results. The search algorithm minimizes repeat pairings across all rounds.',
    whenToUse: 'Casual game nights, social events, board game cafés, and weekly league play where the goal is to meet new people and play different opponents each round.',
    pros: [
      'Every player plays every round — no elimination',
      'Maximizes new opponents (rematch avoidance)',
      'Standings don\'t matter — pure social play',
      'Works for any player count (2–200+)',
    ],
    cons: [
      'Less competitive — top players don\'t face each other',
      'Final standings can feel arbitrary (no "champion" narrative)',
      'Not suitable for knockout-style events',
    ],
  },
  {
    icon: Trophy,
    name: 'Swiss',
    what: 'The classic competitive format used in chess, Magic: The Gathering, and competitive board game tournaments. Players with similar records face each other — winners play winners, losers play losers.',
    how: 'After each round, players are sorted by their total event points and grouped by score. The top group plays at Table 1, the next group at Table 2, etc. The engine also minimizes rematches within each score group without breaking the group structure.',
    whenToUse: 'Competitive events without elimination, league seasons, and events where every player should get a full tournament experience regardless of early losses.',
    pros: [
      'Every round is competitive (similar-skill opponents)',
      'Nobody is eliminated — all players participate fully',
      'Points accumulate naturally across rounds',
      'Rematch avoidance within score groups',
    ],
    cons: [
      'Can produce rematches at high density (mathematical limit)',
      'Score groups can become rigid — hard to adjust mid-event',
      'Not ideal for crowning a single champion via elimination',
    ],
  },
  {
    icon: Crown,
    name: 'Single Elimination',
    what: 'Knockout format where only the top half of standings advances each round. The rest are eliminated. Tables are seeded so the strongest players can\'t meet early — seed 1 plays seed 8, seed 2 plays seed 7, etc.',
    how: 'Players are sorted by standings and the top half advances. The bracket uses serpentine seeding (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6) so top seeds are spread across the bracket. Byes are given to top seeds when the field isn\'t a perfect bracket size.',
    whenToUse: 'Championship events, qualifier brackets, and any event that must produce a single undisputed champion through head-to-head elimination.',
    pros: [
      'Produces a clear champion',
      'High stakes — every game matters',
      'Serpentine seeding protects top players early',
      'Bye system handles non-power-of-2 fields',
    ],
    cons: [
      'Eliminated players are done — no second chance',
      'Less total playtime for eliminated players',
      'A single bad game can end a player\'s tournament',
    ],
  },
  {
    icon: Layers,
    name: 'Adjacent Swiss',
    what: 'Bracket-style Swiss used in TFT lobbies, MTG Commander finals, and poker final tables. Players are grouped strictly by their exact, consecutive position in the standings — Table 1 is always the top table.',
    how: 'Players are sorted strictly by standings (with tiebreakers) and sliced consecutively into tables. Table 1 = positions 1–K, Table 2 = positions K+1–2K, etc. After each round, players move up or down tables based on their new point totals. No rematch shuffling — the tier structure is sacred.',
    whenToUse: 'TFT-style lobbies, Commander pod tournaments, poker final tables, and any event where table assignment should directly reflect the current leaderboard.',
    pros: [
      'Table 1 is always the "feature table" with the leaders',
      'Dynamic movement — climb the standings, move up a table',
      'Fully deterministic — same standings, same pairing',
      'Perfect for stream-worthy top tables',
    ],
    cons: [
      'Rematches accepted when standings dictate them',
      'Less matchmaking optimization (no rematch avoidance)',
      'Bottom players always play each other',
    ],
  },
]

const COMPARISON_ROWS = [
  { feature: 'Best for', rr: 'Casual / social', swiss: 'Competitive leagues', elim: 'Championships', adjSwiss: 'TFT / Commander finals' },
  { feature: 'Eliminates players?', rr: 'No', swiss: 'No', elim: 'Yes (top half advances)', adjSwiss: 'No' },
  { feature: 'Standings-based?', rr: 'No (random mix)', swiss: 'Yes (score groups)', elim: 'Yes (bracket seeding)', adjSwiss: 'Yes (strict positions)' },
  { feature: 'Rematch avoidance', rr: 'Maximum (search algorithm)', swiss: 'Within score groups', elim: 'Not applicable', adjSwiss: 'Not applied (tier structure is sacred)' },
  { feature: 'Produces a champion?', rr: 'No (social)', swiss: 'Points-based winner', elim: 'Yes (knockout winner)', adjSwiss: 'Points-based winner' },
  { feature: 'Deterministic?', rr: 'No (RNG + search)', swiss: 'No (RNG + search)', elim: 'No (RNG + seeding)', adjSwiss: 'Yes (pure standings)' },
]

const FAQS = [
  {
    q: 'Which format should I choose?',
    a: 'For a casual game night with friends, use Round Robin — everyone plays everyone, and the focus is on fun. For a competitive league season, use Swiss — similar-skill players face each other each round. For a championship that must produce a single winner, use Single Elimination. For a TFT-style or Commander pod event where table assignment should reflect the leaderboard, use Adjacent Swiss.',
  },
  {
    q: 'Can I switch formats between rounds?',
    a: 'Yes. TableTop Prime supports per-round format configuration. You can run rounds 1–3 as Round Robin, round 4 as Swiss, and round 5 as Single Elimination. This is called a "phased event" — the standings carry over automatically between formats.',
  },
  {
    q: 'What\'s the difference between Swiss and Adjacent Swiss?',
    a: 'Classic Swiss pairs players with similar records but can shuffle within score groups to avoid rematches. Adjacent Swiss is stricter — it groups players by exact consecutive standings position (Table 1 = top K players, Table 2 = next K, etc.) and never shuffles, even if it means a rematch. Adjacent Swiss is better for TFT-style events where the top table should always feature the current leaders.',
  },
  {
    q: 'How does the rematch avoidance work?',
    a: 'The engine uses a min-conflicts local search algorithm with delta scoring (scoring only the changed tables, not the full field) and a time budget (default 2 seconds). It builds an adjacency map of all previous pairings and minimizes the total rematch weight. Feasibility diagnostics tell you when no zero-conflict solution exists.',
  },
  {
    q: 'What are byes in Single Elimination?',
    a: 'When the number of players isn\'t a perfect bracket size (e.g., 6 players, not 8), top seeds get byes — they skip round 1 and rejoin in round 2. The number of byes is calculated to fill the bracket to the next valid size. Byes are given to the highest-ranked seeds.',
  },
]

export function FormatsContentEn() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            4 formats · free for all events
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Board Game Tournament Formats Explained
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Swiss vs Round Robin vs Single Elimination vs Adjacent Swiss — which tournament
            format is right for your event? Compare all four, understand the trade-offs, and
            choose with confidence.
          </p>
        </div>
      </section>

      {/* Detailed format sections */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-labelledby="formats-detail-title">
        <div className="mb-10 text-center">
          <h2 id="formats-detail-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            The four formats in detail
          </h2>
        </div>
        <div className="space-y-8">
          {FORMATS.map((fmt) => {
            const Icon = fmt.icon
            return (
              <Card key={fmt.name} id={fmt.name.toLowerCase().replace(/\s+/g, '-')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-2xl">{fmt.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {fmt.what}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground sm:text-base">
                  <div>
                    <h3 className="font-semibold text-foreground">How it works</h3>
                    <p className="mt-1 leading-relaxed">{fmt.how}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">When to use it</h3>
                    <p className="mt-1 leading-relaxed">{fmt.whenToUse}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4" aria-hidden="true" /> Pros
                      </h3>
                      <ul className="mt-1 space-y-1 pl-5">
                        {fmt.pros.map((pro) => (
                          <li key={pro} className="list-disc leading-relaxed">{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                        <X className="h-4 w-4" aria-hidden="true" /> Cons
                      </h3>
                      <ul className="mt-1 space-y-1 pl-5">
                        {fmt.cons.map((con) => (
                          <li key={con} className="list-disc leading-relaxed">{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-labelledby="comparison-title">
        <div className="mb-8 text-center">
          <h2 id="comparison-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Format comparison
          </h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Round Robin</th>
                <th className="px-4 py-3 font-semibold">Swiss</th>
                <th className="px-4 py-3 font-semibold">Single Elim</th>
                <th className="px-4 py-3 font-semibold">Adjacent Swiss</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} className={i < COMPARISON_ROWS.length - 1 ? 'border-b border-border/60' : ''}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.rr}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.swiss}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.elim}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.adjSwiss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6" aria-labelledby="faq-title">
        <div className="mb-8 text-center">
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Try all four formats — free
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Switch formats per round, compare results, and find the format that fits your event.
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
