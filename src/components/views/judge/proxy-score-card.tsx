'use client'

/**
 * ProxyScoreCard — judge enters placements on behalf of a player whose
 * battery is dead. Picks a table, fills placements, submits as locked.
 *
 * Extracted from judge-view.tsx.
 */
import * as React from 'react'
import { Gavel, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useSubmitScore } from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export function ProxyScoreCard({ eventId, event }: { eventId: string; event: any }) {
  const { t } = useI18n()
  const submitScore = useSubmitScore(eventId)
  const { toast } = useToast()

  const currentRound = event.pairings?.find((p: any) => p.round === event.currentRound)
  const [tableNo, setTableNo] = React.useState('')
  const [placements, setPlacements] = React.useState<Record<string, { placement: number; gamePoints: number }>>({})

  React.useEffect(() => {
    if (currentRound && currentRound.tables.length > 0) {
      setTableNo(String(currentRound.tables[0].tableNumber))
    }
  }, [currentRound])

  if (!currentRound) return null

  const selectedTable = currentRound.tables.find((t: any) => String(t.tableNumber) === tableNo)
  const tablePlayers = selectedTable
    ? (event.players || []).filter((p: any) => selectedTable.playerIds.includes(p.id))
    : []

  const handlePlacementChange = (pid: string, value: number) => {
    setPlacements((prev) => ({ ...prev, [pid]: { placement: value, gamePoints: prev[pid]?.gamePoints ?? 0 } }))
  }
  const handleGamePointsChange = (pid: string, value: number) => {
    setPlacements((prev) => ({ ...prev, [pid]: { placement: prev[pid]?.placement ?? 0, gamePoints: value } }))
  }

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
        action: 'update',
      })
      setPlacements({})
      toast({ title: t('judge.proxySubmitted') })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gavel className="h-5 w-5" aria-hidden="true" />
          {t('judge.proxyTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('judge.selectTable')}</Label>
          <Select value={tableNo} onValueChange={setTableNo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {currentRound.tables.map((tbl: any) => (
                <SelectItem key={tbl.tableNumber} value={String(tbl.tableNumber)}>
                  {t('companion.tableWithPlayers').replace('{table}', String(tbl.tableNumber)).replace('{n}', String(tbl.playerIds.length))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTable && (
          <ul className="space-y-2">
            {tablePlayers.map((p: any) => (
              <li key={p.id} className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <PlayerChipInline player={p} />
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Select
                    value={String(placements[p.id]?.placement ?? '0')}
                    onValueChange={(v) => handlePlacementChange(p.id, Number(v))}
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
                    onChange={(e) => handleGamePointsChange(p.id, Number(e.target.value))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button onClick={handleSubmit} className="w-full" disabled={!selectedTable || submitScore.isPending}>
          <Send className="mr-2 h-4 w-4" /> {t('judge.submitProxy')}
        </Button>
      </CardContent>
    </Card>
  )
}
