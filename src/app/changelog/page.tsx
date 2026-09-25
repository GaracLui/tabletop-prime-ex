import type { Metadata } from 'next'
import { Clock, Zap, Shield, Wrench, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/layout/logo'

export const metadata: Metadata = {
  title: 'Changelog — TableTop Prime',
  description:
    'Release history and feature updates for TableTop Prime — tournament and league management for board game associations.',
  alternates: { canonical: 'https://tabletopprime.com/changelog' },
  openGraph: {
    title: 'Changelog — TableTop Prime',
    description: 'Release history and feature updates for TableTop Prime.',
    url: 'https://tabletopprime.com/changelog',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Changelog',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

interface Change {
  type: 'feature' | 'security' | 'fix' | 'design'
  title: string
  description: string
}

interface Release {
  version: string
  date: string
  changes: Change[]
}

const TYPE_META: Record<Change['type'], { icon: typeof Zap; color: string; label: string }> = {
  feature: { icon: Zap, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', label: 'Feature' },
  security: { icon: Shield, color: 'bg-red-500/10 text-red-700 dark:text-red-400', label: 'Security' },
  fix: { icon: Wrench, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', label: 'Fix' },
  design: { icon: Eye, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', label: 'Design' },
}

const RELEASES: Release[] = [
  {
    version: 'August 2026',
    date: '2026-08-20',
    changes: [
      {
        type: 'feature',
        title: 'Player Statistics page',
        description: 'Dedicated /stats page showing global tournament statistics: total events, wins, average placement, and win rate donut chart. Stats grouped by board game. Removed the inline stats from the Account page for a cleaner, dedicated experience.',
      },
      {
        type: 'feature',
        title: 'Event filters on My Events',
        description: 'Filter events by role (Organizer, Judge, Player) and status (Active, Draft, Finished). Client-side filtering with toggle button groups.',
      },
      {
        type: 'feature',
        title: 'BGG search improvements',
        description: 'Search results increased from 20 to 50. Results now sorted by relevance (exact match first, then starts-with, then by year). Selecting a game now auto-fills the min/max players per table.',
      },
      {
        type: 'fix',
        title: 'Companion table selection fix',
        description: 'The Player Companion now correctly shows the player\'s assigned table instead of defaulting to table 1. When the organizer regenerates a round or reassigns a player, the companion automatically switches to the new table.',
      },
      {
        type: 'fix',
        title: 'BGG search switched to local dataset',
        description: 'Replaced the live BGG XML API (which was returning 502 errors due to rate-limiting) with a local JSON dataset of 47,844 games. Search is now instant (< 5ms) with no external dependencies.',
      },
      {
        type: 'fix',
        title: 'Standardized share buttons',
        description: 'Share dropdown now consistently shows: Share link, Show QR code, Copy standings text, Copy pairings text — in the same order everywhere.',
      },
      {
        type: 'feature',
        title: 'Google AdSense integrated',
        description: 'Google AdSense auto-ads are now live. The script loads only after the user accepts "all cookies" in the consent banner — no ad cookies before consent. Privacy Policy, Terms of Service, and Cookie Policy updated with advertising sections including opt-out links.',
      },
      {
        type: 'feature',
        title: 'BoardGameGeek integration',
        description: 'Organizers can now search the BoardGameGeek database directly from the event creation and edit dialogs. A "Search BGG" button opens a dialog where you type a game name, search, and select from results. The selected game name auto-fills the form. Uses a server-side proxy with 24h caching to avoid BGG rate limits.',
      },
      {
        type: 'feature',
        title: 'Cookie consent banner',
        description: 'Added a GDPR/LGPD-compliant cookie consent banner. Users can choose "Accept all" (enables analytics + future advertising) or "Essential only" (auth + theme only). Vercel Analytics is now gated behind consent — no tracking cookies before the user agrees. A consent manager on the /cookies page lets users change their choice at any time.',
      },
      {
        type: 'security',
        title: 'Critical security fixes',
        description: 'Fixed role-escalation vulnerability where any user could set themselves as ORGANIZER. Removed cross-event IDOR on player and judge-call routes — all updates now scoped by (id, eventId). Added status whitelist and numeric range checks on PATCH event.',
      },
      {
        type: 'security',
        title: 'Strengthened event codes',
        description: 'Event codes now use crypto.getRandomValues() with an 8-char suffix (~40 bits of entropy, ~1 trillion combinations) instead of the previous 3-char Math.random() suffix (~20 bits).',
      },
      {
        type: 'security',
        title: 'CSV formula injection prevention',
        description: 'CSV export now neutralizes cells starting with =, +, -, @ by prepending a single quote — prevents spreadsheet formula execution from player names.',
      },
      {
        type: 'security',
        title: 'Security headers + error boundaries',
        description: 'Added HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy headers. Added error.tsx, global-error.tsx, and not-found.tsx so uncaught errors show a recovery UI instead of a white screen.',
      },
      {
        type: 'feature',
        title: 'Procedural event banners',
        description: 'Every event now has a unique, procedurally generated SVG banner derived from (eventId + seedOffset). 12 curated palettes × 6 pattern families (mesh, topographic, bokeh, geometric, waves, stipple). Organizers can reroll with one click.',
      },
      {
        type: 'feature',
        title: 'Event description + multi-date schedule',
        description: 'Organizers can add a plain-text description and multi-date schedule to each event. Displayed on the dashboard, My Events cards, and the public share page.',
      },
      {
        type: 'feature',
        title: 'Bonus round improvements',
        description: 'Bonus rounds now use the 1001+ numbering range (no collision with regular rounds). Added parentRound association, delete capability, and organizer UI for creating bonus rounds tied to a specific regular round.',
      },
      {
        type: 'feature',
        title: 'Full internationalization (en + es)',
        description: 'All ~700 user-visible strings internationalized. Browser language auto-detection on first visit. Dynamic <html lang> attribute. CSV headers translated. 705 keys in each language, verified by i18n-check script.',
      },
      {
        type: 'feature',
        title: 'OG image + PWA manifest + JSON-LD',
        description: 'Social share cards now show an OG image. Per-event generateMetadata on share pages. manifest.json for Add to Home Screen. Organization + WebSite structured data for Google rich results.',
      },
      {
        type: 'fix',
        title: 'Dropped/re-added player bug',
        description: 'Fixed bug where players dropped from a previous round and re-added would be dropped again on the next round. The previouslyDropped computation now checks only the latest round instead of unioning all rounds.',
      },
      {
        type: 'fix',
        title: 'Score permission model',
        description: 'Players can now only score their own table. Self-confirm is blocked — another player or organizer must confirm. Organizers can lock scores directly via Quick Score.',
      },
      {
        type: 'fix',
        title: 'Ready for Next Round implemented',
        description: 'The Ready toggle now persists server-side via PATCH /api/events/[eventId]/players/[playerId] with { ready: boolean }. Previously was a local-only no-op.',
      },
      {
        type: 'fix',
        title: 'Share page table redesign',
        description: 'Share page tables now show players as a vertical list. Locked tables get a faint green background + placement badges (gold/silver/bronze).',
      },
      {
        type: 'design',
        title: 'Warm color scheme',
        description: 'Replaced pure white backgrounds with warm off-white (oklch 0.985 0.002 75). Darkened muted-foreground for WCAG AA contrast. Fixed amber-600 text to amber-700 on light backgrounds.',
      },
      {
        type: 'design',
        title: 'Mobile overflow + WCAG fixes',
        description: 'Fixed tiebreaker row overflow on 375px screens. Bumped icon-only buttons to 36px minimum touch targets. Added aria-labels to all icon-only buttons. Fixed password show/hide toggle accessibility.',
      },
    ],
  },
  {
    version: 'July 2026',
    date: '2026-07-23',
    changes: [
      {
        type: 'feature',
        title: 'Initial production release',
        description: 'TableTop Prime launched with tournament management, dual-score verification, judge dispatch, CSV export, event templates, Supabase Auth (Google OAuth + email/password), and real-time judge call queue.',
      },
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Logo size="sm" />
          <span className="text-sm font-semibold tracking-tight">TableTop Prime</span>
          <a
            href="/"
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
            <Clock className="h-7 w-7 text-primary" aria-hidden="true" />
            Changelog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New features, security improvements, and bug fixes for TableTop Prime.
          </p>
        </div>

        <div className="space-y-8">
          {RELEASES.map((release) => (
            <section key={release.version}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="text-xl font-bold tracking-tight">{release.version}</h2>
                <time className="text-sm text-muted-foreground" dateTime={release.date}>
                  {new Date(release.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>

              <div className="space-y-3">
                {release.changes.map((change, i) => {
                  const meta = TYPE_META[change.type]
                  const Icon = meta.icon
                  return (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="flex items-start gap-3 py-4">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              {meta.label}
                            </Badge>
                          </div>
                          <h3 className="mt-1 text-sm font-semibold">{change.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {change.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TableTop Prime. All rights reserved.
        </p>
      </main>
    </div>
  )
}
