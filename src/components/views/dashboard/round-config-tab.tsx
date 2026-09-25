'use client'

/**
 * Round config tab — per-round overrides for format and table sizes.
 * Extracted from dashboard-view.tsx.
 *
 * v6: every format selector shows a plain-language description of what the
 * format does, so organizers don't have to test each one to find out.
 */
import * as React from 'react'
import { Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { formatRoundFormat, formatRoundFormatDescription } from '@/lib/format'
import {
  useEvent,
  useRoundConfigs,
  useUpsertRoundConfig,
  useDeleteRoundConfig,
} from '@/hooks/use-event-data'
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

/** Formats selectable per round (v6: CUSTOM removed, ADJACENT_SWISS added). */
const ROUND_FORMATS = ['ROUND_ROBIN', 'SWISS', 'SINGLE_ELIM', 'ADJACENT_SWISS'] as const

/**
 * Legacy pre-v6 databases may still hold 'CUSTOM' round configs (before the
 * enum migration runs). Map them to their behavioral equivalent so the
 * Select still shows a valid value instead of an empty placeholder.
 */
function normalizeFormat(value: string): string {
  return value === 'CUSTOM' ? 'ROUND_ROBIN' : value
}

export function RoundConfigTabApi({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data: configs, isLoading } = useRoundConfigs(eventId)
  const { data: event } = useEvent(eventId)

  if (isLoading || !event?.event) {
    return <div className="animate-pulse text-muted-foreground">{t('dashboard.loadingRoundConfig')}</div>
  }

  const ev = event.event
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.roundConfigTitle')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('dashboard.roundConfigInheritDesc').replace('{min}', String(ev.minPlayersPerTable)).replace('{max}', String(ev.maxPlayersPerTable))}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {(configs || []).map((rc: any) => (
          <RoundConfigRow key={rc.round} eventId={eventId} rc={rc} eventMin={ev.minPlayersPerTable} eventMax={ev.maxPlayersPerTable} />
        ))}
      </CardContent>
    </Card>
  )
}

function RoundConfigRow({ eventId, rc, eventMin, eventMax }: {
  eventId: string
  rc: any
  eventMin: number
  eventMax: number
}) {
  const { t } = useI18n()
  const upsert = useUpsertRoundConfig(eventId)
  const del = useDeleteRoundConfig(eventId)
  const { toast } = useToast()

  const [format, setFormat] = React.useState(normalizeFormat(rc.format))
  const [min, setMin] = React.useState(rc.minPerTable)
  const [max, setMax] = React.useState(rc.maxPerTable)
  const [seatRotation, setSeatRotation] = React.useState(rc.seatRotation ?? 'NONE')
  const [dirty, setDirty] = React.useState(false)

  // Re-sync when server data changes
  React.useEffect(() => {
    setFormat(normalizeFormat(rc.format)); setMin(rc.minPerTable); setMax(rc.maxPerTable)
    setSeatRotation(rc.seatRotation ?? 'NONE'); setDirty(false)
  }, [rc.format, rc.minPerTable, rc.maxPerTable, rc.seatRotation])

  const isOverride = rc.isOverride

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ round: rc.round, format, minPerTable: min, maxPerTable: max, seatRotation })
      toast({ title: t('dashboard.roundConfigSaved').replace('{round}', String(rc.round)) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.saveFailed'), variant: 'destructive' })
    }
  }

  const handleReset = async () => {
    try {
      await del.mutateAsync(rc.round)
      toast({ title: t('dashboard.roundConfigReverted').replace('{round}', String(rc.round)) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.resetFailed'), variant: 'destructive' })
    }
  }

  const formatDescription = formatRoundFormatDescription(format, t)

  return (
    <div className={'rounded-md border px-3 py-3 ' + (isOverride ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/20')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <Badge variant={isOverride ? 'default' : 'secondary'} className="tabular-nums">R{rc.round}</Badge>
          {isOverride && <span className="text-xs text-primary">{t('dashboard.overridden')}</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
          <div>
            <Label className="text-xs text-muted-foreground">{t('dashboard.format')}</Label>
            <Select value={format} onValueChange={(v) => { setFormat(v); setDirty(true) }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROUND_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>{formatRoundFormat(f, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('dashboard.minPerTable')}</Label>
            <Input type="number" inputMode="numeric" min={1} value={min} className="h-8 text-sm"
              onChange={(e) => { setMin(Number(e.target.value)); setDirty(true) }} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('dashboard.maxPerTable')}</Label>
            <Input type="number" inputMode="numeric" min={1} value={max} className="h-8 text-sm"
              onChange={(e) => { setMax(Number(e.target.value)); setDirty(true) }} />
          </div>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          {isOverride && (
            <Button size="sm" variant="ghost" onClick={handleReset} disabled={del.isPending}>
              {t('common.reset')}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty || upsert.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {t('common.save')}
          </Button>
        </div>
      </div>
      {/* v6: Seat rotation dropdown — lets organizers rotate first-player
          position each round for games with seat advantage (Catan, etc.). */}
      <div className="mt-2 flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('dashboard.seatRotation')}</Label>
        <Select
          value={seatRotation}
          onValueChange={(v) => { setSeatRotation(v); setDirty(true) }}
        >
          <SelectTrigger className="h-8 w-auto text-sm gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">{t('dashboard.seatRotationNone')}</SelectItem>
            <SelectItem value="CLOCKWISE">{t('dashboard.seatRotationClockwise')}</SelectItem>
            <SelectItem value="BALANCED">{t('dashboard.seatRotationBalanced')}</SelectItem>
          </SelectContent>
        </Select>
        {seatRotation !== 'NONE' && (
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {t('dashboard.seatRotationDesc')}
          </span>
        )}
      </div>
      {/* v6: plain-language explanation of the selected pairing format —
          saves organizers from having to test each format to learn what it does. */}
      {formatDescription && (
        <p className="mt-2 rounded-sm bg-muted/40 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{t('dashboard.formatHowItWorks')}</span>{' '}
          {formatDescription}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {t('dashboard.roundConfigDefault').replace('{min}', String(eventMin)).replace('{max}', String(eventMax))}
      </p>
    </div>
  )
}
