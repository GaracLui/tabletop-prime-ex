'use client'

/**
 * Public share page — /share/[eventCode]
 *
 * Shows standings + current round pairings for an event.
 * NO LOGIN REQUIRED. Read-only. Auto-refreshes every 30s.
 *
 * This page is what gets shared via the ShareButton's link/QR code.
 * Parents, friends, and late arrivals can view results without an account.
 */
import * as React from 'react'
import { Trophy, Users, Sparkles, RefreshCw, Calendar, AlignLeft, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'
import { formatEventStatus } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/layout/logo'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EventBanner } from '@/components/event-banner'
import { PlayerChipInline } from '@/components/player-chip'
import { formatSession, scheduleCardLabel } from '@/lib/schedule'
import type { EventSession } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types (mirror the API response shape)
// ---------------------------------------------------------------------------

interface PublicEvent {
  id: string
  name: string
  gameName: string
  status: string
  currentRound: number
  totalRounds: number
  description?: string | null
  schedule?: EventSession[] | null
  bannerSeedOffset?: number
}

interface PublicStanding {
  name: string
  color: string
  total: number
  gamePointsTotal: number
  rounds: number
}

interface PublicPairing {
  round: number
  format: string
  label: string | null
  isBonus: boolean
  tables: Array<{
    tableNumber: number
    scoreState: string | null
    players: Array<{
      id: string
      name: string
      color: string
      placement: number | null
    }>
  }>
}

// ---------------------------------------------------------------------------
// ShareTableList — vertical player list with locked-score highlight
// ---------------------------------------------------------------------------

/**
 * Renders a single table's players as a vertical list (one per row).
 *
 * When the table's score is LOCKED or DISPUTED:
 *   • The container gets a faint green background + green border
 *   • Players are sorted by placement (1st at top)
 *   • Each player shows a placement badge (1, 2, 3...)
 *
 * When the score is not locked:
 *   • Plain background
 *   • Players in table order (no placement badge)
 */
function ShareTableList({
  table,
  t,
}: {
  table: PublicPairing['tables'][0]
  t: (key: string) => string
}) {
  const isScored = table.scoreState === 'LOCKED' || table.scoreState === 'DISPUTED'

  // Sort players by placement when score is locked (1st at top).
  // When not scored, keep original table order.
  const players = isScored
    ? [...table.players].sort((a, b) => {
        const pa = a.placement ?? 99
        const pb = b.placement ?? 99
        return pa - pb
      })
    : table.players

  return (
    <div
      className={
        'rounded-lg border ' +
        (isScored
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border/60 bg-muted/30')
      }
    >
      {/* Table header */}
      <div className="flex items-center gap-2 border-b border-inherit px-3 py-1.5 text-sm font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {table.tableNumber}
        </span>
        {t('dashboard.table')}
        {isScored && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {t('share.scoreLocked')}
          </span>
        )}
      </div>

      {/* Player list — vertical, one per row */}
      <ul className="divide-y divide-border/40">
        {players.map((p, i) => (
          <li
            key={p.id || i}
            className="flex items-center gap-2 px-3 py-1.5 text-sm"
          >
            {/* Placement badge (only when score is locked) */}
            {isScored && p.placement != null ? (
              <span
                className={
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' +
                  (p.placement === 1
                    ? 'bg-amber-500 text-white'
                    : p.placement === 2
                    ? 'bg-slate-400 text-white'
                    : p.placement === 3
                    ? 'bg-orange-700 text-white'
                    : 'bg-muted text-muted-foreground')
                }
              >
                {p.placement}
              </span>
            ) : (
              <span className="h-5 w-5 flex-shrink-0" />
            )}

            {/* Color dot + name */}
            <span className={'h-2.5 w-2.5 flex-shrink-0 rounded-full ' + p.color} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>
              {p.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function PublicSharePage({ params }: { params: Promise<{ eventCode: string }> }) {
  const { eventCode } = React.use(params)
  const { t } = useI18n()

  const [data, setData] = React.useState<{
    event: PublicEvent
    standings: PublicStanding[]
    pairings: PublicPairing[]
  } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date())

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${eventCode}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error(t('share.eventNotFound'))
        throw new Error(t('share.failedToLoad'))
      }
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [eventCode, t])

  React.useEffect(() => {
    fetchData()
    // Auto-refresh every 30s
    const interval = setInterval(fetchData, 30 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">{error || t('share.eventNotFound')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('share.checkCode')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { event, standings, pairings } = data
  const currentPairing = pairings.find((p) => p.round === event.currentRound)
  const bonusPairings = pairings.filter((p) => p.isBonus)

  // Schedule + description display — both optional. The schedule label
  // summarizes the next/last session for the header; the full list (if any)
  // is rendered as a separate card below the header.
  const scheduleLabel = scheduleCardLabel(event.schedule)
  const hasSchedule = Array.isArray(event.schedule) && event.schedule.length > 0
  const hasDescription =
    typeof event.description === 'string' && event.description.trim().length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Procedural banner — deterministic from (eventId + bannerSeedOffset) */}
        <EventBanner
          eventId={event.id}
          seedOffset={event.bannerSeedOffset ?? 0}
          variant="default"
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Logo size="md" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">{event.name}</h1>
              <p className="text-sm text-muted-foreground break-words">{event.gameName}</p>
              {scheduleLabel && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {scheduleLabel}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <Badge className={
              event.status === 'ACTIVE' ? 'bg-emerald-500 text-white' :
              event.status === 'FINISHED' ? 'bg-blue-500 text-white' :
              'bg-muted text-muted-foreground'
            }>
              {formatEventStatus(event.status, t)}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('dashboard.roundOf').replace('{current}', String(event.currentRound)).replace('{total}', String(event.totalRounds))}
            </p>
          </div>
        </div>

        {/* Description — shown above the standings when set. */}
        {hasDescription && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <p className="flex items-start gap-2 text-sm whitespace-pre-wrap break-words">
                <AlignLeft className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{event.description}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Schedule — full list shown when there are 2+ entries.
            Single-entry schedules are summarized in the header label above
            and don't need a dedicated card. */}
        {hasSchedule && (event.schedule!.length > 1) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {t('dashboard.metadata.schedule')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {event.schedule!.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                    <span className="font-medium">{formatSession(s)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Standings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t('dashboard.tabs.standings')}
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                {t('share.updatedAt').replace('{time}', lastRefresh.toLocaleTimeString())}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('share.noScores')}</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table className="min-w-[300px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('share.playerColumn')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t('dashboard.eventPoints')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">{t('dashboard.gamePoints')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">{t('share.roundsColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlayerChipInline name={row.name} color={row.color} medium />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">{row.total}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{row.gamePointsTotal}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{row.rounds}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current round pairings */}
        {currentPairing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                {currentPairing.label || t('share.roundPairings').replace('{n}', String(currentPairing.round))}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentPairing.tables.map((table) => (
                <ShareTableList key={table.tableNumber} table={table} t={t} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Bonus rounds */}
        {bonusPairings.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('share.bonusRounds')}
            </h2>
            {bonusPairings.map((br) => (
              <Card key={br.round} className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    {br.label || t('share.bonusRound').replace('{n}', String(br.round))}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {br.tables.map((table) => (
                    <ShareTableList key={table.tableNumber} table={table} t={t} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Logo size="sm" />
          <span>{t('share.poweredBy')}</span>
        </div>
      </div>
    </div>
  )
}
