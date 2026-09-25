'use client'

/**
 * ScoreTab — player submits/Confirms the score at their table for the
 * current round. Implements dual-score verification:
 *   - First player submits → state goes to PENDING_CONFIRM
 *   - Another player confirms → state goes to LOCKED
 *   - Already locked → read-only view
 *
 * Extracted from companion-view.tsx.
 */
import * as React from 'react'
import { Send, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useSubmitScore } from '@/hooks/use-event-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { PlayerChipInline } from '@/components/player-chip'

const formatOrdinal = (n: number, t: (key: string) => string): string => {
  if (n === 1) return t('common.ordinal1')
  if (n === 2) return t('common.ordinal2')
  if (n === 3) return t('common.ordinal3')
  return t('common.ordinalN').replace('{n}', String(n))
}

export function ScoreTab({
  eventId,
  event,
  myPlayerId,
  isStaff = false,
}: {
  eventId: string
  event: any
  /** The current user's Player.id in this event, if they have one. */
  myPlayerId?: string
  /** Whether the user is an organizer or judge (can score any table). */
  isStaff?: boolean
}) {
  const { t } = useI18n()
  const submitScore = useSubmitScore(eventId)
  const { toast } = useToast()

  const currentRound = event.pairings?.find((p: any) => p.round === event.currentRound)

  // Find the player's own table in the current round
  const myTable = myPlayerId
    ? currentRound?.tables?.find((tbl: any) => tbl.playerIds.includes(myPlayerId))
    : undefined

  const [selectedTableNo, setSelectedTableNo] = React.useState('')
  const [placements, setPlacements] = React.useState<Record<string, { placement: number; gamePoints: number }>>({})

  // Default to the player's own table. Also re-selects when the player's
  // table changes (e.g., after the organizer regenerates the round or
  // reassigns the player to a different table).
  React.useEffect(() => {
    if (!currentRound?.tables?.length) return
    // For non-staff players: always force-select their own table.
    // If they're not seated, clear the selection.
    if (!isStaff && myPlayerId) {
      const newTable = currentRound.tables.find((t: any) =>
        t.playerIds.includes(myPlayerId)
      )
      const newTableNo = newTable ? String(newTable.tableNumber) : ''
      if (newTableNo !== selectedTableNo) {
        setSelectedTableNo(newTableNo)
      }
      return
    }
    // For staff: default to first table if nothing selected
    if (!selectedTableNo) {
      setSelectedTableNo(String(currentRound.tables[0].tableNumber))
    }
  }, [currentRound, selectedTableNo, myPlayerId, isStaff])

  const selectedTable = currentRound?.tables.find((t: any) => String(t.tableNumber) === selectedTableNo)
  const tablePlayers = selectedTable
    ? (event.players || []).filter((p: any) => selectedTable.playerIds.includes(p.id))
    : []

  const existingScore = event.scores?.find(
    (s: any) => s.tableNumber === Number(selectedTableNo) && s.round === event.currentRound,
  )

  React.useEffect(() => {
    if (existingScore) {
      const m: Record<string, { placement: number; gamePoints: number }> = {}
      for (const p of existingScore.placements) {
        m[p.playerId] = { placement: p.placement, gamePoints: p.gamePoints }
      }
      setPlacements(m)
    } else {
      setPlacements({})
    }
  }, [existingScore])

  if (!currentRound) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        {t('companion.noActiveRound')}
      </CardContent></Card>
    )
  }

  const isLocked = existingScore?.state === 'LOCKED'
  const isPending = existingScore?.state === 'PENDING_CONFIRM'

  const handleSubmit = async () => {
    if (!selectedTable) return
    const arr = tablePlayers.map((p: any) => ({
      playerId: p.id,
      placement: placements[p.id]?.placement ?? 0,
      gamePoints: placements[p.id]?.gamePoints ?? 0,
    }))
    if (arr.some((p) => p.placement === 0)) {
      toast({ title: t('dashboard.quickScorePickAll'), variant: 'destructive' })
      return
    }
    try {
      await submitScore.mutateAsync({
        tableNumber: selectedTable.tableNumber,
        round: event.currentRound,
        placements: arr,
        action: 'submit',
      })
      toast({ title: t('companion.scoreSubmittedToast') })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  const handleConfirm = async () => {
    if (!selectedTable) return
    try {
      await submitScore.mutateAsync({
        tableNumber: selectedTable.tableNumber,
        round: event.currentRound,
        placements: [],
        action: 'confirm',
      })
      toast({ title: t('companion.scoreConfirmedToast') })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('companion.scoreTableRound').replace('{table}', String(selectedTable?.tableNumber ?? '—')).replace('{round}', String(event.currentRound))}
        </CardTitle>
        <CardDescription>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {t('companion.dualVerification')}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Table selector — only shown to staff (organizers/judges).
            Players can only score their own table, so we hide the selector
            and show their table number as a label instead. */}
        {isStaff ? (
          <Select value={selectedTableNo} onValueChange={setSelectedTableNo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {currentRound.tables.map((tbl: any) => (
                <SelectItem key={tbl.tableNumber} value={String(tbl.tableNumber)}>
                  {t('companion.tableWithPlayers').replace('{table}', String(tbl.tableNumber)).replace('{n}', String(tbl.playerIds.length))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            {t('dashboard.table')} {selectedTable?.tableNumber ?? '—'}
          </div>
        )}

        {isLocked ? (
          <LockedScoreView existingScore={existingScore} tablePlayers={tablePlayers} />
        ) : isPending ? (
          <PendingScoreView
            existingScore={existingScore}
            tablePlayers={tablePlayers}
            onConfirm={handleConfirm}
            isPending={submitScore.isPending}
          />
        ) : (
          <ScoreEntryForm
            tablePlayers={tablePlayers}
            placements={placements}
            setPlacements={setPlacements}
            onSubmit={handleSubmit}
            isPending={submitScore.isPending}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function LockedScoreView({ existingScore, tablePlayers }: { existingScore: any; tablePlayers: any[] }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <Badge className="gap-1 bg-emerald-500 text-white">
        <ShieldCheck className="h-3 w-3" /> {t('dashboard.tableStateLocked')}
      </Badge>
      <ul className="space-y-1.5 text-sm">
        {existingScore.placements
          .slice()
          .sort((a: any, b: any) => a.placement - b.placement)
          .map((p: any) => {
            const pl = tablePlayers.find((x: any) => x.id === p.playerId)
            return (
              <li
                key={p.playerId}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  {pl && <span className={'h-2.5 w-2.5 rounded-full ' + pl.color} />}
                  {pl?.name ?? t('share.playerColumn')}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">#{p.placement}</span>
                  <span className="font-mono font-semibold tabular-nums">{p.total} {t('common.pts')}</span>
                </span>
              </li>
            )
          })}
      </ul>
    </div>
  )
}

function PendingScoreView({
  existingScore,
  tablePlayers,
  onConfirm,
  isPending,
}: {
  existingScore: any
  tablePlayers: any[]
  onConfirm: () => void
  isPending: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <Badge className="gap-1 bg-amber-500 text-white">
        <ShieldCheck className="h-3 w-3" /> {t('companion.pendingConfirmation')}
      </Badge>
      <p className="text-sm text-muted-foreground">
        {t('companion.scoreSubmittedHint')}
      </p>
      <ul className="space-y-1.5 text-sm">
        {existingScore.placements
          .slice()
          .sort((a: any, b: any) => a.placement - b.placement)
          .map((p: any) => {
            const pl = tablePlayers.find((x: any) => x.id === p.playerId)
            return (
              <li
                key={p.playerId}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  {pl && <span className={'h-2.5 w-2.5 rounded-full ' + pl.color} />}
                  {pl?.name}
                </span>
                <span className="text-xs text-muted-foreground">#{p.placement}</span>
              </li>
            )
          })}
      </ul>
      <Button onClick={onConfirm} className="w-full" disabled={isPending}>
        <ShieldCheck className="mr-2 h-4 w-4" /> {t('companion.confirmScore')}
      </Button>
    </div>
  )
}

function ScoreEntryForm({
  tablePlayers,
  placements,
  setPlacements,
  onSubmit,
  isPending,
}: {
  tablePlayers: any[]
  placements: Record<string, { placement: number; gamePoints: number }>
  setPlacements: React.Dispatch<React.SetStateAction<Record<string, { placement: number; gamePoints: number }>>>
  onSubmit: () => void
  isPending: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {tablePlayers.map((p: any) => (
          <li key={p.id} className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <PlayerChipInline player={p} />
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select
                value={String(placements[p.id]?.placement ?? '0')}
                onValueChange={(v) =>
                  setPlacements((prev) => ({
                    ...prev,
                    [p.id]: { placement: Number(v), gamePoints: prev[p.id]?.gamePoints ?? 0 },
                  }))
                }
              >
                <SelectTrigger className="sm:col-span-2"><SelectValue placeholder={t('companion.placement')} /></SelectTrigger>
                <SelectContent>
                  {tablePlayers.map((_, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{formatOrdinal(idx + 1, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number" inputMode="numeric"
                placeholder={t('companion.gamePtsShort')}
                value={placements[p.id]?.gamePoints ?? ''}
                onChange={(e) =>
                  setPlacements((prev) => ({
                    ...prev,
                    [p.id]: { placement: prev[p.id]?.placement ?? 0, gamePoints: Number(e.target.value) },
                  }))
                }
              />
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={onSubmit} className="w-full" disabled={isPending}>
        <Send className="mr-2 h-4 w-4" /> {t('companion.submit')}
      </Button>
    </div>
  )
}
