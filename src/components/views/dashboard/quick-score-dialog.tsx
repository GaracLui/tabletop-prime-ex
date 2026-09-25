'use client'

/**
 * QuickScoreButtonApi — dialog for entering placements and game points
 * for a single table in a single round. Saving locks the score immediately.
 *
 * Mobile-friendly: the player list scrolls within the dialog (max-height)
 * and the action buttons are always visible at the bottom.
 * Supports ties: multiple players can share the same placement number.
 */
import * as React from 'react'
import { ClipboardList, Link2, Link2Off } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useSubmitScore } from '@/hooks/use-event-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { PlayerChipInline } from '@/components/player-chip'

export function QuickScoreButtonApi({
  eventId,
  tableNumber,
  round,
  players,
}: {
  eventId: string
  tableNumber: number
  round: number
  players: any[]
}) {
  const { t } = useI18n()
  const submitScore = useSubmitScore(eventId)
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [placements, setPlacements] = React.useState<Record<string, { placement: number; gamePoints: number }>>({})

  // Detect ties: group players by their selected placement
  const placementGroups = React.useMemo(() => {
    const groups = new Map<number, string[]>()
    for (const p of players) {
      const pl = placements[p.id]?.placement
      if (pl && pl > 0) {
        if (!groups.has(pl)) groups.set(pl, [])
        groups.get(pl)!.push(p.id)
      }
    }
    return groups
  }, [placements, players])

  const hasTies = Array.from(placementGroups.values()).some((ids) => ids.length > 1)

  const handleSave = async () => {
    const arr = players.map((p) => ({
      playerId: p.id,
      placement: placements[p.id]?.placement ?? 0,
      gamePoints: placements[p.id]?.gamePoints ?? 0,
    }))
    if (arr.some((p) => p.placement === 0)) {
      toast({ title: t('dashboard.quickScorePickAll'), variant: 'destructive' })
      return
    }
    try {
      await submitScore.mutateAsync({ tableNumber, round, placements: arr, action: 'update' })
      toast({ title: t('dashboard.quickScoreSaved').replace('{table}', String(tableNumber)) })
      setOpen(false)
      setPlacements({})
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  // Toggle a tie between two players (give them the same placement)
  const [tiePartner, setTiePartner] = React.useState<string | null>(null)

  const handleTieToggle = (playerId: string) => {
    if (tiePartner === null) {
      // Start selecting a tie partner
      setTiePartner(playerId)
    } else if (tiePartner === playerId) {
      // Cancel selection
      setTiePartner(null)
    } else {
      // Link these two players: give the target the same placement as the source
      const sourcePlacement = placements[tiePartner]?.placement
      if (sourcePlacement) {
        setPlacements((prev) => ({
          ...prev,
          [playerId]: { placement: sourcePlacement, gamePoints: prev[playerId]?.gamePoints ?? 0 },
        }))
      }
      setTiePartner(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPlacements({}); setTiePartner(null) }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
          <ClipboardList className="h-3 w-3" /> {t('dashboard.quickScore')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>{t('dashboard.quickScoreTitle').replace('{table}', String(tableNumber)).replace('{round}', String(round))}</DialogTitle>
          <DialogDescription className="sr-only">{t('dashboard.quickScoreSrDesc')}</DialogDescription>
          {hasTies && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> {t('dashboard.tieDetected')}
            </p>
          )}
        </DialogHeader>

        {/* Scrollable player list — this is the key fix for large tables */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-2">
          <div className="space-y-3">
            {players.map((p) => {
              const isTieSelecting = tiePartner !== null && tiePartner !== p.id
              const isTieSource = tiePartner === p.id
              const myPlacement = placements[p.id]?.placement
              const tiedWith = myPlacement ? placementGroups.get(myPlacement)?.filter((id) => id !== p.id) ?? [] : []

              return (
                <div key={p.id} className={`space-y-1.5 rounded-lg border p-2 transition-colors ${
                  isTieSource ? 'border-primary bg-primary/5' :
                  isTieSelecting ? 'border-primary/30 cursor-pointer hover:bg-primary/5' :
                  tiedWith.length > 0 ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-transparent'
                }`}
                onClick={isTieSelecting ? () => handleTieToggle(p.id) : undefined}
                >
                  <Label className="flex items-center gap-2 text-sm">
                    <PlayerChipInline player={p} />
                    {tiedWith.length > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs text-amber-700 dark:text-amber-400 border-amber-500/40 flex-shrink-0">
                        <Link2 className="h-3 w-3" /> {t('dashboard.tied')}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleTieToggle(p.id) }}
                      aria-label={tiePartner ? t('dashboard.linkAsTie') : t('dashboard.selectToTie')}
                      aria-pressed={isTieSource}
                      title={tiePartner ? t('dashboard.linkAsTie') : t('dashboard.selectToTie')}
                    >
                      {isTieSource ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    </Button>
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
                      <SelectTrigger className="sm:col-span-2"><SelectValue placeholder={t('dashboard.quickScorePlacement')} /></SelectTrigger>
                      <SelectContent>
                        {players.map((_, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {idx + 1}{idx === 0 ? t('common.ordinalSt') : idx === 1 ? t('common.ordinalNd') : idx === 2 ? t('common.ordinalRd') : t('common.ordinalTh')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" inputMode="numeric"
                      placeholder={t('dashboard.quickScoreGamePts')}
                      value={placements[p.id]?.gamePoints ?? ''}
                      onChange={(e) =>
                        setPlacements((prev) => ({
                          ...prev,
                          [p.id]: { placement: prev[p.id]?.placement ?? 0, gamePoints: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky action buttons — always visible */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => { setOpen(false); setPlacements({}); setTiePartner(null) }}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={submitScore.isPending}>{t('dashboard.quickScoreSave')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
