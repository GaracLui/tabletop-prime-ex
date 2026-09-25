/**
 * Player persona page content — English.
 *
 * Target keyword: "board game tournament companion app"
 * Server-rendered SEO landing page. CTAs are <a> links to /#auth.
 */
import { QrCode, Users, ClipboardCheck, Gavel, BarChart3, Repeat } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: QrCode,
    title: 'QR Code Check-In',
    desc: 'No app to install. Scan a QR code at the event or open a share link on your phone, enter your name, and you\'re checked in. The organizer sees your name appear in the player list instantly.',
  },
  {
    icon: Users,
    title: 'See Your Table & Opponents',
    desc: 'As soon as the organizer generates pairings, your table assignment appears on your phone. You see your table number, who you\'re playing against, and — if the organizer enabled seat rotation — which seat you\'re in.',
  },
  {
    icon: ClipboardCheck,
    title: 'Submit & Confirm Scores',
    desc: 'When your game is done, one player submits the score and another confirms it. Both players see the placements, game points, and total before it\'s locked — no more "I thought I got 2nd place" disputes.',
  },
  {
    icon: Gavel,
    title: 'Call a Judge',
    desc: 'Rules question? Score dispute? Tap "Call Judge" with your table number and issue category. A judge acknowledges your call instantly — you see that help is on the way without leaving your seat.',
  },
  {
    icon: BarChart3,
    title: 'Live Standings',
    desc: 'Watch the standings update in real time as other tables finish and confirm their scores. See your rank, your total points, and how you compare — no more walking to the results board.',
  },
  {
    icon: Repeat,
    title: 'Seat Rotation',
    desc: 'For games with first-player advantage (Catan, Carcassonne), the organizer can rotate seats each round. You\'ll see your seat number change automatically — over N rounds, you sit in every seat exactly once.',
  },
]

export function PlayerContentEn() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            No app install — runs in your phone's browser
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Board Game Tournament Companion App
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Check in with a QR code, see your table assignment, submit and confirm scores,
            call a judge, and follow live standings — all from your phone. No app to download,
            no account to create, no setup required.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find a tournament
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Check-in</dt>
            <dd className="mt-1 text-2xl font-semibold">QR code</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Setup</dt>
            <dd className="mt-1 text-2xl font-semibold">Zero</dd>
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
            Everything you need at the table
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            From check-in to final standings — your tournament experience, right in your pocket.
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
              <strong className="text-foreground">1. Get the link.</strong> Your organizer
              shares a QR code or link before the event. Scan it or tap it — the companion
              view opens in your phone's browser. No download, no account.
            </li>
            <li>
              <strong className="text-foreground">2. Check in.</strong> Enter your name
              (or confirm it if the organizer pre-registered you). You\'re checked in —
              the organizer sees you in the player list.
            </li>
            <li>
              <strong className="text-foreground">3. See your table.</strong> When pairings
              are generated, your table number, opponents, and seat (if enabled) appear on
              your screen. Walk to your table and start playing.
            </li>
            <li>
              <strong className="text-foreground">4. Submit the score.</strong> When the game
              is done, one player enters the placements and game points. A second player
              confirms. Both see the full breakdown before it\'s locked.
            </li>
            <li>
              <strong className="text-foreground">5. Follow the standings.</strong> As other
              tables finish, standings update live on your phone. See your rank, your points,
              and how the next round\'s pairings are shaping up — without leaving your seat.
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
            Ready to play?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Check in, see your table, submit scores, and follow live standings — all from
            your phone. No app install, no account, no cost.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find a tournament
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free · no app install · works in any mobile browser
          </p>
        </div>
      </section>
    </>
  )
}
