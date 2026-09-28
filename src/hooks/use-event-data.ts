'use client'

/**
 * useEventData — React hooks for fetching and mutating event data via API.
 * Replaces the Zustand tournament store for server-side data.
 *
 * Judge calls use Supabase Realtime for instant push updates (Phase 3).
 * A 30s polling fallback catches any missed Realtime events.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/lib/store/ui-store'
import type { EventSession } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiEvent {
  id: string
  name: string
  gameName: string
  gameBggId?: string | null
  gameMaxPlayers?: number | null
  minPlayersPerTable: number
  maxPlayersPerTable: number
  totalRounds: number
  status: string
  currentRound: number
  primeTier: string
  eventCode?: string | null
  /** Optional Phase 1 metadata — present when the organizer has set them. */
  description?: string | null
  /**
   * Parsed schedule (sorted EventSession[]) — present on `useEvent()` responses
   * because the single-event serializer calls `parseSchedule()` on the way out.
   * NOT present on `useEvents()` list responses (those carry `scheduleJson`).
   */
  schedule?: EventSession[] | null
  /** Raw JSON string of the schedule array — present on `useEvents()` list responses. */
  scheduleJson?: string | null
  /** Procedural banner seed offset — increment to reroll. Default 0. */
  bannerSeedOffset?: number
  scoringRules: any
  playerIds: string[]
  players: Array<{ id: string; name: string; checkedIn: boolean; ready: boolean; color: string }>
  pairings: any[]
  scores: any[]
  roundConfigs: any[]
  createdAt: string
  role?: string
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all events the current user participates in. */
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => fetchJson('/api/events').then((d) => d.events as ApiEvent[]),
  })
}

/** Get full event data by ID. */
export function useEvent(eventId: string | null) {
  const queryKey = ['event', eventId] as const

  // NOTE: Supabase Realtime was previously used here to push instant updates
  // when pairings/scores/players changed. It was removed because:
  //   1. Prisma uses quoted camelCase column names ("eventId") which
  //      Supabase Realtime's filter parser can't match (it lowercases
  //      to "eventid" → "invalid column for filter eventId" error).
  //   2. The Supabase JS client caches channels by name — when the React
  //      effect re-runs (query refetch → re-render), supabase.channel()
  //      returns the cached channel that's already subscribed, and calling
  //      .on() on it crashes with "cannot add postgres_changes callbacks
  //      after subscribe()".
  //
  // Instead, we use a 15s polling interval + refetchOnWindowFocus.
  // This gives near-instant updates when a player switches back to the
  // companion tab, and 15s max latency in the background.
  //
  // To re-enable Realtime in the future, the publication would need to
  // be set up with explicit filter columns AND the channel caching issue
  // would need to be worked around (e.g. with unique channel names per
  // effect run + a delay before re-subscribing).

  return useQuery({
    queryKey,
    queryFn: () => fetchJson(`/api/events/${eventId}`).then((d) => ({ event: d.event as ApiEvent, role: d.role as string })),
    enabled: !!eventId,
    // 10s polling — catches all changes (pairings, scores, players, event status).
    // Reduced from 15s to 10s because mobile browsers throttle background
    // timers (often to 1/min), so the effective interval is much longer.
    // 10s base means even with throttling, the update latency is acceptable.
    refetchInterval: 10 * 1000,
    // Override the global staleTime (30s) so that refetchOnWindowFocus
    // ALWAYS triggers a refetch when the player returns to the companion tab.
    // Without this, a player who returns to the tab within 30s of the last
    // fetch would see stale data — missing the organizer's pairing changes.
    staleTime: 5 * 1000,
    // Refetch when the browser tab regains focus — a player switching
    // back to the companion tab should see fresh data immediately.
    refetchOnWindowFocus: 'always',
    // Also refetch when the network reconnects (mobile users on flaky wifi).
    refetchOnReconnect: true,
    // Always refetch on mount — when the user navigates to the companion view,
    // show fresh data instead of the stale cache from a previous visit.
    refetchOnMount: 'always',
  })
}

/** Get standings for an event. */
export function useStandings(eventId: string | null) {
  return useQuery({
    queryKey: ['standings', eventId],
    queryFn: () => fetchJson(`/api/events/${eventId}/standings`).then((d) => d.standings),
    enabled: !!eventId,
  })
}

/** Create a new event. */
export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string
      gameName: string
      gameBggId?: string
      gameMaxPlayers?: number
      minPlayersPerTable: number
      maxPlayersPerTable: number
      totalRounds: number
      primeTier?: string
      templateId?: string
    }) => fetchJson('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((d) => d.event as ApiEvent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ---------------------------------------------------------------------------
// Event templates
// ---------------------------------------------------------------------------

/** List all event templates. */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => fetchJson('/api/templates').then((d) => d.templates as any[]),
  })
}

/** Save a new template (from an existing event or manual body). */
export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; sourceEventId?: string }) =>
      fetchJson('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then((d) => d.template),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

/** Delete a template. */
export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      fetchJson(`/api/templates/${templateId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

// ---------------------------------------------------------------------------
// Event participants (organizer-side management)
// ---------------------------------------------------------------------------

/** List all participants for an event (with user email + name). */
export function useEventParticipants(eventId: string | null) {
  return useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: () => fetchJson(`/api/events/${eventId}/participants`).then((d) => d.participants as any[]),
    enabled: !!eventId,
  })
}

/** Add a user as a participant by email. */
export function useAddParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      fetchJson(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-participants', eventId] })
      qc.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}

/** Change a participant's role. */
export function useUpdateParticipantRole(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; role: string }) =>
      fetchJson(`/api/events/${eventId}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-participants', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/** Remove a participant from the event. */
export function useRemoveParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/events/${eventId}/participants?userId=${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-participants', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/** Update event (status, currentRound, scoringRules, etc). */
export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      fetchJson(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/** Delete event. */
export function useDeleteEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson(`/api/events/${eventId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/** Add players (single or bulk). */
export function useAddPlayers(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name?: string; names?: string[] }) =>
      fetchJson(`/api/events/${eventId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/** Update player (checkIn, ready). */
export function useUpdatePlayer(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { playerId: string; checkedIn?: boolean; ready?: boolean }) =>
      fetchJson(`/api/events/${eventId}/players/${input.playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: input.checkedIn, ready: input.ready }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/** Delete a player permanently from the event. */
export function useDeletePlayer(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (playerId: string) =>
      fetchJson(`/api/events/${eventId}/players/${playerId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/** Delete a bonus round and its scores. */
export function useDeleteBonusRound(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (round: number) =>
      fetchJson(`/api/events/${eventId}/bonus-rounds/${round}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/**
 * Bulk check-in all (or a subset of) players in a single UPDATE.
 * Replaces N separate PATCH requests. Returns the number of players updated.
 */
export function useBulkCheckIn(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { playerIds?: string[] } = {}) =>
      fetchJson(`/api/events/${eventId}/players/check-in-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then((d) => d as { updated: number }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/** Generate or regenerate pairings. */
export function useGeneratePairings(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { action: 'generate' | 'regenerate'; format?: string; round?: number }) =>
      fetchJson(`/api/events/${eventId}/pairings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['standings', eventId] })
    },
  })
}

/**
 * Drop / reintroduce / reassign a player in a specific round's pairing.
 * Clears any score for affected tables (state reverts to MISSING).
 */
export function usePatchPairing(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      round: number
      action: 'drop' | 'reintroduce' | 'reassign'
      playerId: string
      toTableNumber?: number
    }) =>
      fetchJson(`/api/events/${eventId}/pairings/${input.round}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: input.action,
          playerId: input.playerId,
          toTableNumber: input.toTableNumber,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['standings', eventId] })
    },
  })
}

/**
 * Create a bonus round with a custom subset of players and a label.
 * Bonus rounds don't change Event.currentRound — they're independent.
 */
export function useCreateBonusRound(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      label: string
      playerIds: string[]
      format?: string
      minPerTable?: number
      maxPerTable?: number
      parentRound?: number
    }) =>
      fetchJson(`/api/events/${eventId}/bonus-rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/** Submit, confirm, or update a score. */
export function useSubmitScore(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableNumber: number
      round: number
      placements: Array<{ playerId: string; placement: number; gamePoints: number }>
      note?: string
      action: 'submit' | 'confirm' | 'update'
    }) =>
      fetchJson(`/api/events/${eventId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['standings', eventId] })
    },
  })
}

/** Publish event (set visibility PUBLIC; returns the share/join code). */
export function usePublishEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson(`/api/events/${eventId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      // S8: publishing flips visibility — refresh the My Events feed so
      // the card's Public badge reflects it immediately.
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}

/**
 * S8: unpublish — flip the event back to PRIVATE so /share/[code] and
 * /api/public/[code] 404. The code is kept, so a later re-publish
 * (usePublishEvent) restores the same link.
 */
export function useUnpublishEvent(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchJson(`/api/events/${eventId}/publish`, { method: 'DELETE' }),
    onSuccess: () => {
      // Refresh the My Events feed and the cached event so the card's
      // Public badge flips back immediately.
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}

/** List round configs (with defaults filled in for unconfigured rounds). */
export function useRoundConfigs(eventId: string | null) {
  return useQuery({
    queryKey: ['round-configs', eventId],
    queryFn: () => fetchJson(`/api/events/${eventId}/round-configs`).then((d) => d.roundConfigs as any[]),
    enabled: !!eventId,
  })
}

/** Upsert a single round's config (format, min/max, modifiers). */
export function useUpsertRoundConfig(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      round: number
      format: string
      minPerTable: number
      maxPerTable: number
      modifiers?: any[]
      seatRotation?: string
    }) =>
      fetchJson(`/api/events/${eventId}/round-configs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['round-configs', eventId] }),
  })
}

/** Delete a round's override (revert to event defaults). */
export function useDeleteRoundConfig(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (round: number) =>
      fetchJson(`/api/events/${eventId}/round-configs?round=${round}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['round-configs', eventId] }),
  })
}

/**
 * CSV export — triggers a browser download for either standings or match history.
 * Returns the filename chosen by the server (parsed from Content-Disposition).
 */
export function useExportCsv(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (type: 'standings' | 'matches') => {
      // Read the current locale so the CSV headers are translated.
      // The UI store persists locale — same source useI18n reads from.
      const locale = useUIStore.getState().locale
      const res = await fetch(`/api/events/${eventId}/export?type=${type}&lang=${locale}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      // Parse filename from Content-Disposition
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `${type}.csv`
      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { filename }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

/** Join event by code. */
export function useJoinEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      // First look up the event
      const lookup = await fetchJson('/api/events/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      // Then create participant
      await fetchJson('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: lookup.event.eventId, role: 'PLAYER' }),
      })
      return lookup.event
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ---------------------------------------------------------------------------
// Judge calls
// ---------------------------------------------------------------------------

/**
 * List judge calls for an event.
 *
 * Uses Supabase Realtime for instant push updates — when a player creates a
 * call or a judge acknowledges/resolves it, the UI updates within ~100ms
 * instead of waiting for the next 5s poll.
 *
 * A 30s polling fallback catches any missed Realtime events (e.g. if the
 * WebSocket disconnects temporarily).
 *
 * By default fetches ALL calls; pass `activeOnly: true` to skip RESOLVED.
 */
export function useJudgeCalls(eventId: string | null, opts: { activeOnly?: boolean } = {}) {
  const { activeOnly } = opts
  const queryKey = ['judge-calls', eventId, { activeOnly }] as const

  // NOTE: Supabase Realtime was previously used here but was removed for
  // the same reasons as useEvent (see comment above useEvent). Prisma's
  // quoted camelCase column "eventId" doesn't match Realtime's filter
  // parser, and the JS client's channel caching crashes on re-subscribe.
  //
  // Instead, we use 10s polling + refetchOnWindowFocus. Judge calls are
  // time-sensitive (players are waiting), so we poll faster than event
  // data (15s). When the judge switches back to their tab, refetch is
  // instant via refetchOnWindowFocus.

  return useQuery({
    queryKey,
    queryFn: () => {
      const qs = activeOnly ? '?activeOnly=true' : ''
      return fetchJson(`/api/events/${eventId}/judge-calls${qs}`).then((d) => d.calls)
    },
    enabled: !!eventId,
    // 10s polling — judge calls are time-sensitive.
    refetchInterval: 10 * 1000,
    // Refetch when the judge switches back to their tab.
    refetchOnWindowFocus: true,
  })
}

/** Create a judge call (player pings the judge). */
export function useCreateJudgeCall(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { tableNumber: number; category: string; message?: string }) =>
      fetchJson(`/api/events/${eventId}/judge-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['judge-calls', eventId] }),
  })
}

/** Acknowledge or resolve a judge call. */
export function useUpdateJudgeCall(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { callId: string; action: 'acknowledge' | 'resolve' }) =>
      fetchJson(`/api/events/${eventId}/judge-calls/${input.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: input.action }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['judge-calls', eventId] }),
  })
}

// ---------------------------------------------------------------------------
// Player Stats
// ---------------------------------------------------------------------------

/** Get the current user's stats for a specific event. */
export function usePlayerEventStats(eventId: string | null) {
  return useQuery({
    queryKey: ['player-stats', eventId],
    queryFn: () =>
      fetchJson(`/api/stats/player?eventId=${eventId}`).then((d) => ({
        stats: d.stats as any[],
        summary: d.summary as any,
      })),
    enabled: !!eventId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Get the current user's global stats across all events. */
export function usePlayerGlobalStats() {
  return useQuery({
    queryKey: ['player-stats-global'],
    queryFn: () =>
      fetchJson('/api/stats/player').then((d) => ({
        stats: d.stats as any[],
        summary: d.summary as any,
      })),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
