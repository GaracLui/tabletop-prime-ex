'use client'

/**
 * Event details tab — overview card + players list (add/bulk/check-in/search)
 * + saved templates panel. Extracted from dashboard-view.tsx.
 *
 * Component structure:
 *   - EventDetailsApi   (orchestrator)
 *   - EventOverviewCard (event metadata + Save-as-template dialog)
 *   - PlayersCard       (add/bulk/check-in-all/search/list)
 *   - TemplatesCard     (saved templates list with delete)
 */
import * as React from 'react'
import {
  Plus,
  Users,
  CheckCircle2,
  Search,
  AlertCircle,
  Bookmark,
  Trash2,
  FileText,
  Pencil,
  Save,
  UserPlus,

  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  useEvent,
  useAddPlayers,
  useUpdateEvent,
  useUpdatePlayer,
  useDeletePlayer,
  useBulkCheckIn,
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useEventParticipants,
  useAddParticipant,
  useUpdateParticipantRole,
  useRemoveParticipant,
} from '@/hooks/use-event-data'
import { useEventContext } from '@/hooks/event-context'
import { EventMetadataCard } from './event-metadata-card'
import { formatSession } from '@/lib/schedule'
import { PlayerChipInline } from '@/components/player-chip'
import { BggGamePicker } from '@/components/bgg-game-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/use-i18n'
import { formatRole } from '@/lib/format'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse bulk-add text into valid names + duplicate count. */
function parseBulkInput(bulkText: string, existingPlayers: any[]) {
  const seen = new Set<string>()
  const valid: string[] = []
  let duplicates = 0
  const existingNames = new Set(existingPlayers.map((p: any) => p.name.toLowerCase()))
  for (const raw of bulkText.split('\n')) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (existingNames.has(key) || seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    valid.push(name)
  }
  return { valid, duplicates }
}

/** Format an EventSession for display in the overview card. */
function formatSessionDisplay(s: { start: string; end?: string }): string {
  return formatSession(s)
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export function EventDetailsApi({ eventId }: { eventId: string }) {
  const { data } = useEvent(eventId)
  const event = data?.event
  const { role } = useEventContext()
  const { t } = useI18n()
  if (!event) return <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>

  return (
    <div className="space-y-4">
      {/* Phase 1 metadata (description + schedule) — organizers only.
          Players and judges see the description on the share page instead. */}
      {role === 'ORGANIZER' && <EventMetadataCard eventId={eventId} />}

      <div className="grid gap-4 md:grid-cols-2">
        <EventOverviewCard eventId={eventId} event={event} />
        <PlayersCard eventId={eventId} players={event.players || []} />
      </div>
      <ParticipantsCard eventId={eventId} />
      <TemplatesCard eventId={eventId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event overview card — metadata + Save-as-template dialog
// ---------------------------------------------------------------------------

function EventOverviewCard({ eventId, event }: { eventId: string; event: any }) {
  const createTemplate = useCreateTemplate()
  const updateEvent = useUpdateEvent(eventId)
  const { toast } = useToast()
  const { t } = useI18n()
  const [tplOpen, setTplOpen] = React.useState(false)
  const [tplName, setTplName] = React.useState('')
  const [editOpen, setEditOpen] = React.useState(false)
  // Editable fields — only meaningful while the dialog is open
  const [editName, setEditName] = React.useState(event.name)
  const [editGame, setEditGame] = React.useState(event.gameName)
  const [editMin, setEditMin] = React.useState(event.minPlayersPerTable)
  const [editMax, setEditMax] = React.useState(event.maxPlayersPerTable)
  const [editRounds, setEditRounds] = React.useState(event.totalRounds)

  // Re-sync edit state when server data changes (e.g. after a successful save)
  React.useEffect(() => {
    setEditName(event.name)
    setEditGame(event.gameName)
    setEditMin(event.minPlayersPerTable)
    setEditMax(event.maxPlayersPerTable)
    setEditRounds(event.totalRounds)
  }, [event.name, event.gameName, event.minPlayersPerTable, event.maxPlayersPerTable, event.totalRounds])

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) return
    try {
      await createTemplate.mutateAsync({ name: tplName.trim(), sourceEventId: eventId })
      toast({ title: t('dashboard.templateSavedName', { name: tplName.trim() }) })
      setTplName('')
      setTplOpen(false)
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  const dirty =
    editName !== event.name ||
    editGame !== event.gameName ||
    editMin !== event.minPlayersPerTable ||
    editMax !== event.maxPlayersPerTable ||
    editRounds !== event.totalRounds

  const handleSaveEvent = async () => {
    try {
      await updateEvent.mutateAsync({
        name: editName.trim() || event.name,
        gameName: editGame.trim() || t('dashboard.customGame'),
        minPlayersPerTable: Number(editMin),
        maxPlayersPerTable: Number(editMax),
        totalRounds: Number(editRounds),
      })
      toast({ title: t('dashboard.eventSettingsSaved') })
      setEditOpen(false)
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.saveFailed'), variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-lg break-words leading-tight">{event.name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5 break-words">{event.gameName}</p>
        </div>
        <div className="flex gap-1.5">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('dashboard.edit')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dashboard.editEventSettings')}</DialogTitle>
                <DialogDescription>
                  {t('dashboard.editEventSettingsDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">{t('dashboard.eventName')}</Label>
                  <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-game">{t('dashboard.boardGame')}</Label>
                  <Input id="edit-game" value={editGame} onChange={(e) => setEditGame(e.target.value)} />
                  <BggGamePicker
                    currentGameName={editGame}
                    onSelect={(sel) => setEditGame(sel.gameName)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-min">{t('dashboard.minPerTable')}</Label>
                    <Input id="edit-min" type="number" inputMode="numeric" min={1} max={10} value={editMin}
                      onChange={(e) => setEditMin(Math.max(1, Number(e.target.value)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-max">{t('dashboard.maxPerTable')}</Label>
                    <Input id="edit-max" type="number" inputMode="numeric" min={editMin} max={10} value={editMax}
                      onChange={(e) => setEditMax(Math.max(editMin, Number(e.target.value)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-rounds">{t('dashboard.roundsLabel')}</Label>
                    <Input id="edit-rounds" type="number" inputMode="numeric" min={1} max={50} value={editRounds}
                      onChange={(e) => setEditRounds(Math.max(1, Math.min(50, Number(e.target.value))))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSaveEvent} disabled={!dirty || updateEvent.isPending}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.saveSettings')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={tplOpen} onOpenChange={setTplOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('dashboard.saveAsTemplate')}</span>
                <span className="sm:hidden">{t('dashboard.templateShort')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dashboard.saveAsTemplate')}</DialogTitle>
                <DialogDescription>
                  {t('dashboard.saveAsTemplateDesc')}
                </DialogDescription>
              </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">{t('dashboard.templateName')}</Label>
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder={t('dashboard.templateNamePlaceholder')}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTplOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSaveTemplate} disabled={!tplName.trim() || createTemplate.isPending}>{t('common.save')}</Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2"><span className="text-muted-foreground flex-shrink-0">{t('dashboard.game')}</span><span className="font-medium text-right break-words min-w-0">{event.gameName}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.minPerTable')}</span><span className="font-medium">{event.minPlayersPerTable}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.maxPerTable')}</span><span className="font-medium">{event.maxPlayersPerTable}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.roundsLabel')}</span><span className="font-medium">{event.totalRounds}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.players')}</span><span className="font-medium">{event.players?.length ?? 0}</span></div>
        {event.eventCode && <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.code')}</span><span className="font-mono font-medium">{event.eventCode}</span></div>}
        {Array.isArray(event.schedule) && event.schedule.length > 0 && (
          <div className="border-t border-border/40 pt-2">
            <span className="text-muted-foreground">{t('dashboard.metadata.schedule')}</span>
            <ul className="mt-1 space-y-1">
              {event.schedule.map((s: any, i: number) => (
                <li key={i} className="font-medium">
                  {formatSessionDisplay(s)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {event.description && (
          <div className="border-t border-border/40 pt-2">
            <span className="text-muted-foreground">{t('dashboard.metadata.description')}</span>
            <p className="mt-1 whitespace-pre-wrap break-words font-normal">
              {event.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Players card — add / bulk add / check-in all / search / list
// ---------------------------------------------------------------------------

function PlayersCard({ eventId, players }: { eventId: string; players: any[] }) {
  const addPlayers = useAddPlayers(eventId)
  const updatePlayer = useUpdatePlayer(eventId)
  const deletePlayer = useDeletePlayer(eventId)
  const bulkCheckIn = useBulkCheckIn(eventId)
  const { toast } = useToast()
  const { t } = useI18n()

  const [newName, setNewName] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [bulkText, setBulkText] = React.useState('')

  const trimmedNew = newName.trim().toLowerCase()
  const isDuplicate = trimmedNew !== '' && players.some((p: any) => p.name.toLowerCase() === trimmedNew)
  const parsedBulk = React.useMemo(() => parseBulkInput(bulkText, players), [bulkText, players])
  const filteredPlayers = search.trim()
    ? players.filter((p: any) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : players

  const handleAdd = async () => {
    if (!newName.trim() || isDuplicate) return
    try {
      await addPlayers.mutateAsync({ name: newName.trim() })
      setNewName('')
      toast({ title: t('dashboard.playerAdded') })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  const handleCheckInAll = async () => {
    const notCheckedIn = players.filter((p: any) => !p.checkedIn)
    if (notCheckedIn.length === 0) {
      toast({ title: t('dashboard.allPlayersCheckedIn') })
      return
    }
    try {
      const result = await bulkCheckIn.mutateAsync({
        playerIds: notCheckedIn.map((p) => p.id),
      })
      toast({ title: t('dashboard.playersCheckedIn', { n: result.updated }) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.failedToCheckInPlayers'), variant: 'destructive' })
    }
  }

  const handleDeletePlayer = async (playerId: string, name: string) => {
    if (!confirm(t('dashboard.removePlayerConfirm', { name }))) return
    try {
      await deletePlayer.mutateAsync(playerId)
      toast({ title: t('dashboard.playerRemoved', { name }) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.failedToRemovePlayer'), variant: 'destructive' })
    }
  }

  const handleBulkAdd = async () => {
    if (parsedBulk.valid.length === 0) return
    try {
      await addPlayers.mutateAsync({ names: parsedBulk.valid })
      toast({ title: t('dashboard.bulkAddDone', { n: parsedBulk.valid.length }) })
      setBulkText('')
      setBulkOpen(false)
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{t('dashboard.players')}</CardTitle>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={handleCheckInAll} disabled={players.length === 0 || bulkCheckIn.isPending}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{bulkCheckIn.isPending ? t('dashboard.checkingIn') : t('dashboard.bulkCheckInAll')}</span>
            <span className="sm:hidden">{bulkCheckIn.isPending ? t('dashboard.ellipsis') : t('dashboard.all')}</span>
          </Button>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Users className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('dashboard.bulkShort')}</span></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dashboard.bulkAddTitle')}</DialogTitle>
                <DialogDescription>{t('dashboard.bulkAddDescShort')}</DialogDescription>
              </DialogHeader>
              <Textarea
                autoFocus
                placeholder={t('dashboard.bulkAddPlaceholder')}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('dashboard.bulkWillBeAdded', { n: parsedBulk.valid.length })}</span>
                {parsedBulk.duplicates > 0 && <span className="text-amber-700 dark:text-amber-400">{t('dashboard.bulkDuplicatesSkipped', { n: parsedBulk.duplicates })}</span>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleBulkAdd} disabled={parsedBulk.valid.length === 0 || addPlayers.isPending}>{t('common.add')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              placeholder={t('dashboard.playerName')}
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 60))}
              onKeyDown={(e) => e.key === 'Enter' && !isDuplicate && handleAdd()}
              aria-invalid={isDuplicate}
              maxLength={60}
            />
            <Button onClick={handleAdd} size="sm" disabled={!newName.trim() || isDuplicate || addPlayers.isPending}>
              <Plus className="mr-1 h-4 w-4" /> {t('common.add')}
            </Button>
          </div>
          {isDuplicate && (
            <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" /> {t('dashboard.duplicateName', { name: newName.trim() })}
            </p>
          )}
        </div>

        {players.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('dashboard.searchPlayers')} value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
            {search && <span className="mt-1 block text-xs text-muted-foreground">{t('dashboard.searchResultsCount', { n: filteredPlayers.length, total: players.length })}</span>}
          </div>
        )}

        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1 custom-scroll">
          {filteredPlayers.map((p: any) => (
            <li key={p.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <PlayerChipInline player={p} />
              <Button
                size="sm"
                variant={p.checkedIn ? 'secondary' : 'outline'}
                className="h-6 px-2 text-xs flex-shrink-0"
                onClick={() => updatePlayer.mutate({ playerId: p.id, checkedIn: !p.checkedIn })}
              >
                {p.checkedIn ? t('dashboard.checkedIn') : t('dashboard.checkIn')}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeletePlayer(p.id, p.name)}
                disabled={deletePlayer.isPending}
                aria-label={t('dashboard.removePlayerAria', { name: p.name })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {filteredPlayers.length === 0 && players.length > 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">{t('dashboard.searchNoResults', { query: search })}</li>
          )}
          {players.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">{t('dashboard.noPlayersYet')}</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Participants card — manage who participates (judges + players)
// ---------------------------------------------------------------------------

function ParticipantsCard({ eventId }: { eventId: string }) {
  const { data: participants, isLoading } = useEventParticipants(eventId)
  const addParticipant = useAddParticipant(eventId)
  const updateRole = useUpdateParticipantRole(eventId)
  const removeParticipant = useRemoveParticipant(eventId)
  const { toast } = useToast()
  const { t } = useI18n()

  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'JUDGE' | 'PLAYER'>('JUDGE')
  const [search, setSearch] = React.useState('')

  const handleAdd = async () => {
    if (!email.trim()) return
    try {
      await addParticipant.mutateAsync({ email: email.trim().toLowerCase(), role })
      toast({ title: t('dashboard.addedAsRole', { role: formatRole(role, t).toLowerCase() }) })
      setEmail('')
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.failedToAdd'), variant: 'destructive' })
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
      toast({ title: t('dashboard.roleChangedTo', { role: formatRole(newRole, t).toLowerCase() }) })
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm(t('dashboard.removeParticipantConfirm'))) return
    try {
      await removeParticipant.mutateAsync(userId)
      toast({ title: t('dashboard.participantRemoved') })
    } catch (err: any) {
      toast({ title: err.message || t('common.failed'), variant: 'destructive' })
    }
  }

  // Filter participants by search
  const filtered = search.trim()
    ? (participants || []).filter((p: any) => {
        const q = search.trim().toLowerCase()
        return (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
      })
    : participants

  // Count code-joined players (participants with role PLAYER who don't have a Player row)
  // We can check this by looking at the event's players list for a matching userId
  const eventPlayers = participants || []
  const codeJoinedCount = eventPlayers.filter((p: any) => p.role === 'PLAYER').length

  // Promote all code-joined participants to players (creates Player rows)
  const handlePromoteAll = async () => {
    const toPromote = (participants || []).filter((p: any) => p.role === 'PLAYER')
    let success = 0
    for (const p of toPromote) {
      try {
        await updateRole.mutateAsync({ userId: p.userId, role: 'PLAYER' })
        success++
      } catch { /* already has a Player row — skip */ }
    }
    toast({ title: t('dashboard.playersConfirmed', { n: success }) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.participantsCount', { n: participants?.length ?? 0 })}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('dashboard.participantsDesc')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new participant by email */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="participant-email" className="text-xs">{t('dashboard.addByEmail')}</Label>
            <Input
              id="participant-email"
              type="email"
              placeholder={t('dashboard.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as 'JUDGE' | 'PLAYER')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JUDGE">{formatRole('JUDGE', t)}</SelectItem>
              <SelectItem value="PLAYER">{formatRole('PLAYER', t)}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!email.trim() || addParticipant.isPending}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> {t('common.add')}
          </Button>
        </div>

        {/* Search bar */}
        {participants && participants.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchParticipants')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {search && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('dashboard.participantsResultsCount', { n: filtered?.length ?? 0, total: participants.length })}
              </span>
            )}
          </div>
        )}

        {/* Promote all players button */}
        {codeJoinedCount > 0 && (
          <Button size="sm" variant="outline" onClick={handlePromoteAll} disabled={updateRole.isPending} className="w-full">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {t('dashboard.confirmAllForPairings', { n: codeJoinedCount })}
          </Button>
        )}

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : filtered && filtered.length > 0 ? (
          <ul className="space-y-2">
            {filtered.map((p: any) => (
              <li
                key={p.userId}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" title={p.name || p.email}>{p.name || p.email}</div>
                  <div className="text-xs text-muted-foreground truncate" title={p.email}>{p.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      p.role === 'ORGANIZER'
                        ? 'bg-primary text-primary-foreground'
                        : p.role === 'JUDGE'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }
                  >
                    {formatRole(p.role, t)}
                  </Badge>
                  {p.role !== 'ORGANIZER' && (
                    <>
                      <Select
                        value=""
                        onValueChange={(v) => v && handleRoleChange(p.userId, v)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue placeholder={t('dashboard.changeRole')} />
                        </SelectTrigger>
                        <SelectContent>
                          {p.role !== 'JUDGE' && <SelectItem value="JUDGE">{`→ ${formatRole('JUDGE', t)}`}</SelectItem>}
                          {p.role !== 'PLAYER' && <SelectItem value="PLAYER">{`→ ${formatRole('PLAYER', t)}`}</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-rose-600"
                        onClick={() => handleRemove(p.userId)}
                        disabled={removeParticipant.isPending}
                        aria-label={t('dashboard.removeParticipantConfirm')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            {search ? t('dashboard.noParticipantsMatch', { query: search }) : t('dashboard.noParticipantsYet')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Templates card — list + delete
// ---------------------------------------------------------------------------

function TemplatesCard({ eventId: _eventId }: { eventId: string }) {
  const { data: templates } = useTemplates()
  const deleteTemplate = useDeleteTemplate()
  const { toast } = useToast()
  const { t } = useI18n()

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id)
      toast({ title: t('dashboard.templateDeleted') })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.savedTemplates', { n: templates?.length ?? 0 })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates && templates.length > 0 ? (
          <ul className="space-y-2">
            {templates.map((tpl: any) => (
              <li key={tpl.id} className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('dashboard.templateSummary', { game: tpl.gameName, min: tpl.minPlayersPerTable, max: tpl.maxPlayersPerTable, rounds: tpl.totalRounds })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-rose-600"
                  onClick={() => handleDelete(tpl.id)}
                  disabled={deleteTemplate.isPending}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> {t('common.delete')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            {t('dashboard.noTemplatesYetExtended')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
