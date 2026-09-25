'use client'

/**
 * Event Metadata Editor — Phase 1 description + schedule + Phase 2 banner reroll.
 *
 * Renders a Card with:
 *   • a Textarea for the description (max 2000 chars, live counter)
 *   • a Schedule editor with add/remove rows, each row = start + optional end
 *   • a procedural banner preview with a "Reroll" button
 *   • a Save button that PATCHes /api/events/[eventId] with the new fields
 *   • a Reset button that discards local edits
 *
 * Reads from useEvent() and writes via useUpdateEvent() — same pattern as the
 * other editable cards in EventDetailsApi. Only organizers see this card
 * (the parent gates it on role === 'ORGANIZER').
 */
import * as React from 'react'
import { Calendar, Plus, Trash2, Save, RotateCcw, AlignLeft, Shuffle } from 'lucide-react'
import { useEvent, useUpdateEvent } from '@/hooks/use-event-data'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EventBanner } from '@/components/event-banner'
import type { EventSession } from '@/lib/types'

const MAX_DESCRIPTION_LENGTH = 2000

/**
 * Convert an EventSession[] into editable row state.
 *
 * Each row keeps `start` and `end` as ISO 8601 strings if present, or empty
 * string when blank. The `<input type="datetime-local">` element emits values
 * WITHOUT timezone offset (e.g. "2026-08-15T14:00"), so on save we reattach
 * the user's local offset before sending to the API. This means a Buenos Aires
 * organizer picking "14:00" sends "2026-08-15T14:00:00-03:00" and a Tokyo
 * organizer picking "14:00" sends "2026-08-15T14:00:00+09:00" — exactly what
 * we want.
 */
interface ScheduleRow {
  /** UUID-ish key for React list reconciliation. */
  key: string
  /** Raw datetime-local input value, e.g. "2026-08-15T14:00". Empty when blank. */
  startLocal: string
  /** Raw datetime-local input value for the end. Empty when no end time. */
  endLocal: string
}

function makeRow(): ScheduleRow {
  return { key: Math.random().toString(36).slice(2), startLocal: '', endLocal: '' }
}

/**
 * Convert an ISO 8601 string with offset (e.g. "2026-08-15T14:00:00-03:00")
 * into a datetime-local input value (e.g. "2026-08-15T14:00") in the viewer's
 * local timezone.
 *
 * The datetime-local input format is "YYYY-MM-DDTHH:MM" (no seconds, no
 * offset) in the user's local timezone. So we:
 *   1. Parse the ISO string into a Date (which auto-converts to local tz).
 *   2. Use the Date's local components to build the input string.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/**
 * Convert a datetime-local input value (e.g. "2026-08-15T14:00") into an
 * ISO 8601 string WITH the viewer's local offset (e.g. "2026-08-15T14:00:00-03:00").
 *
 * Returns null when the input is empty or unparseable.
 */
function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  // toISOString() gives UTC (Z). We want local offset instead, so we format
  // manually using the parts of the local Date and the timezone offset.
  const pad = (n: number) => String(n).padStart(2, '0')
  const tzOffsetMin = -d.getTimezoneOffset() // JS gives offset backwards; flip sign
  const sign = tzOffsetMin >= 0 ? '+' : '-'
  const absMin = Math.abs(tzOffsetMin)
  const tzHours = pad(Math.floor(absMin / 60))
  const tzMins = pad(absMin % 60)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00` +
    `${sign}${tzHours}:${tzMins}`
  )
}

/** Convert the editable ScheduleRow[] back into EventSession[] for the API. */
function rowsToSessions(rows: ScheduleRow[]): EventSession[] {
  const sessions: EventSession[] = []
  for (const row of rows) {
    const startIso = localInputToIso(row.startLocal)
    if (!startIso) continue
    const endIso = localInputToIso(row.endLocal)
    sessions.push({
      start: startIso,
      ...(endIso ? { end: endIso } : {}),
    })
  }
  return sessions
}

/** Convert an EventSession[] from the server into editable rows. */
function sessionsToRows(sessions: EventSession[] | null | undefined): ScheduleRow[] {
  if (!sessions || sessions.length === 0) return []
  return sessions.map((s) => ({
    key: Math.random().toString(36).slice(2),
    startLocal: isoToLocalInput(s.start),
    endLocal: isoToLocalInput(s.end),
  }))
}

export function EventMetadataCard({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data } = useEvent(eventId)
  const event = data?.event
  const updateEvent = useUpdateEvent(eventId)
  const { toast } = useToast()

  const [description, setDescription] = React.useState('')
  const [rows, setRows] = React.useState<ScheduleRow[]>([])
  const [rerolling, setRerolling] = React.useState(false)

  // Sync local state when server data changes (after a successful save).
  React.useEffect(() => {
    setDescription(event?.description ?? '')
    setRows(sessionsToRows(event?.schedule ?? null))
  }, [event?.description, event?.schedule])

  if (!event) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t('common.loading')}
        </CardContent>
      </Card>
    )
  }

  // Compute "dirty" by comparing normalized forms — empty string vs null
  // is treated as equal (both = no description).
  const originalDesc = event.description ?? ''
  const descDirty = description.trim() !== originalDesc.trim()

  const originalSessions = event.schedule ?? []
  const currentSessions = rowsToSessions(rows)
  const scheduleDirty =
    JSON.stringify(originalSessions) !== JSON.stringify(currentSessions)

  const dirty = descDirty || scheduleDirty

  const handleAddRow = () => setRows((r) => [...r, makeRow()])
  const handleRemoveRow = (key: string) =>
    setRows((r) => r.filter((row) => row.key !== key))
  const handleRowChange = (key: string, field: 'startLocal' | 'endLocal', value: string) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)))

  /**
   * Reroll the procedural banner by incrementing bannerSeedOffset.
   * The API accepts the magic string 'reroll' which atomically increments
   * the current offset by 1. The new banner renders immediately after the
   * mutation succeeds (the query invalidation refetches the event).
   */
  const handleRerollBanner = async () => {
    setRerolling(true)
    try {
      await updateEvent.mutateAsync({ bannerSeedOffset: 'reroll' })
      toast({ title: t('dashboard.bannerRerolled') })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.rerollFailed'), variant: 'destructive' })
    } finally {
      setRerolling(false)
    }
  }

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {}
      if (descDirty) {
        payload.description = description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null
      }
      if (scheduleDirty) {
        payload.schedule = currentSessions.length > 0 ? currentSessions : null
      }
      await updateEvent.mutateAsync(payload)
      toast({ title: t('dashboard.metadata.saved') })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.saveFailed'), variant: 'destructive' })
    }
  }

  const handleReset = () => {
    setDescription(originalDesc)
    setRows(sessionsToRows(event.schedule ?? null))
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            {t('dashboard.metadata.title')}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('dashboard.metadata.subtitle')}
          </p>
        </div>
        {dirty && (
          <Button size="sm" variant="ghost" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.metadata.reset')}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Procedural banner preview + reroll button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <Shuffle className="h-3.5 w-3.5" /> {t('dashboard.bannerLabel')}
            </Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRerollBanner}
              disabled={rerolling}
              type="button"
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              {rerolling ? t('dashboard.rerolling') : t('dashboard.reroll')}
            </Button>
          </div>
          <EventBanner
            eventId={eventId}
            seedOffset={event.bannerSeedOffset ?? 0}
            variant="wide"
          />
          <p className="text-xs text-muted-foreground">
            {t('dashboard.bannerHelp')}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="evt-description">{t('dashboard.metadata.description')}</Label>
            <span className="text-xs text-muted-foreground">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          <Textarea
            id="evt-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
            placeholder={t('dashboard.metadata.descriptionPlaceholder')}
            rows={4}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {t('dashboard.metadata.descriptionHelp')}
          </p>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {t('dashboard.metadata.schedule')}
            </Label>
            <Button size="sm" variant="outline" onClick={handleAddRow} type="button">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.metadata.scheduleAddDate')}
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
              {t('dashboard.metadata.scheduleEmpty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, idx) => (
                <li
                  key={row.key}
                  className="rounded-md border border-border/60 bg-muted/20 px-2 py-2"
                >
                  {/* Mobile: stacked vertical layout. Two datetime-local inputs
                      side-by-side overflow a 320px viewport (~400px wide), so
                      we stack them on small screens and switch to a 4-col grid
                      on sm+ where there's room. */}
                  <div className="flex items-center justify-between sm:hidden">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('dashboard.metadata.scheduleDateN').replace('{n}', String(idx + 1))}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(row.key)}
                      aria-label={t('dashboard.metadata.removeDateAria')}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 grid grid-cols-1 gap-2 sm:hidden">
                    <div className="space-y-0.5">
                      <Label htmlFor={`row-start-m-${row.key}`} className="text-[10px] text-muted-foreground">
                        {t('dashboard.metadata.scheduleStart')}
                      </Label>
                      <Input
                        id={`row-start-m-${row.key}`}
                        type="datetime-local"
                        value={row.startLocal}
                        onChange={(e) => handleRowChange(row.key, 'startLocal', e.target.value)}
                        className="h-9 text-xs w-full"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor={`row-end-m-${row.key}`} className="text-[10px] text-muted-foreground">
                        {t('dashboard.metadata.scheduleEnd')}
                      </Label>
                      <Input
                        id={`row-end-m-${row.key}`}
                        type="datetime-local"
                        value={row.endLocal}
                        onChange={(e) => handleRowChange(row.key, 'endLocal', e.target.value)}
                        className="h-9 text-xs w-full"
                      />
                    </div>
                  </div>

                  {/* Desktop (sm+): 4-column grid with index, start, end, delete */}
                  <div className="hidden grid-cols-[auto_1fr_1fr_auto] items-center gap-2 sm:grid">
                    <span className="w-6 text-center text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <Label htmlFor={`row-start-${row.key}`} className="text-[10px] text-muted-foreground">
                        {t('dashboard.metadata.scheduleStart')}
                      </Label>
                      <Input
                        id={`row-start-${row.key}`}
                        type="datetime-local"
                        value={row.startLocal}
                        onChange={(e) => handleRowChange(row.key, 'startLocal', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor={`row-end-${row.key}`} className="text-[10px] text-muted-foreground">
                        {t('dashboard.metadata.scheduleEnd')}
                      </Label>
                      <Input
                        id={`row-end-${row.key}`}
                        type="datetime-local"
                        value={row.endLocal}
                        onChange={(e) => handleRowChange(row.key, 'endLocal', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(row.key)}
                      aria-label={t('dashboard.metadata.removeDateAria')}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            {t('dashboard.metadata.scheduleHelp').replace('{tz}', Intl.DateTimeFormat().resolvedOptions().timeZone)}
          </p>
        </div>

        {/* Save bar */}
        <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
          <Button onClick={handleSave} disabled={!dirty || updateEvent.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.metadata.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
