'use client'

/**
 * EventLifecycleBarSimple — Start / Finish / Delete buttons for the active event.
 * Extracted from dashboard-view.tsx for clarity.
 */
import { Play, CheckCircle2, Trash2 } from 'lucide-react'
import { useUIStore } from '@/lib/store/ui-store'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { formatEventStatus } from '@/lib/format'
import { useUpdateEvent, useDeleteEvent } from '@/hooks/use-event-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EventLifecycleBarSimple({ eventId, status }: { eventId: string; status: string }) {
  const { t } = useI18n()
  const updateEvent = useUpdateEvent(eventId)
  const deleteEvent = useDeleteEvent(eventId)
  const setView = useUIStore((s) => s.setView)
  const setActiveEvent = useUIStore((s) => s.setActiveEvent)
  const { toast } = useToast()

  const handle = (s: string) => {
    updateEvent.mutate({ status: s })
    toast({ title: t('dashboard.statusChanged').replace('{status}', formatEventStatus(s, t)) })
  }

  const handleDelete = async () => {
    if (!confirm(t('dashboard.deleteConfirm'))) return
    try {
      await deleteEvent.mutateAsync()
      toast({ title: t('dashboard.deleteDone') })
      setActiveEvent(null, null)
      setView('my-events')
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.failedToDeleteEvent'), variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{t('dashboard.statusLabel').replace('{status}', formatEventStatus(status, t))}</span>
        <div className="flex flex-wrap gap-2">
          {status !== 'ACTIVE' && status !== 'FINISHED' && (
            <Button size="sm" onClick={() => handle('ACTIVE')} disabled={updateEvent.isPending}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.startEvent')}
            </Button>
          )}
          {status !== 'FINISHED' && (
            <Button size="sm" variant="outline" onClick={() => handle('FINISHED')} disabled={updateEvent.isPending}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.finishEvent')}
            </Button>
          )}
        </div>
        <div className="sm:ml-auto">
          <Button size="sm" variant="destructive" className="w-full sm:w-auto" disabled={deleteEvent.isPending}
            onClick={handleDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.deleteEvent')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
