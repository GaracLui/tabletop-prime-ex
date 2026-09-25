/**
 * Shared serialization helpers for Event API routes.
 *
 * Both `GET /api/events` and `GET /api/events/[eventId]` need to convert
 * Prisma Event rows (with relations) into the frontend TournamentEvent shape.
 * This file provides `serializeEvent` (full) and `parseSchedule`.
 *
 * C2: `serializeEvent` used to be `(event: any): any`. It is now fully
 * typed on both sides — the input is a structural subset interface (so
 * callers passing Prisma rows with `include`, `select` subsets, or no
 * relations at all all typecheck), and the output is the domain
 * `TournamentEvent` DTO the frontend consumes.
 */
import type {
  EventStatus,
  EventSession,
  PlacementScore,
  RoundConfig,
  RoundFormat,
  RoundPairing,
  ScoringRules,
  ScoreModifierConfig,
  TableScore,
  TableSeating,
  TournamentEvent,
} from '@/lib/types'

/** Player subset the serializer reads (the GET select matches this exactly). */
export interface SerializablePlayer {
  id: string
  name: string
  checkedIn: boolean
  ready: boolean
  color: string
}

/** RoundPairing subset the serializer reads. */
export interface SerializableRoundPairing {
  round: number
  format: RoundFormat
  tablesJson: string
  droppedPlayerIdsJson: string
  label: string | null
  isBonus: boolean
  parentRound: number | null
}

/** TableScore + placements subset the serializer reads. */
export interface SerializableTableScore {
  tableNumber: number
  round: number
  state: string
  submittedBy: string | null
  confirmedBy: string | null
  note: string | null
  tablePointsTotal: number
  placements: Array<{
    playerId: string
    placement: number
    gamePoints: number
    basePoints: number
    bonus: number
    total: number
  }>
}

/** RoundConfig subset the serializer reads. */
export interface SerializableRoundConfig {
  round: number
  format: RoundFormat
  minPerTable: number
  maxPerTable: number
  modifiersJson: string
}

/**
 * Structural input for serializeEvent. Relations are optional because
 * write endpoints (POST/PATCH) serialize bare Event rows, while GET
 * endpoints load some or all relations. Any Prisma Event row (or row
 * with include/select subsets) is assignable to this.
 */
export interface SerializableEvent {
  id: string
  name: string
  gameName: string
  gameBggId: string | null
  gameMaxPlayers: number | null
  minPlayersPerTable: number
  maxPlayersPerTable: number
  totalRounds: number
  status: EventStatus
  currentRound: number
  primeTier: string
  eventCode: string | null
  scoringRulesJson: string
  description: string | null
  scheduleJson: string | null
  bannerSeedOffset: number | null
  createdAt: Date
  players?: SerializablePlayer[]
  pairings?: SerializableRoundPairing[]
  scores?: SerializableTableScore[]
  roundConfigs?: SerializableRoundConfig[]
}

/**
 * Parse the scheduleJson column into a sorted EventSession[].
 *
 * - Returns null when the column is null/empty or the JSON is invalid.
 * - Trims and sorts entries by start time ascending (so the next upcoming
 *   session is always at index 0 in the UI).
 * - Drops entries whose `start` is not a parseable date — defensive against
 *   hand-edited rows in the SQL editor.
 */
export function parseSchedule(raw: string | null | undefined): EventSession[] | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const sessions: EventSession[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const start = (item as Record<string, unknown>).start
    if (typeof start !== 'string' || isNaN(Date.parse(start))) continue
    const end = (item as Record<string, unknown>).end
    sessions.push({
      start,
      ...(typeof end === 'string' && !isNaN(Date.parse(end)) ? { end } : {}),
    })
  }
  if (sessions.length === 0) return null
  sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return sessions
}

/** Full serialization — includes all relations (players, pairings, scores, roundConfigs). */
export function serializeEvent(event: SerializableEvent): TournamentEvent {
  return {
    id: event.id,
    name: event.name,
    gameName: event.gameName,
    gameBggId: event.gameBggId,
    gameMaxPlayers: event.gameMaxPlayers,
    minPlayersPerTable: event.minPlayersPerTable,
    maxPlayersPerTable: event.maxPlayersPerTable,
    totalRounds: event.totalRounds,
    status: event.status,
    currentRound: event.currentRound,
    primeTier: event.primeTier as TournamentEvent['primeTier'],
    eventCode: event.eventCode,
    description: event.description ?? null,
    schedule: parseSchedule(event.scheduleJson),
    bannerSeedOffset: event.bannerSeedOffset ?? 0,
    scoringRules: JSON.parse(event.scoringRulesJson) as ScoringRules,
    playerIds: (event.players || []).map((p) => p.id),
    players: (event.players || []).map((p): TournamentEvent['players'][number] => ({
      id: p.id,
      name: p.name,
      checkedIn: p.checkedIn,
      ready: p.ready,
      color: p.color,
    })),
    pairings: (event.pairings || []).map(
      (r): RoundPairing => ({
        round: r.round,
        format: r.format,
        tables: JSON.parse(r.tablesJson) as TableSeating[],
        droppedPlayerIds: JSON.parse(r.droppedPlayerIdsJson) as string[],
        label: r.label,
        isBonus: r.isBonus,
        parentRound: r.parentRound ?? 0,
      })
    ),
    scores: (event.scores || []).map(
      (s): TableScore => ({
        tableNumber: s.tableNumber,
        round: s.round,
        state: s.state as TableScore['state'],
        submittedBy: s.submittedBy,
        confirmedBy: s.confirmedBy,
        note: s.note,
        tablePointsTotal: s.tablePointsTotal,
        placements: (s.placements || []).map((p): PlacementScore => ({
          playerId: p.playerId,
          placement: p.placement,
          gamePoints: p.gamePoints,
          basePoints: p.basePoints,
          bonus: p.bonus,
          total: p.total,
        })),
      })
    ),
    roundConfigs: (event.roundConfigs || []).map(
      (rc): RoundConfig => ({
        round: rc.round,
        format: rc.format,
        minPerTable: rc.minPerTable,
        maxPerTable: rc.maxPerTable,
        modifiers: JSON.parse(rc.modifiersJson) as ScoreModifierConfig[],
      })
    ),
    createdAt: event.createdAt.toISOString(),
  }
}
