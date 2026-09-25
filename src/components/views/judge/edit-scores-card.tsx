'use client'

/**
 * EditScoresCard — judge picks any round + table to view, adjust, or annotate
 * the score. Editing a locked score marks it as DISPUTED.
 *
 * Extracted from judge-view.tsx.
 */
import * as React from 'react'
import { Pencil, Save, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useSubmitScore } from '@/hooks/use-event-data'
import { formatScoreState } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export function EditScoresCard({ eventId, event }: { eventId: string; event: any }) {
  const { t } = useI18n()
  const submitScore = useSubmitScore(eventId)
  const { toast } = useToast()

  const [roundNo, setRoundNo] = React.useState(String(event.currentRound || 1))
  const [tableNo, setTableNo] = React.useState('')
  const [placements, setPlacements] = React.useState<Record<string, { placement: number; gamePoints: number }>>({})
  const [note, setNote] = React.useState('')

  const round = Number(roundNo) || 0
  const pairing = event.pairings?.find((p: any) => p.round === round)

  React.useEffect(() => {
    if (pairing && pairing.tables.length > 0) {
      const valid = pairing.tables.some((t: any) => String(t.tableNumber) === tableNo)
      if (!valid) setTableNo(String(pairing.tables[0].tableNumber))
    }
  }, [pairing, tableNo])

  const selectedTable = pairing?.tables.find((t: any) => String(t.tableNumber) === tableNo)
  const tablePlayers = selectedTable
    ? (event.players || []).filter((p: any) => selectedTable.playerIds.includes(p.id))
    : []
  const existing = event.scores?.find((s: any) => s.tableNumber === Number(tableNo) && s.round === round)

  React.useEffect(() => {
    if (existing) {
      const m: Record<string, { placement: number; gamePoints: number }> = {}
      for (const p of existing.placements) {
        m[p.playerId] = { placement: p.placement, gamePoints: p.gamePoints }
      }
      setPlacements(m)
      setNote(existing.note ?? '')
    } else {
      setPlacements({})
      setNote('')
    }
  }, [existing?.tableNumber, existing?.round, roundNo, tableNo])

  const handleSave = async () => {
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
        round,
        placements: arr,
        note,
        action: 'update',
      })
      toast({ title: t('judge.editSaved').replace('{round}', String(round)).replace('{table}', String(selectedTable.tableNumber)) })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  if (!pairing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pencil className="h-5 w-5" /> {t('judge.editScores')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('judge.noRounds')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pencil className="h-5 w-5" /> {t('judge.editScores')}
        </CardTitle>
        <CardDescription>{t('judge.editDescShort')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('judge.selectRound')}</Label>
            <Select value={roundNo} onValueChange={setRoundNo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {event.pairings.map((p: any) => (
                  <SelectItem key={p.round} value={String(p.round)}>{t('dashboard.roundN').replace('{n}', String(p.round))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('judge.selectTable')}</Label>
            <Select value={tableNo} onValueChange={setTableNo} disabled={!pairing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {pairing?.tables.map((tbl: any) => (
                  <SelectItem key={tbl.tableNumber} value={String(tbl.tableNumber)}>
                    {t('companion.tableWithPlayers').replace('{table}', String(tbl.tableNumber)).replace('{n}', String(tbl.playerIds.length))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTable && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('judge.statusLabel')}</span>
              {existing ? (
                <Badge className={
                  existing.state === 'LOCKED' ? 'bg-emerald-500 text-white' :
                  existing.state === 'DISPUTED' ? 'bg-rose-500 text-white' :
                  existing.state === 'PENDING_CONFIRM' ? 'bg-amber-500 text-white' :
                  'bg-muted text-muted-foreground'
                }>
                  {formatScoreState(existing.state, t)}
                </Badge>
              ) : (
                <Badge variant="outline">{formatScoreState('MISSING', t)}</Badge>
              )}
            </div>

            <ul className="space-y-2">
              {tablePlayers.map((p: any) => (
                <li key={p.id} className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm">
                    <PlayerChipInline player={p} />
                  </Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Select
                      value={String(placements[p.id]?.placement ?? '0')}
                      onValueChange={(v) => setPlacements((prev) => ({ ...prev, [p.id]: { placement: Number(v), gamePoints: prev[p.id]?.gamePoints ?? 0 } }))}
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
                      placeholder={t('judge.gamePointsLabel')}
                      value={placements[p.id]?.gamePoints ?? ''}
                      onChange={(e) => setPlacements((prev) => ({ ...prev, [p.id]: { placement: prev[p.id]?.placement ?? 0, gamePoints: Number(e.target.value) } }))}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <MessageSquare className="h-3.5 w-3.5" /> {t('judge.noteLabel')}
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('judge.notePlaceholderShort')}
                rows={3}
              />
            </div>

            <Button onClick={handleSave} disabled={submitScore.isPending}>
              <Save className="mr-2 h-4 w-4" /> {t('judge.saveEdit')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
