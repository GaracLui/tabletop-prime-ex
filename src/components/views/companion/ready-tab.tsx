'use client'

/**
 * ReadyTab — player toggles their "ready for next round" status.
 *
 * Uses the existing Player.ready field (PATCH /api/events/[eventId]/players/[playerId])
 * to persist the status server-side. The organizer sees ready players in the
 * Event Details tab → Players list (the `ready` column is already in the data model).
 *
 * Extracted from companion-view.tsx.
 */
import * as React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useUpdatePlayer } from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ReadyTab({
  eventId,
  event,
  myPlayerId,
}: {
  eventId: string
  event: any
  /** The current user's Player.id in this event, if they have one. */
  myPlayerId?: string
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const updatePlayer = useUpdatePlayer(eventId)

  // Find the current player's ready status from the event data
  const myPlayer = myPlayerId
    ? (event.players || []).find((p: any) => p.id === myPlayerId)
    : undefined
  const ready = myPlayer?.ready ?? false

  const handleToggle = async () => {
    if (!myPlayerId) return
    try {
      await updatePlayer.mutateAsync({
        playerId: myPlayerId,
        ready: !ready,
      })
      toast({ title: !ready ? t('companion.markedReady') : t('companion.markedNotReady') })
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  if (!myPlayerId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('companion.notCheckedIn')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('companion.readyTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <button
          onClick={handleToggle}
          disabled={updatePlayer.isPending}
          className={
            'flex w-full items-center gap-3 rounded-lg border-2 p-4 transition-colors ' +
            (ready ? 'border-emerald-500 bg-emerald-500/10' : 'border-dashed border-border hover:bg-muted')
          }
          aria-pressed={ready}
        >
          {ready ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="text-left">
            <p className="font-medium">{ready ? t('companion.readyShort') : t('companion.notReadyShort')}</p>
            <p className="text-xs text-muted-foreground">
              {ready
                ? t('companion.readyHint')
                : t('companion.notReadyHint')}
            </p>
          </div>
        </button>
      </CardContent>
    </Card>
  )
}
