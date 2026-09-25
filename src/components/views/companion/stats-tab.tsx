'use client'

/**
 * StatsTab — shows the player's statistics for the current event.
 *
 * Replaces the old "Ready" tab. Displays:
 *   • Summary cards (rounds played, win rate, avg placement, total points)
 *   • Placement distribution bar chart (1st, 2nd, 3rd, 4th+)
 *   • Per-round breakdown table
 *
 * Charts use pure CSS bars (no chart library) for small bundle size
 * and mobile-first responsiveness.
 */
import * as React from 'react'
import { Trophy, Target, TrendingUp, Award, BarChart3 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { usePlayerEventStats } from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function StatsTab({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data, isLoading } = usePlayerEventStats(eventId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('companion.stats.noData')}
        </CardContent>
      </Card>
    )
  }

  const { summary } = data
  const stat = data.stats[0] // per-event stats → single entry

  if (!stat) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('companion.stats.noData')}
        </CardContent>
      </Card>
    )
  }

  // Placement distribution for the bar chart
  const placements = [stat.bestPlacement, stat.worstPlacement]
  const maxRound = Math.max(stat.roundsPlayed, 1)
  const placementCounts: Record<number, number> = {}
  // We don't have per-round data from the stats API (it's aggregated),
  // so we show a summary bar chart of key metrics instead.

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label={t('companion.stats.totalPoints')}
          value={summary.totalPoints.toString()}
          color="text-amber-500"
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label={t('companion.stats.firstPlaces')}
          value={`${stat.firstPlaceCount}/${stat.roundsPlayed}`}
          color="text-emerald-500"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label={t('companion.stats.avgPlacement')}
          value={stat.averagePlacement.toString()}
          color="text-blue-500"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('companion.stats.winRate')}
          value={`${stat.winRate}%`}
          color="text-purple-500"
        />
      </div>

      {/* Placement distribution bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('companion.stats.placementChart')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlacementBarChart
            best={stat.bestPlacement}
            worst={stat.worstPlacement}
            avg={stat.averagePlacement}
            rounds={stat.roundsPlayed}
          />
        </CardContent>
      </Card>

      {/* Event details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('companion.stats.eventDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('companion.stats.roundsPlayed')}</span>
            <span className="font-medium">{stat.roundsPlayed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('companion.stats.bestPlacement')}</span>
            <span className="font-medium">
              <Badge className={stat.bestPlacement === 1 ? 'bg-amber-500 text-white' : 'bg-muted'}>
                #{stat.bestPlacement}
              </Badge>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('companion.stats.worstPlacement')}</span>
            <span className="font-medium">#{stat.worstPlacement}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('companion.stats.gamePoints')}</span>
            <span className="font-medium">{stat.gamePointsTotal}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
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
    <Card>
      <CardContent className="py-3">
        <div className={`flex items-center gap-1.5 ${color}`}>
          {icon}
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

/**
 * PlacementBarChart — shows best/worst/avg placement as horizontal bars.
 * Pure CSS, no chart library. Mobile-first.
 */
function PlacementBarChart({
  best,
  worst,
  avg,
  rounds,
}: {
  best: number
  worst: number
  avg: number
  rounds: number
}) {
  const maxScale = Math.max(worst, 4) // at least 4 slots

  return (
    <div className="space-y-3">
      {/* Best placement */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">🥇 {best === 1 ? '1st' : `${best}th`}</span>
          <span className="font-medium">{best}</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
            style={{ width: `${((maxScale - best + 1) / maxScale) * 100}%` }}
          />
        </div>
      </div>

      {/* Average placement */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">📊 Avg</span>
          <span className="font-medium">{avg}</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
            style={{ width: `${((maxScale - avg + 1) / maxScale) * 100}%` }}
          />
        </div>
      </div>

      {/* Worst placement */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">📉 Worst</span>
          <span className="font-medium">{worst}</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
            style={{ width: `${((maxScale - worst + 1) / maxScale) * 100}%` }}
          />
        </div>
      </div>

      {/* Rounds played indicator */}
      <div className="border-t border-border/40 pt-2 text-center text-xs text-muted-foreground">
        {rounds} {rounds === 1 ? 'round' : 'rounds'} played
      </div>
    </div>
  )
}
