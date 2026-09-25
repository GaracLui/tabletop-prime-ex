/**
 * Judge persona page content — English.
 *
 * Target keyword: "tournament judge dispatch system"
 * Server-rendered SEO landing page. CTAs are <a> links to /#auth.
 */
import { ListChecks, Smartphone, ClipboardCheck, BarChart3, Layers, CheckCheck } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: ListChecks,
    title: 'Live Call Queue',
    desc: 'Players tap "Call Judge" with their table number and issue category. Judges see a live, mobile-optimized queue sorted by time. One-tap acknowledge prevents duplicate responses — no more "is someone coming?" confusion.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Optimized',
    desc: 'The judge queue runs in any mobile browser — no app install needed. Judges see table number, issue category (score dispute, rules question, other), and who called, all on one screen.',
  },
  {
    icon: ClipboardCheck,
    title: 'Score Dispute Resolution',
    desc: 'Judges can edit disputed scores directly from their phone. Changes are logged with a note explaining the adjustment. The dual-score verification system ensures full transparency — both players and the judge can see what changed and why.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Standings',
    desc: 'As scores are locked and confirmed, standings update instantly on the public share page. Parents, friends, and late arrivals can follow the tournament from home — no need to walk to the results board.',
  },
  {
    icon: Layers,
    title: 'Multi-Event Support',
    desc: 'Judges can be assigned to multiple events. Switch between events with one tap. Each event maintains its own call queue, scoring rules, and standings — no cross-contamination.',
  },
  {
    icon: CheckCheck,
    title: 'Acknowledge & Resolve',
    desc: 'Two-step workflow: acknowledge (tells the player help is coming) → resolve (marks the call as handled with an optional note). Clear status tracking means no call falls through the cracks.',
  },
]

export function JudgeContentEn() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            No app install — runs in any mobile browser
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Tournament Judge Dispatch System
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Players tap "Call Judge" from their phone. Judges see a live, mobile-optimized
            queue with table number, issue category, and one-tap acknowledge and resolve.
            Edit disputed scores, track call status, and keep the tournament moving —
            all without leaving your seat.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Set up judge dispatch
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Calls</dt>
            <dd className="mt-1 text-2xl font-semibold">Unlimited</dd>
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
            Keep the tournament moving
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            From the first call to the final resolution — TableTop Prime's judge dispatch
            system handles the chaos so judges can focus on the rules, not the logistics.
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
              <strong className="text-foreground">1. Organizer assigns judges.</strong> The
              event organizer adds judges as participants with the Judge role. Judges get
              access to the live call queue for that event.
            </li>
            <li>
              <strong className="text-foreground">2. Player calls a judge.</strong> A player
              taps "Call Judge" on their companion view, selects their table number and issue
              category (score dispute, rules question, or other), and submits.
            </li>
            <li>
              <strong className="text-foreground">3. Judge acknowledges.</strong> The call
              appears instantly in the judge queue. One tap acknowledges it — the player sees
              that help is on the way.
            </li>
            <li>
              <strong className="text-foreground">4. Judge resolves.</strong> The judge goes
              to the table, resolves the issue, and taps "Resolve" with an optional note. If
              a score needs editing, the judge can do it right there — changes are logged for
              transparency.
            </li>
            <li>
              <strong className="text-foreground">5. Tournament continues.</strong> The
              resolved call disappears from the queue. Standings update live on the public
              share page if a score was edited. No delays, no confusion.
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
            Ready to streamline your judge workflow?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Live call queue, score dispute resolution, and real-time standings — all from
            your phone.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Set up judge dispatch
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
