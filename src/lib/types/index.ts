/**
 * Core domain types for TableTop Prime (v2)
 *
 * v2 changes (per user feedback):
 *   - RoundFormat + RoundConfig: each round can pick its own pairing
 *     algorithm and table size.
 *   - ScoringRules now holds a dynamic-length placementPoints array and
 *     a stackable ScoreModifierConfig list (no more hardcoded 1st-4th).
 *   - PlacementScore carries gamePoints (points the player scored in
 *     the game itself, separate from placement-derived points).
 *   - TableScore carries a judge note and a tablePointsTotal (sum of
 *     gamePoints at the table).
 *   - ScoreState adds DISPUTED for judge-edited locked scores.
 */

export type Role = 'ORGANIZER' | 'JUDGE' | 'PLAYER'
export type PrimeTier = 'FREE' | 'TIER_1' | 'TIER_2' | 'TIER_3'
export type EventStatus = 'DRAFT' | 'CHECK_IN' | 'ACTIVE' | 'FINISHED'
export type JudgeCallCategory = 'SCORE' | 'RULE' | 'OTHER'
export type JudgeCallStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'
export type ScoreState = 'MISSING' | 'PENDING_CONFIRM' | 'LOCKED' | 'DISPUTED'

/**
 * Per-round pairing algorithm.
 *
 *   ROUND_ROBIN   — Social Golfer heuristic: every player meets new opponents
 *                   each round; rematches minimized, standings ignored.
 *   SWISS         — players with similar match records meet (classic Swiss).
 *   SINGLE_ELIM   — knockout; top half advances, losers are out.
 *   ADJACENT_SWISS — bracket-style Swiss (TFT / Commander finals / poker final
 *                   tables): groups are strictly consecutive leaderboard
 *                   positions. Table 1 is always the top table.
 *
 * Legacy: 'CUSTOM' was removed (it duplicated ROUND_ROBIN). Old database rows
 * are normalized to ROUND_ROBIN at read time — see normalizeLegacyFormat().
 */
export type RoundFormat = 'ROUND_ROBIN' | 'SWISS' | 'SINGLE_ELIM' | 'ADJACENT_SWISS'

export type ScoreModifierType =
  | 'ATTENDANCE_BONUS'
  | 'FINAL_ROUND_MULTIPLIER'
  | 'FLAT_BONUS'
  | 'MULTIPLIER'
  | 'CUSTOM'

export interface ScoreModifierConfig {
  id: string
  type: ScoreModifierType
  label: string
  /** Bonus amount (FLAT_BONUS, ATTENDANCE_BONUS, CUSTOM) or multiplier factor (MULTIPLIER, FINAL_ROUND_MULTIPLIER). */
  value: number
  /** Round this modifier applies to, or 'ALL' for every round. */
  appliesTo: number | 'ALL'
}

export interface Player {
  id: string
  name: string
  email?: string
  checkedIn: boolean
  ready: boolean
  /** BGG-style avatar placeholder color */
  color: string
}

export interface TableSeating {
  tableNumber: number
  playerIds: string[]
  /**
   * Phase 4: Optional seat numbers (1-indexed) for each player at this table.
   * `seats[i]` is the seat number for `playerIds[i]`.
   * Undefined when no seat rotation is requested (backward compat).
   */
  seats?: number[]
}

export interface RoundPairing {
  round: number
  format: RoundFormat
  tables: TableSeating[]
  /** Player IDs dropped for this round only (still in the event). */
  droppedPlayerIds: string[]
  /** Bonus-round display label — null/false = regular round (serialized API shape). */
  label?: string | null
  isBonus?: boolean | null
  /** Bonus rounds: the regular round this bonus ties to (0 = "extra"). Regular rounds serialize as 0. */
  parentRound?: number
}

export interface RoundConfig {
  round: number
  format: RoundFormat
  minPerTable: number
  maxPerTable: number
  /** Per-round modifier overrides. Empty = inherit event defaults. */
  modifiers: ScoreModifierConfig[]
}

export interface PlacementScore {
  playerId: string
  placement: number
  /** Points the player scored in the game itself (victory points, etc.). */
  gamePoints: number
  /** Points derived from placement (1st/2nd/3rd…). */
  basePoints: number
  /** Sum of all modifier deltas. */
  bonus: number
  /** basePoints + bonus. (gamePoints is tracked separately for tie-breaking.) */
  total: number
}

export interface TableScore {
  tableNumber: number
  round: number
  placements: PlacementScore[]
  state: ScoreState
  submittedBy?: string | null
  confirmedBy?: string | null
  /** Judge note explaining any adjustment. */
  note?: string | null
  /** Sum of gamePoints across all placements at this table. */
  tablePointsTotal: number
  lastEditedAt?: string
}

/**
 * Tiebreaker methods (Tier 1 — all computed from existing data).
 * Applied in priority order; the first method that breaks the tie wins.
 * "Event points" is always the implicit first sort key and is not
 * listed here.
 */
export type TiebreakerMethod =
  | 'TOTAL_GAME_POINTS'    // Sum of gamePoints across all rounds
  | 'TABLE_STRENGTH'       // Sum of tablePointsTotal for every table played
  | 'FIRST_PLACES'         // Count of rounds where placement === 1
  | 'BEST_PLACEMENT'       // Best single-round placement (1st beats 2nd)
  | 'DROP_WORST_ROUND'     // Sum of all round totals except the lowest

/**
 * How to handle tied placements at a table.
 *
 * SHARED — all tied players get the full points for that placement.
 *   Example: two players tie for 1st → both get placementPoints[0] (e.g., 10 pts each).
 *   The 2nd-place player gets placementPoints[2] (3rd place points), not [1].
 *
 * SPLIT — tied players share the average of the placements they cover.
 *   Example: two players tie for 1st → both get (placementPoints[0] + placementPoints[1]) / 2.
 *   E.g., (10 + 6) / 2 = 8 pts each.
 */
export type TieScoreMode = 'SHARED' | 'SPLIT'

export interface ScoringRules {
  /** Dynamic-length: index 0 = 1st place, 1 = 2nd, etc. */
  placementPoints: number[]
  /** How to score tied placements. Defaults to 'SHARED' for backward compat. */
  tieScoreMode?: TieScoreMode
  /** Stackable modifiers — evaluated in order. */
  modifiers: ScoreModifierConfig[]
  /** Ordered tiebreaker list (applied after event points). */
  tiebreakers: TiebreakerMethod[]
}

export interface EventTemplate {
  id: string
  name: string
  gameName: string
  minPlayersPerTable: number
  maxPlayersPerTable: number
  totalRounds: number
  scoringRules: ScoringRules
}

/**
 * A single session/date entry on an event's schedule.
 *
 * `start` and `end` are ISO 8601 strings WITH timezone offset
 * (e.g. "2026-08-15T14:00:00-03:00"). Storing the offset — not UTC —
 * means "2 PM Buenos Aires" stays "2 PM Buenos Aires" regardless of
 * the viewer's locale. The UI formats for display via Intl.DateTimeFormat.
 *
 * `end` is optional for events that have only a start time (e.g. "starts
 * at 7 PM, ends whenever the last table finishes").
 */
export interface EventSession {
  start: string
  end?: string
}

export interface TournamentEvent {
  id: string
  name: string
  gameName: string
  gameBggId?: string | null
  gameMaxPlayers?: number | null
  /** Default min/max — can be overridden per round via roundConfigs. */
  minPlayersPerTable: number
  maxPlayersPerTable: number
  totalRounds: number
  status: EventStatus
  /** The round currently being played / scored. */
  currentRound: number
  primeTier: PrimeTier
  /** Short human-readable code for joining (e.g. "SUMMER-7K3"). */
  eventCode?: string | null
  /** Plain-text description shown on dashboard + share page. Null = not set. */
  description?: string | null
  /** Schedule entries (sorted by start time). Null/empty = no schedule. */
  schedule?: EventSession[] | null
  /** Procedural banner seed offset — increment to reroll the banner. Default 0. */
  bannerSeedOffset?: number
  playerIds: string[]
  /** Full player rows (subset: id, name, checkedIn, ready, color). */
  players: Player[]
  pairings: RoundPairing[]
  scores: TableScore[]
  scoringRules: ScoringRules
  /** Per-round overrides (format, table size, modifiers). */
  roundConfigs: RoundConfig[]
  createdAt: string
}

export interface JudgeCall {
  id: string
  tableNumber: number
  category: JudgeCallCategory
  message?: string
  submittedBy: string
  status: JudgeCallStatus
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
}

export interface PrimePlan {
  tier: PrimeTier
  name: string
  maxPlayers: number
  pricePerMonth: number
  target: string
  features: string[]
  highlight?: boolean
}
