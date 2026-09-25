'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/lib/store/ui-store'
import { useToast } from '@/hooks/use-toast'
import {
  useEvents,
  useCreateEvent,
  useJoinEvent,
  usePublishEvent,
  useTemplates,
} from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar, Trophy, Users, Plus, LogIn, Share2, FileText, AlignLeft, Clock, Filter } from 'lucide-react'
import { parseSchedule } from '@/lib/serialize'
import { scheduleCardLabel } from '@/lib/schedule'
import { EventBannerThumbnail } from '@/components/event-banner'
import { BggGamePicker } from '@/components/bgg-game-picker'
import { useI18n } from '@/hooks/use-i18n'
import { formatEventStatus, formatRole } from '@/lib/format'

// ---------------------------------------------------------------------------
// Filter types & helpers
// ---------------------------------------------------------------------------

type RoleFilter = 'ALL' | 'ORGANIZER' | 'JUDGE' | 'PLAYER'
type StatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'FINISHED'

/**
 * Map a status filter button to the underlying EventStatus enum values.
 *
 * "Active" matches both CHECK_IN (check-in open) and ACTIVE (rounds in
 * progress) — both represent an event that's currently live for the user.
 * "Draft" and "Finished" map 1:1.
 */
function statusMatches(eventStatus: string, filter: Exclude<StatusFilter, 'ALL'>): boolean {
  switch (filter) {
    case 'ACTIVE':
      return eventStatus === 'ACTIVE' || eventStatus === 'CHECK_IN'
    case 'DRAFT':
      return eventStatus === 'DRAFT'
    case 'FINISHED':
      return eventStatus === 'FINISHED'
  }
}

export function MyEventsView() {
  const { t } = useI18n()
  const setActiveEvent = useUIStore((s) => s.setActiveEvent)
  const setView = useUIStore((s) => s.setView)
  const { toast } = useToast()

  const { data: events, isLoading } = useEvents()
  const { data: templates } = useTemplates()
  const createEvent = useCreateEvent()
  const joinEvent = useJoinEvent()

  // Client-side filters — the events list is already loaded, so we just
  // show/hide cards based on the selected role and status.
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL')

  const filteredEvents = React.useMemo(() => {
    if (!events) return []
    return events.filter((event) => {
      const role = event.role || 'PLAYER'
      if (roleFilter !== 'ALL' && role !== roleFilter) return false
      if (statusFilter !== 'ALL' && !statusMatches(event.status, statusFilter)) return false
      return true
    })
  }, [events, roleFilter, statusFilter])

  const [joinOpen, setJoinOpen] = React.useState(false)
  const [joinCode, setJoinCode] = React.useState('')
  const [joinLoading, setJoinLoading] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newGame, setNewGame] = React.useState('')
  const [newTotalRounds, setNewTotalRounds] = React.useState(4)
  const [newMinPlayers, setNewMinPlayers] = React.useState(2)
  const [newMaxPlayers, setNewMaxPlayers] = React.useState(4)
  // Sentinel value '__none__' instead of empty string — Radix UI forbids
  // empty-string SelectItem values because '' is reserved for "clear selection".
  const NO_TEMPLATE = '__none__'
  const [templateId, setTemplateId] = React.useState<string>(NO_TEMPLATE)

  const openEvent = (eventId: string, role: string) => {
    setActiveEvent(eventId, role as 'ORGANIZER' | 'JUDGE' | 'PLAYER')
    if (role === 'ORGANIZER') setView('dashboard')
    else if (role === 'JUDGE') setView('judge')
    else setView('companion')
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setJoinLoading(true)
    try {
      const event = await joinEvent.mutateAsync(joinCode.trim())
      toast({ title: t('dashboard.joinSuccess').replace('{name}', event.name) })
      setJoinOpen(false)
      setJoinCode('')
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.joinFailed'), variant: 'destructive' })
    }
    setJoinLoading(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const selectedTemplateId = templateId === NO_TEMPLATE ? undefined : templateId
      const tpl = templates?.find((t) => t.id === selectedTemplateId)
      const event = await createEvent.mutateAsync({
        name: newName.trim(),
        gameName: newGame.trim() || tpl?.gameName || 'Custom',
        minPlayersPerTable: tpl?.minPlayersPerTable ?? newMinPlayers,
        maxPlayersPerTable: tpl?.maxPlayersPerTable ?? newMaxPlayers,
        totalRounds: tpl?.totalRounds ?? newTotalRounds,
        templateId: selectedTemplateId,
      })
      toast({ title: t('dashboard.eventCreated').replace('{name}', event.name) })
      setCreateOpen(false)
      setNewName('')
      setNewGame('')
      setNewTotalRounds(4)
      setNewMinPlayers(2)
      setNewMaxPlayers(4)
      setTemplateId(NO_TEMPLATE)
      // Navigate to the new event's dashboard
      openEvent(event.id, 'ORGANIZER')
    } catch (err: any) {
      toast({ title: err.message || t('myEvents.createFailed'), variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('nav.myEvents')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('myEvents.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Join Event */}
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('dashboard.joinEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dashboard.joinEventTitle')}</DialogTitle>
                <DialogDescription>{t('dashboard.joinEventDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="join-code">{t('dashboard.eventCodeLabel')}</Label>
                  <Input
                    id="join-code"
                    placeholder={t('dashboard.eventCodePlaceholder')}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className="font-mono uppercase"
                    autoCapitalize="characters"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setJoinOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleJoin} disabled={joinLoading || !joinCode.trim()}>{t('dashboard.joinButton')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Event */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('dashboard.newEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('myEvents.createEventTitle')}</DialogTitle>
                <DialogDescription>{t('myEvents.createEventDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="evt-name">{t('dashboard.eventName')}</Label>
                  <Input
                    id="evt-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('myEvents.eventNamePlaceholder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="evt-game">{t('myEvents.boardGameLabel')}</Label>
                  <Input
                    id="evt-game"
                    value={newGame}
                    onChange={(e) => setNewGame(e.target.value)}
                    placeholder={t('myEvents.boardGamePlaceholder')}
                  />
                  <BggGamePicker
                    currentGameName={newGame}
                    onSelect={(sel) => {
                      setNewGame(sel.gameName)
                      // Auto-fill min/max players from BGG data
                      if (sel.minPlayers) setNewMinPlayers(sel.minPlayers)
                      if (sel.maxPlayers) setNewMaxPlayers(sel.maxPlayers)
                    }}
                  />
                </div>

                {/* Table size + total rounds. Hidden when a template is selected
                    (templates override these). Shown only when starting from scratch
                    or after the user picks "Start from scratch". */}
                {templateId === NO_TEMPLATE && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="evt-min">{t('dashboard.minPerTable')}</Label>
                      <Input
                        id="evt-min"
                        type="number" inputMode="numeric"
                        min={1}
                        max={10}
                        value={newMinPlayers}
                        onChange={(e) => setNewMinPlayers(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="evt-max">{t('dashboard.maxPerTable')}</Label>
                      <Input
                        id="evt-max"
                        type="number" inputMode="numeric"
                        min={newMinPlayers}
                        max={10}
                        value={newMaxPlayers}
                        onChange={(e) => setNewMaxPlayers(Math.max(newMinPlayers, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="evt-rounds">{t('myEvents.roundsLabel')}</Label>
                      <Input
                        id="evt-rounds"
                        type="number" inputMode="numeric"
                        min={1}
                        max={50}
                        value={newTotalRounds}
                        onChange={(e) => setNewTotalRounds(Math.max(1, Math.min(50, Number(e.target.value))))}
                      />
                    </div>
                  </div>
                )}

                {templates && templates.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-template">{t('myEvents.useTemplate')}</Label>
                    <Select value={templateId} onValueChange={setTemplateId}>
                      <SelectTrigger id="evt-template">
                        <SelectValue placeholder={t('myEvents.startFromScratch')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEMPLATE}>{t('myEvents.startFromScratch')}</SelectItem>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {t('myEvents.templateOption')
                              .replace('{name}', tpl.name)
                              .replace('{game}', tpl.gameName)
                              .replace('{min}', String(tpl.minPlayersPerTable))
                              .replace('{max}', String(tpl.maxPlayersPerTable))
                              .replace('{rounds}', String(tpl.totalRounds))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('myEvents.templatesCloneHint')}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || createEvent.isPending}>
                  {t('common.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates section */}
      {templates && templates.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {t('myEvents.templatesTitle').replace('{n}', String(templates.length))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <li key={tpl.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-sm">
                  <span className="font-medium">{tpl.name}</span>
                  <span className="text-xs text-muted-foreground">{tpl.gameName}</span>
                  <Badge variant="secondary" className="text-xs">{t('myEvents.tableSizeRange').replace('{min}', String(tpl.minPlayersPerTable)).replace('{max}', String(tpl.maxPlayersPerTable))}</Badge>
                  <Badge variant="secondary" className="text-xs">{t('myEvents.roundsShort').replace('{n}', String(tpl.totalRounds))}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(!events || events.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">{t('myEvents.noEventsJoined')}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setJoinOpen(true)}>
                <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('dashboard.joinEvent')}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('dashboard.createEvent')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters — only show when there are events to filter */}
          <div className="mb-4 space-y-2">
            <FilterRow
              icon={<Filter className="h-3.5 w-3.5 text-muted-foreground" />}
              label={t('myEvents.filters.roleLabel')}
              options={[
                { value: 'ALL', label: t('myEvents.filters.all') },
                { value: 'ORGANIZER', label: t('common.roleOrganizer') },
                { value: 'JUDGE', label: t('common.roleJudge') },
                { value: 'PLAYER', label: t('common.rolePlayer') },
              ]}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as RoleFilter)}
            />
            <FilterRow
              icon={<Trophy className="h-3.5 w-3.5 text-muted-foreground" />}
              label={t('myEvents.filters.statusLabel')}
              options={[
                { value: 'ALL', label: t('myEvents.filters.all') },
                { value: 'ACTIVE', label: t('dashboard.status.active') },
                { value: 'DRAFT', label: t('dashboard.status.draft') },
                { value: 'FINISHED', label: t('dashboard.status.finished') },
              ]}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
            />
          </div>

          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('myEvents.filters.noMatches')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => openEvent(event.id, event.role || 'PLAYER')}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * FilterRow — a single horizontal row of toggle buttons used to filter the
 * events list. The selected button gets `variant="default"`; the rest get
 * `variant="outline"`. Clicking a button selects it.
 */
function FilterRow({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = opt.value === value
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className="h-7 px-2.5 text-xs"
            >
              {opt.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/** Single event card with share button for organizers. */
function EventCard({ event, onClick }: { event: any; onClick: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const publishEvent = usePublishEvent(event.id)
  const queryClient = useQueryClient()

  // Compute schedule + description display values once per render.
  // `event.scheduleJson` is the raw JSON string from the API list response;
  // we parse it into a sorted EventSession[] via the shared helper so the
  // label logic matches what the share page sees.
  const schedule = React.useMemo(
    () => parseSchedule(event.scheduleJson),
    [event.scheduleJson]
  )
  const scheduleLabel = scheduleCardLabel(schedule)
  // Truncate description to ~140 chars for the card preview, preserving whole words.
  const descriptionPreview = React.useMemo(() => {
    const full = (event.description ?? '').trim()
    if (!full) return null
    if (full.length <= 140) return full
    const sliced = full.slice(0, 140)
    const lastSpace = sliced.lastIndexOf(' ')
    return (lastSpace > 60 ? sliced.slice(0, lastSpace) : sliced) + '…'
  }, [event.description])

  // Prefetch the event detail on hover so opening it feels instant.
  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: ['event', event.id],
      queryFn: () =>
        fetch(`/api/events/${event.id}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((d) => ({ event: d.event, role: d.role })),
      staleTime: 30 * 1000,
    })
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await publishEvent.mutateAsync()
      await navigator.clipboard.writeText(result.eventCode)
      toast({ title: t('myEvents.codeCopied'), description: result.eventCode })
    } catch {
      toast({ title: t('myEvents.shareFailed'), variant: 'destructive' })
    }
  }

  const role = event.role || 'PLAYER'

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary"
      onClick={onClick}
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {/* Procedural banner thumbnail — helps distinguish events at a glance */}
            <EventBannerThumbnail eventId={event.id} seedOffset={event.bannerSeedOffset ?? 0} />
            <div className="min-w-0">
              <CardTitle className="text-lg break-words leading-tight">{event.name}</CardTitle>
              <p className="text-sm text-muted-foreground break-words">{event.gameName}</p>
            </div>
          </div>
          <Badge
            className={
              role === 'ORGANIZER'
                ? 'bg-primary text-primary-foreground'
                : role === 'JUDGE'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-500 text-white'
            }
          >
            {formatRole(role, t)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {descriptionPreview && (
          <p className="flex items-start gap-2 text-muted-foreground line-clamp-2">
            <AlignLeft className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="break-words">{descriptionPreview}</span>
          </p>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('myEvents.playersCount').replace('{n}', String(event.playerIds?.length ?? 0))}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {t('dashboard.roundOf').replace('{current}', String(event.currentRound)).replace('{total}', String(event.totalRounds))}
        </div>
        {scheduleLabel && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {scheduleLabel}
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          {formatEventStatus(event.status, t)}
        </div>
        {role === 'ORGANIZER' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleShare}
            disabled={publishEvent.isPending}
          >
            <Share2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {t('dashboard.publishEvent')}
          </Button>
        )}
        {event.eventCode && (
          <p className="text-center font-mono text-xs text-muted-foreground">
            {t('myEvents.codeLabel').replace('{code}', event.eventCode)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
