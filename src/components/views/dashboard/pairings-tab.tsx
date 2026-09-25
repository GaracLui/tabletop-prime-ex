'use client'

/**
 * Pairings tab — round generation, table grid with conflict badges,
 * drop/reintroduce/reassign via dropdown.
 *
 * Sub-components:
 *   - PairingsTabApi       (orchestrator)
 *   - AutoAdvanceBanner    (prompt shown when all tables are scored)
 *   - TableCard            (one card per table in the current round)
 *   - PlayerRow            (chip with rematch badge + kebab menu)
 *   - DroppedPlayersPanel  (Re-add panel for dropped players)
 *
 * Sibling files in this folder:
 *   - quick-score-dialog.tsx (QuickScoreButtonApi)
 *   - round-status-card.tsx  (RoundStatusCard)
 */
import * as React from 'react'
import {
  Users,
  Dices,
  RefreshCw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  UserMinus,
  UserPlus,
  ArrowRight,
  Plus,
  Sparkles,
  Search,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { formatRoundFormat, formatScoreState } from '@/lib/format'
import {
  useEvent,
  useUpdateEvent,
  useGeneratePairings,
  usePatchPairing,
  useCreateBonusRound,
  useDeleteBonusRound,
} from '@/hooks/use-event-data'
import { ShareButton } from '@/lib/share/share-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { QuickScoreButtonApi } from './quick-score-dialog'
import { RoundStatusCard } from './round-status-card'
import { PlayerChipInline } from '@/components/player-chip'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * For each player at the current table, count how many of the OTHER players
 * at this table they have already shared a table with in a previous round.
 * Each opponent is counted at most once (we only care whether they've met,
 * not how many times).
 */
export function computeConflictCounts(
  players: any[],
  previousRounds: any[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of players) {
    let count = 0
    for (const other of players) {
      if (other.id === p.id) continue
      for (const prev of previousRounds) {
        const prevTable = prev.tables.find((t: any) => t.playerIds.includes(p.id))
        if (prevTable && prevTable.playerIds.includes(other.id)) {
          count++
          break
        }
      }
    }
    counts[p.id] = count
  }
  return counts
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export function PairingsTabApi({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data } = useEvent(eventId)
  const generatePairings = useGeneratePairings(eventId)
  const patchPairing = usePatchPairing(eventId)
  const updateEvent = useUpdateEvent(eventId)
  const { toast } = useToast()

  // Track whether the user has explicitly changed the format dropdown.
  // If not, we send `undefined` so the API uses the round config.
  // NOTE: must be declared BEFORE any early return — React Hooks rule.
  const [formatOverride, setFormatOverride] = React.useState<string | null>(null)

  const event = data?.event
  if (!event) return <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>

  const currentRound = event.pairings?.find((p: any) => p.round === event.currentRound)

  // The format for the NEXT round comes from the round config (if set),
  // otherwise falls back to the event's current round format, otherwise
  // ROUND_ROBIN. This ensures the Round Config tab's settings are actually
  // respected when generating pairings.
  // v6: legacy 'CUSTOM' values (pre-migration databases) are treated as ROUND_ROBIN.
  const normalizeFormat = (v?: string | null): string => (v === 'CUSTOM' ? 'ROUND_ROBIN' : (v || 'ROUND_ROBIN'))
  const nextRound = event.currentRound + 1
  const nextRoundConfig = event.roundConfigs?.find((rc: any) => rc.round === nextRound)
  const defaultFormat = normalizeFormat(nextRoundConfig?.format ?? currentRound?.format ?? 'ROUND_ROBIN')

  const format = formatOverride ?? defaultFormat

  const handleGenerate = async () => {
    try {
      // Send format only if the user explicitly changed it; otherwise let
      // the API fall back to the round config.
      const result = await generatePairings.mutateAsync({
        action: 'generate',
        format: formatOverride ?? undefined,
      })
      const roundNum = String(event.currentRound + 1)
      const diag = result?.diagnostics
      if (diag && !diag.feasible) {
        // Rematches remain — show amber warning with details
        const tables = (diag.conflictTableNumbers || []).join(', ')
        toast({
          title: t('dashboard.roundGenerated').replace('{round}', roundNum),
          description: t('dashboard.diagConflictsRemain')
            .replace('{count}', String(diag.conflictCount))
            .replace('{tables}', tables) +
            (diag.terminatedByTime ? ' ' + t('dashboard.diagTimeLimited') : ''),
          variant: 'default',
        })
      } else {
        toast({ title: t('dashboard.roundGenerated').replace('{round}', roundNum) })
      }
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  const handleRegenerate = async () => {
    if (!currentRound) return
    try {
      const result = await generatePairings.mutateAsync({
        action: 'regenerate',
        format: formatOverride ?? undefined,
        round: event.currentRound,
      })
      const roundNum = String(event.currentRound)
      const diag = result?.diagnostics
      if (diag && !diag.feasible) {
        const tables = (diag.conflictTableNumbers || []).join(', ')
        toast({
          title: t('dashboard.roundRegeneratedToast').replace('{round}', roundNum),
          description: t('dashboard.diagConflictsRemain')
            .replace('{count}', String(diag.conflictCount))
            .replace('{tables}', tables) +
            (diag.terminatedByTime ? ' ' + t('dashboard.diagTimeLimited') : ''),
          variant: 'default',
        })
      } else {
        toast({ title: t('dashboard.roundRegeneratedToast').replace('{round}', roundNum) })
      }
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {currentRound && <RoundStatusCard event={event} currentRound={currentRound} />}

      <AutoAdvanceBanner
        event={event}
        currentRound={currentRound}
        isPending={generatePairings.isPending}
        onGenerate={handleGenerate}
        onFinish={() => {
          updateEvent.mutate({ status: 'FINISHED' })
          toast({ title: t('dashboard.eventFinished') })
        }}
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">
              {event.currentRound > 0
                ? t('dashboard.roundOf').replace('{current}', String(event.currentRound)).replace('{total}', String(event.totalRounds))
                : t('dashboard.noRoundsGenerated')}
            </CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* v6: Share button on its own row on mobile (was wrapping next to
                the format dropdown, which looked cramped). On sm+ it stays
                inline with the other actions. */}
            <div className="flex">
              <ShareButton
                event={event}
                currentPairing={currentRound}
                players={event.players || []}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FormatSelect
                value={format}
                onChange={(v) => setFormatOverride(v)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {formatOverride && formatOverride !== defaultFormat && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setFormatOverride(null)}
                  title={t('dashboard.resetToRoundConfigDefault')}
                >
                  {t('common.reset')}
                </Button>
              )}
              {currentRound && (
                <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={generatePairings.isPending}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('dashboard.regenerate')}</span><span className="sm:hidden">{t('dashboard.regen')}</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generatePairings.isPending || event.currentRound >= event.totalRounds}
              >
                <Dices className="mr-1 h-3.5 w-3.5" /> {currentRound ? t('dashboard.nextRound') : t('dashboard.generate')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {currentRound ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentRound.tables.map((table: any) => (
            <TableCard
              key={table.tableNumber}
              eventId={eventId}
              table={table}
              event={event}
              currentRound={currentRound}
              patchPairing={patchPairing}
              toast={toast}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('dashboard.emptyPairings')}
          </CardContent>
        </Card>
      )}

      <DroppedPlayersPanel
        event={event}
        currentRound={currentRound}
        patchPairing={patchPairing}
        toast={toast}
      />

      {/* Bonus rounds section */}
      <BonusRoundsSection eventId={eventId} event={event} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Format select — extracted so the option list isn't duplicated
// ---------------------------------------------------------------------------

function FormatSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  return (
    <Select value={value} onValueChange={onChange}>
      {/* w-[180px] (was 140px) so the longest label ("Adjacent Swiss") doesn't
          get truncated, especially on es ("Suizo Adyacente"). min-w-0 keeps it
          shrinkable inside flex on very narrow viewports. */}
      <SelectTrigger className="w-[180px] min-w-0 gap-1 font-medium">
        <span className="text-xs text-muted-foreground">{t('dashboard.format')}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ROUND_ROBIN">{formatRoundFormat('ROUND_ROBIN', t)}</SelectItem>
        <SelectItem value="SWISS">{formatRoundFormat('SWISS', t)}</SelectItem>
        <SelectItem value="SINGLE_ELIM">{formatRoundFormat('SINGLE_ELIM', t)}</SelectItem>
        <SelectItem value="ADJACENT_SWISS">{formatRoundFormat('ADJACENT_SWISS', t)}</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Auto-advance banner
// ---------------------------------------------------------------------------

function AutoAdvanceBanner({
  event,
  currentRound,
  isPending,
  onGenerate,
  onFinish,
}: {
  event: any
  currentRound: any
  isPending: boolean
  onGenerate: () => void
  onFinish: () => void
}) {
  const { t } = useI18n()
  if (!currentRound) return null

  const totalTables = currentRound.tables.length
  const scoredTables = currentRound.tables.filter((table: any) => {
    const score = event.scores?.find(
      (s: any) => s.tableNumber === table.tableNumber && s.round === event.currentRound,
    )
    return score && (score.state === 'LOCKED' || score.state === 'DISPUTED')
  }).length
  const allScored = scoredTables === totalTables && totalTables > 0
  if (!allScored) return null

  const isLastRound = event.currentRound >= event.totalRounds
  return (
    <div className="relative overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          {isLastRound ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">
            {isLastRound ? t('dashboard.allRoundsComplete') : t('dashboard.advanceBannerTitle').replace('{round}', String(event.currentRound))}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLastRound
              ? t('dashboard.markEventFinished')
              : t('dashboard.advanceBannerDesc')}
          </p>
        </div>
        {isLastRound ? (
          <Button size="sm" onClick={onFinish}>
            <Trophy className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.advanceFinishEvent')}
          </Button>
        ) : (
          <Button size="sm" className="w-full sm:w-auto" onClick={onGenerate} disabled={isPending}>
            <Dices className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.advanceGenerateNow').replace('{round}', String(event.currentRound + 1))}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table card
// ---------------------------------------------------------------------------

function TableCard({
  eventId,
  table,
  event,
  currentRound,
  patchPairing,
  toast,
}: {
  eventId: string
  table: any
  event: any
  currentRound: any
  patchPairing: any
  toast: any
}) {
  const { t } = useI18n()
  const players = (event.players || []).filter((p: any) => table.playerIds.includes(p.id))
  const score = event.scores?.find(
    (s: any) => s.tableNumber === table.tableNumber && s.round === event.currentRound,
  )

  const previousRounds = (event.pairings || []).filter((r: any) => r.round < event.currentRound)
  const conflictCounts = computeConflictCounts(players, previousRounds)
  const tableConflicts = Object.values(conflictCounts).reduce(
    (a: number, b: any) => a + (b as number),
    0,
  )

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {table.tableNumber}
          </span>
          <span className="text-sm font-medium">{t('dashboard.table')}</span>
          {score && (
            <Badge
              className={
                score.state === 'LOCKED' ? 'bg-emerald-500 text-white'
                : score.state === 'PENDING_CONFIRM' ? 'bg-amber-500 text-white'
                : 'bg-rose-500 text-white'
              }
            >
              {formatScoreState(score.state, t)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {tableConflicts > 0 && (
            <Badge
              variant="outline"
              className="gap-1 text-amber-700 dark:text-amber-400 border-amber-500/40"
              title={t('dashboard.rematchPairsTitle')}
            >
              <AlertCircle className="h-3 w-3" />{tableConflicts / 2 | 0}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{players.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {players.map((p: any) => (
          <PlayerRow
            key={p.id}
            player={p}
            conflictCount={conflictCounts[p.id] || 0}
            currentRound={currentRound}
            tableNumber={table.tableNumber}
            patchPairing={patchPairing}
            toast={toast}
          />
        ))}
        <QuickScoreButtonApi
          eventId={eventId}
          tableNumber={table.tableNumber}
          round={event.currentRound}
          players={players}
        />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Player row — chip with rematch badge + kebab menu (reassign / drop)
// ---------------------------------------------------------------------------

function PlayerRow({
  player,
  conflictCount,
  currentRound,
  tableNumber,
  patchPairing,
  toast,
}: {
  player: any
  conflictCount: number
  currentRound: any
  tableNumber: number
  patchPairing: any
  toast: any
}) {
  const { t } = useI18n()
  const p = player
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <PlayerChipInline player={p} />
      {/* Badges + menu: flex-shrink-0 so they never get squeezed */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {conflictCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1 text-xs text-amber-700 dark:text-amber-400 border-amber-500/40"
            title={t('dashboard.rematchHint').replace('{count}', String(conflictCount))}
          >
            <AlertCircle className="h-3 w-3" />{conflictCount}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" disabled={patchPairing.isPending}
              aria-label={t('dashboard.reassignTo')}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('dashboard.reassignTo')}</DropdownMenuLabel>
          {currentRound.tables
            .filter((tbl: any) => tbl.tableNumber !== tableNumber)
            .map((tbl: any) => (
              <DropdownMenuItem
                key={tbl.tableNumber}
                onClick={async () => {
                  try {
                    await patchPairing.mutateAsync({
                      round: currentRound.round,
                      action: 'reassign',
                      playerId: p.id,
                      toTableNumber: tbl.tableNumber,
                    })
                    toast({ title: t('dashboard.playerMovedToTable').replace('{name}', p.name).replace('{table}', String(tbl.tableNumber)) })
                  } catch (err: any) {
                    toast({ title: err.message, variant: 'destructive' })
                  }
                }}
              >
                {t('dashboard.roundStatusTable').replace('{n}', String(tbl.tableNumber))} <ArrowRight className="ml-auto h-3 w-3" />
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-700"
            onClick={async () => {
              try {
                await patchPairing.mutateAsync({
                  round: currentRound.round,
                  action: 'drop',
                  playerId: p.id,
                })
                toast({ title: t('dashboard.playerDroppedName').replace('{name}', p.name).replace('{round}', String(currentRound.round)) })
              } catch (err: any) {
                toast({ title: err.message, variant: 'destructive' })
              }
            }}
          >
            <UserMinus className="mr-2 h-3 w-3" /> {t('dashboard.dropPlayer')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dropped players panel — shown when the current round has any droppedPlayerIds
// ---------------------------------------------------------------------------

function DroppedPlayersPanel({
  event,
  currentRound,
  patchPairing,
  toast,
}: {
  event: any
  currentRound: any
  patchPairing: any
  toast: any
}) {
  const { t } = useI18n()
  if (!currentRound || !currentRound.droppedPlayerIds?.length) return null

  return (
    <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserMinus className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          {t('dashboard.droppedFromRound').replace('{round}', String(event.currentRound))}
          <Badge variant="secondary" className="ml-1">{currentRound.droppedPlayerIds.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          {t('dashboard.droppedFromRoundDesc')}
        </p>
        <ul className="flex flex-wrap gap-2">
          {currentRound.droppedPlayerIds.map((pid: string) => {
            const p = (event.players || []).find((pl: any) => pl.id === pid)
            if (!p) return null
            return (
              <li
                key={pid}
                className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-background px-2.5 py-1.5 text-sm"
              >
                <PlayerChipInline player={p} />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  disabled={patchPairing.isPending}
                  onClick={async () => {
                    try {
                      await patchPairing.mutateAsync({
                        round: event.currentRound,
                        action: 'reintroduce',
                        playerId: pid,
                      })
                      toast({ title: t('dashboard.playerReintroducedName').replace('{name}', p.name).replace('{round}', String(event.currentRound)) })
                    } catch (err: any) {
                      toast({ title: err.message, variant: 'destructive' })
                    }
                  }}
                >
                  <UserPlus className="mr-1 h-3 w-3" /> {t('dashboard.reintroduce')}
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Bonus Rounds section — organizer creates custom rounds with a subset of players
// ---------------------------------------------------------------------------

export function BonusRoundsSection({ eventId, event }: { eventId: string; event: any }) {
  const { t } = useI18n()
  const bonusRounds = (event.pairings || []).filter((p: any) => p.isBonus)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {t('dashboard.bonusRounds')}
        </h2>
        <CreateBonusRoundDialog eventId={eventId} players={event.players || []} event={event} />
      </div>

      {bonusRounds.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('dashboard.noBonusRounds')}
          </CardContent>
        </Card>
      ) : (
        bonusRounds.map((round: any) => (
          <BonusRoundCard key={round.round} eventId={eventId} event={event} round={round} />
        ))
      )}
    </div>
  )
}

function BonusRoundCard({ eventId, event, round }: { eventId: string; event: any; round: any }) {
  const { t } = useI18n()
  const deleteBonusRound = useDeleteBonusRound(eventId)
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      await deleteBonusRound.mutateAsync(round.round)
      toast({ title: t('dashboard.bonusRoundDeleted').replace('{label}', round.label) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.failedToDelete'), variant: 'destructive' })
    }
  }

  // Build the parent round label: "Extra" for parentRound=0, "Round N" for 1+
  const parentLabel = round.parentRound > 0
    ? t('dashboard.appliesRound').replace('{n}', String(round.parentRound))
    : t('dashboard.extra')

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="flex-1 min-w-0 truncate">{round.label || t('dashboard.bonusRoundN').replace('{n}', String(round.round))}</span>
          <Badge variant="outline" className="text-xs flex-shrink-0">{parentLabel}</Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={handleDelete}
            disabled={deleteBonusRound.isPending}
            aria-label={t('dashboard.deleteBonusRound')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {round.tables.map((table: any) => {
          const tablePlayers = (event.players || []).filter((p: any) => table.playerIds.includes(p.id))
          const score = event.scores?.find(
            (s: any) => s.tableNumber === table.tableNumber && s.round === round.round,
          )
          return (
            <div key={table.tableNumber}>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {table.tableNumber}
                </span>
                {t('dashboard.table')}
                {score && (
                  <Badge className={
                    score.state === 'LOCKED' ? 'bg-emerald-500 text-white' :
                    score.state === 'PENDING_CONFIRM' ? 'bg-amber-500 text-white' :
                    'bg-rose-500 text-white'
                  }>{formatScoreState(score.state, t)}</Badge>
                )}
              </div>
              <div className="space-y-1">
                {tablePlayers.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm">
                    <PlayerChipInline player={p} />
                  </div>
                ))}
              </div>
              <QuickScoreButtonApi
                eventId={eventId}
                tableNumber={table.tableNumber}
                round={round.round}
                players={tablePlayers}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function CreateBonusRoundDialog({ eventId, players, event }: { eventId: string; players: any[]; event: any }) {
  const { t } = useI18n()
  const createBonusRound = useCreateBonusRound(eventId)
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('ROUND_ROBIN')
  // parentRound: 0 = "Extra" (not tied to any regular round), 1+ = associated with that round
  const [parentRound, setParentRound] = React.useState('0')

  const filteredPlayers = search.trim()
    ? players.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : players

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!label.trim() || selectedIds.size < 2) return
    try {
      await createBonusRound.mutateAsync({
        label: label.trim(),
        playerIds: Array.from(selectedIds),
        format,
        parentRound: Number(parentRound),
      })
      toast({ title: t('dashboard.bonusRoundCreated').replace('{label}', label.trim()) })
      setOpen(false)
      setLabel('')
      setSelectedIds(new Set())
      setSearch('')
      setParentRound('0')
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  // Build parent round options: "Extra" + one option per regular round (1..totalRounds)
  const totalRounds = event?.totalRounds ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.bonusRound')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dashboard.createBonusRound')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.createBonusRoundDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bonus-label">{t('dashboard.roundLabel')}</Label>
            <Input
              id="bonus-label"
              placeholder={t('dashboard.bonusLabelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('dashboard.format')}</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUND_ROBIN">{formatRoundFormat('ROUND_ROBIN', t)}</SelectItem>
                  <SelectItem value="SWISS">{formatRoundFormat('SWISS', t)}</SelectItem>
                  <SelectItem value="SINGLE_ELIM">{formatRoundFormat('SINGLE_ELIM', t)}</SelectItem>
                  <SelectItem value="ADJACENT_SWISS">{formatRoundFormat('ADJACENT_SWISS', t)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dashboard.associatedWith')}</Label>
              <Select value={parentRound} onValueChange={setParentRound}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('dashboard.extraStandalone')}</SelectItem>
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                    <SelectItem key={r} value={String(r)}>{t('dashboard.appliesRound').replace('{n}', String(r))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('dashboard.playersSelected').replace('{n}', String(selectedIds.size))}</Label>
            {players.length > 5 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('dashboard.searchPlayers')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            )}
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
              {filteredPlayers.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => togglePlayer(p.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <PlayerChipInline player={p} />
                </label>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">{t('dashboard.noPlayersMatch')}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleCreate} disabled={!label.trim() || selectedIds.size < 2 || createBonusRound.isPending}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
