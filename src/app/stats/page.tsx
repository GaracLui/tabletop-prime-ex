'use client'

/**
 * Stats page — replaces the inline GlobalStats component that used to live
 * on the account page.
 *
 * Shows the current user's stats across ALL events they've participated in:
 *   • Summary cards (total events, total wins, avg placement, win rate)
 *   • Win rate donut (CSS/SVG, no chart library)
 *   • Per-game breakdown (grouped by game name)
 *
 * The chart components (StatCard, WinRateDonut, StatsContent) were moved
 * here verbatim from src/components/global-stats.tsx.
 */
import * as React from 'react'
import { Trophy, Target, TrendingUp, Award, BarChart3, Gamepad2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { usePlayerGlobalStats } from '@/hooks/use-event-data'
import { Logo } from '@/components/layout/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function StatsPage() {
  const { t } = useI18n()
  const { data, isLoading } = usePlayerGlobalStats()

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
            {t('stats.backToHome')}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('companion.stats.globalTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('stats.description')}
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              {t('stats.loading')}
            </CardContent>
          </Card>
        ) : !data || !data.summary || data.stats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('stats.noData')}
            </CardContent>
          </Card>
        ) : (
          <StatsContent summary={data.summary} stats={data.stats} />
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats content — moved verbatim from src/components/global-stats.tsx
// ---------------------------------------------------------------------------

interface StatsSummary {
  totalEvents: number
  totalRounds: number
  totalPoints: number
  totalGamePoints: number
  totalFirstPlaces: number
  averagePlacement: number
  overallWinRate: number
}

interface StatEntry {
  eventId: string
  eventName: string
  gameName: string
  roundsPlayed: number
  totalPoints: number
  gamePointsTotal: number
  averagePlacement: number
  bestPlacement: number
  worstPlacement: number
  firstPlaceCount: number
  winRate: number
}

function StatsContent({
  summary,
  stats,
}: {
  summary: StatsSummary
  stats: StatEntry[]
}) {
  const { t } = useI18n()

  // Group stats by game name
  const byGame = new Map<
    string,
    { count: number; wins: number; rounds: number; totalPoints: number }
  >()
  for (const s of stats) {
    const existing =
      byGame.get(s.gameName) || { count: 0, wins: 0, rounds: 0, totalPoints: 0 }
    existing.count++
    existing.wins += s.firstPlaceCount
    existing.rounds += s.roundsPlayed
    existing.totalPoints += s.totalPoints
    byGame.set(s.gameName, existing)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t('companion.stats.globalTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label={t('companion.stats.totalEvents')}
            value={summary.totalEvents.toString()}
            color="text-amber-500"
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label={t('companion.stats.totalWins')}
            value={summary.totalFirstPlaces.toString()}
            color="text-emerald-500"
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label={t('companion.stats.avgPlacement')}
            value={summary.averagePlacement.toString()}
            color="text-blue-500"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t('companion.stats.overallWinRate')}
            value={`${summary.overallWinRate}%`}
            color="text-purple-500"
          />
        </div>

        {/* Win rate donut */}
        <div className="flex items-center justify-center gap-6">
          <WinRateDonut
            wins={summary.totalFirstPlaces}
            total={summary.totalRounds}
            rate={summary.overallWinRate}
          />
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              {summary.totalRounds}{' '}
              {summary.totalRounds === 1
                ? t('companion.stats.round')
                : t('companion.stats.rounds')}
              {' '}
              {t('companion.stats.played')}
            </p>
            <p className="text-muted-foreground">
              {summary.totalPoints} {t('companion.stats.totalPoints')}
            </p>
            <p className="text-muted-foreground">
              {summary.totalGamePoints} {t('companion.stats.gamePoints')}
            </p>
          </div>
        </div>

        {/* By game breakdown */}
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
            {t('companion.stats.byGame')}
          </h4>
          <ul className="space-y-1.5">
            {Array.from(byGame.entries())
              .sort((a, b) => b[1].rounds - a[1].rounds)
              .map(([game, data]) => (
                <li
                  key={game}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {game}
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {data.rounds}r
                    </Badge>
                    <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      {data.wins}w
                    </Badge>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-components — moved verbatim from src/components/global-stats.tsx
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className={`flex items-center gap-1.5 ${color}`}>{icon}</div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * WinRateDonut — shows win rate as a donut chart using SVG stroke-dasharray.
 * No chart library needed — pure SVG, works on all modern browsers.
 */
function WinRateDonut({
  wins,
  total,
  rate,
}: {
  wins: number
  total: number
  rate: number
}) {
  const size = 80
  const thickness = 12
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  // SVG stroke-dasharray approach — more precise than conic-gradient
  const winDash = (rate / 100) * circumference
  const lossDash = circumference - winDash

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {/* Win arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={thickness}
          strokeDasharray={`${winDash} ${lossDash}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums">{rate}%</span>
        <span className="text-[10px] text-muted-foreground">
          {wins}/{total}
        </span>
      </div>
    </div>
  )
}
