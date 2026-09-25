'use client'

/**
 * JudgeView — orchestrator shell for the judge dashboard.
 *
 * Layout: call queue (left, 2/3 width) + proxy score entry (right, 1/3 width)
 * on large screens, with edit-scores card spanning the full width below.
 *
 * Sub-components live in ./judge/:
 *   - ProxyScoreCard  — judge enters score on behalf of a dead-battery player
 *   - EditScoresCard  — judge edits/annotates any round+table score
 *   - shared.ts       — ORDINAL + CATEGORY_LABEL helpers
 */
import * as React from 'react'
import { Bell, Check, ListChecks } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import {
  useEvent,
  useJudgeCalls,
  useUpdateJudgeCall,
} from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ProxyScoreCard } from './judge/proxy-score-card'
import { EditScoresCard } from './judge/edit-scores-card'

export function JudgeView({ eventId }: { eventId?: string }) {
  const { t } = useI18n()
  if (!eventId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('common.noEventSelected')}
          </CardContent>
        </Card>
      </div>
    )
  }
  return <JudgeContent eventId={eventId} />
}

function JudgeContent({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data: eventData, isLoading: eventLoading } = useEvent(eventId)
  const { data: calls, isLoading: callsLoading } = useJudgeCalls(eventId)
  const updateCall = useUpdateJudgeCall(eventId)
  const { toast: _toast } = useToast()

  const categoryLabel = (category: string): string => {
    const map: Record<string, string> = {
      SCORE: 'companion.categoryScore',
      RULE: 'companion.categoryRule',
      OTHER: 'companion.categoryOther',
    }
    return map[category] ? t(map[category]) : category
  }

  const liveRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = t('judge.liveRegion')
    }
  }, [calls])

  if (eventLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  const event = eventData?.event
  if (!event) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('common.eventNotFound')}</CardContent></Card>
      </div>
    )
  }

  const pendingCount = (calls || []).filter((c: any) => c.status !== 'RESOLVED').length

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('judge.title')}</h1>
        <p className="text-sm text-muted-foreground break-words">{event.name} — {event.gameName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
              {t('judge.queue')}
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white">{pendingCount}</Badge>
              )}
              {/* Live indicator — shows Realtime is connected */}
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t('judge.live')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="animate-pulse text-muted-foreground">{t('judge.loadingCalls')}</div>
            ) : !calls || calls.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                {t('judge.noCalls')}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table className="min-w-[400px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('judge.table')}</TableHead>
                      <TableHead>{t('judge.categoryLabel')}</TableHead>
                      <TableHead className="text-right">{t('judge.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                            {c.tableNumber}
                          </span>
                        </TableCell>
                        <TableCell>{categoryLabel(c.category)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-end">
                            {c.status === 'PENDING' && (
                              <Button size="sm" variant="outline"
                                onClick={() => updateCall.mutate({ callId: c.id, action: 'acknowledge' })}>
                                <Bell className="mr-1 h-3.5 w-3.5" /> {t('judge.ack')}
                              </Button>
                            )}
                            {c.status !== 'RESOLVED' && (
                              <Button size="sm"
                                onClick={() => updateCall.mutate({ callId: c.id, action: 'resolve' })}>
                                <Check className="mr-1 h-3.5 w-3.5" /> {t('judge.resolve')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <ProxyScoreCard eventId={eventId} event={event} />
      </div>

      <div className="mt-6">
        <EditScoresCard eventId={eventId} event={event} />
      </div>
    </div>
  )
}
