'use client'

/**
 * RoundStatusCard — per-table score status grid for the current round.
 * Shows a progress bar and a colored chip per table indicating score state
 * (Missing / Pending / Locked / Disputed).
 *
 * Extracted from pairings-tab.tsx.
 */
import { Users } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { formatScoreState } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function RoundStatusCard({ event, currentRound }: { event: any; currentRound: any }) {
  const { t } = useI18n()
  const totalTables = currentRound.tables.length
  if (totalTables === 0) return null

  const scoredTables = currentRound.tables.filter((table: any) => {
    const score = event.scores?.find(
      (s: any) => s.tableNumber === table.tableNumber && s.round === event.currentRound,
    )
    return score && (score.state === 'LOCKED' || score.state === 'DISPUTED')
  }).length
  const allScored = scoredTables === totalTables
  const progressPct = totalTables > 0 ? (scoredTables / totalTables) * 100 : 0

  return (
    <Card className={allScored ? 'border-emerald-500/50 bg-emerald-500/5' : ''}>
      <CardContent className="pb-3 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('dashboard.roundStatusTitle').replace('{round}', String(event.currentRound))}</p>
            <p className="text-xs text-muted-foreground">
              {allScored
                ? t('dashboard.roundStatusAllLocked')
                : t('dashboard.roundStatusSummary').replace('{locked}', String(scoredTables)).replace('{total}', String(totalTables))}
            </p>
          </div>
          <Badge
            className={allScored ? 'bg-emerald-500 text-white' : ''}
            variant={allScored ? 'default' : 'secondary'}
          >
            {scoredTables} / {totalTables}
          </Badge>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={'h-full transition-all ' + (allScored ? 'bg-emerald-500' : 'bg-primary')}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {currentRound.tables.map((table: any) => {
            const score = event.scores?.find(
              (s: any) => s.tableNumber === table.tableNumber && s.round === event.currentRound,
            )
            const state = score?.state || 'MISSING'
            const players = (event.players || []).filter((p: any) => table.playerIds.includes(p.id))
            const stateColor =
              state === 'LOCKED' ? 'text-emerald-500'
              : state === 'PENDING_CONFIRM' ? 'text-amber-500'
              : state === 'DISPUTED' ? 'text-rose-500'
              : 'text-muted-foreground'
            const stateLabel = formatScoreState(state, t)
            const rowBorder =
              state === 'LOCKED' ? 'border-emerald-500/30 bg-emerald-500/5'
              : state === 'PENDING_CONFIRM' ? 'border-amber-500/30 bg-amber-500/5'
              : state === 'DISPUTED' ? 'border-rose-500/30 bg-rose-500/5'
              : 'border-border/60 bg-muted/20'
            return (
              <div
                key={table.tableNumber}
                className={'flex items-center gap-2 rounded-md border px-3 py-2 text-sm ' + rowBorder}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{t('dashboard.roundStatusTable').replace('{n}', String(table.tableNumber))}</span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />{players.length}
                    </span>
                  </div>
                  <span className={'text-xs ' + stateColor}>{stateLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
