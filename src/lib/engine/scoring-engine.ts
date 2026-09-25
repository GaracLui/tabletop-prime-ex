/**
 * Scoring Engine — Strategy + Decorator Pattern (v2)
 *
 * v2 changes:
 *   - The modifier chain is now data-driven (ScoreModifierConfig[]),
 *     so organizers can add/remove/reorder modifiers per event or per
 *     round without changing code.
 *   - PlacementScore carries `gamePoints` — the points the player
 *     scored in the game itself (victory points, etc.) — separate
 *     from the placement-derived points.
 *   - TableScore carries `tablePointsTotal` (sum of gamePoints) and
 *     a `note` for judge adjustments.
 *   - Modifiers can target a specific round (`appliesTo: number`) or
 *     every round (`appliesTo: 'ALL'`).
 */

import type {
  PlacementScore,
  ScoreModifierConfig,
  ScoringRules,
  TiebreakerMethod,
} from '@/lib/types'

export interface ScoreContext {
  playerId: string
  placement: number
  /** Points scored in the game itself. */
  gamePoints: number
  round: number
  totalRounds: number
  attended: boolean
}

/**
 * Apply a single modifier on top of the current running total.
 * Returns the delta to add (may be 0).
 *
 * NaN guard: if mod.value is NaN (e.g. from a locale-specific "2,4" input
 * that wasn't normalized by the browser), all multiplier/bonus calculations
 * would produce NaN, silently corrupting every player's score. We treat
 * NaN as 0 to prevent this — the organizer sees no bonus applied and can
 * fix the value, rather than having all scores become NaN.
 */
export function applyModifier(
  mod: ScoreModifierConfig,
  currentTotal: number,
  ctx: ScoreContext
): number {
  // Per-round filter
  if (mod.appliesTo !== 'ALL' && mod.appliesTo !== ctx.round) return 0

  // Guard against NaN — treat as 0 so scores don't silently corrupt.
  const value = isNaN(mod.value) ? 0 : mod.value
  // Also guard the current total (shouldn't be NaN, but defense-in-depth).
  const total = isNaN(currentTotal) ? 0 : currentTotal

  switch (mod.type) {
    case 'ATTENDANCE_BONUS':
      return ctx.attended ? value : 0
    case 'FINAL_ROUND_MULTIPLIER':
      // value=2 means total is doubled → delta = total × (value-1)
      return ctx.round === ctx.totalRounds && ctx.totalRounds > 1
        ? Math.round(total * (value - 1))
        : 0
    case 'FLAT_BONUS':
      return value
    case 'MULTIPLIER':
      return Math.round(total * (value - 1))
    case 'CUSTOM':
      return value
    default:
      return 0
  }
}

/**
 * Score a single placement, applying all matching modifiers in order.
 *
 * @param ctx player + round context
 * @param rules event-level scoring rules
 * @param extraModifiers additional modifiers to merge (e.g., per-round overrides).
 *   When provided, they REPLACE the event-level modifiers for this calculation.
 */
/**
 * Compute the base points for a placement, handling ties.
 *
 * SHARED mode: all tied players get the full points for their placement.
 *   Two players tie for 1st → both get placementPoints[0]. Next player gets [2] (3rd).
 *
 * SPLIT mode: tied players share the average of the placements they span.
 *   Two players tie for 1st → both get (placementPoints[0] + placementPoints[1]) / 2.
 *   Rounded to the nearest integer.
 */
function computeBasePoints(
  placement: number,
  rules: ScoringRules,
  allPlacements: number[],
): number {
  const idx = Math.max(0, placement - 1)
  const mode = rules.tieScoreMode ?? 'SHARED' // backward compat

  if (mode === 'SHARED') {
    return rules.placementPoints[idx] ?? 0
  }

  // SPLIT mode: find all players with the same placement
  const tiedCount = allPlacements.filter((p) => p === placement).length
  if (tiedCount <= 1) {
    return rules.placementPoints[idx] ?? 0
  }

  // Average the points across the span of tied placements.
  // If 2 players tie for 1st, they span placements 1 and 2 → average of [0] and [1].
  // If 3 players tie for 1st, they span 1, 2, 3 → average of [0], [1], [2].
  let sum = 0
  for (let i = 0; i < tiedCount; i++) {
    sum += rules.placementPoints[idx + i] ?? 0
  }
  return Math.round(sum / tiedCount)
}

export function scorePlacement(
  ctx: ScoreContext,
  rules: ScoringRules,
  extraModifiers?: ScoreModifierConfig[],
  allPlacements?: number[],
): PlacementScore {
  const basePoints = computeBasePoints(
    ctx.placement,
    rules,
    allPlacements ?? [ctx.placement],
  )
  let bonus = 0
  let total = basePoints

  const mods = extraModifiers ?? rules.modifiers
  for (const mod of mods) {
    const delta = applyModifier(mod, total, ctx)
    bonus += delta
    total += delta
  }

  return {
    playerId: ctx.playerId,
    placement: ctx.placement,
    gamePoints: ctx.gamePoints,
    basePoints,
    bonus,
    total,
  }
}

/** Score an entire table's placements in one shot. */
export function scoreTable(
  placements: Array<{ playerId: string; placement: number; gamePoints: number }>,
  round: number,
  totalRounds: number,
  rules: ScoringRules,
  extraModifiers?: ScoreModifierConfig[]
): PlacementScore[] {
  const allPlacements = placements.map((p) => p.placement)
  return placements.map((p) =>
    scorePlacement(
      {
        playerId: p.playerId,
        placement: p.placement,
        gamePoints: p.gamePoints,
        round,
        totalRounds,
        attended: true,
      },
      rules,
      extraModifiers,
      allPlacements,
    )
  )
}

/** Sum a player's locked scores across all rounds → standings row. */
export function aggregateStandings(
  playerIds: string[],
  scores: Array<{
    placements: PlacementScore[]
    state: string
    round: number
    tableNumber: number
    tablePointsTotal: number
  }>,
  rules: ScoringRules
): Array<{
  playerId: string
  total: number
  gamePointsTotal: number
  /** Sum of tablePointsTotal for every table the player played at. */
  accumulatedTablePoints: number
  rounds: number
  bestPlacement: number
  /** Count of rounds where placement === 1. */
  firstPlaceCount: number
  /** Sum of all round totals except the lowest. */
  dropWorstTotal: number
  /** Per-round breakdown: round -> { total, gamePoints, placement, table, tablePoints } */
  perRound: Record<
    number,
    {
      total: number
      gamePoints: number
      placement: number
      table: number
      tablePoints: number
    }
  >
}> {
  const byPlayer = new Map<
    string,
    {
      total: number
      gamePointsTotal: number
      accumulatedTablePoints: number
      rounds: number
      bestPlacement: number
      firstPlaceCount: number
      roundTotals: number[]
      perRound: Record<
        number,
        {
          total: number
          gamePoints: number
          placement: number
          table: number
          tablePoints: number
        }
      >
    }
  >()

  for (const id of playerIds) {
    byPlayer.set(id, {
      total: 0,
      gamePointsTotal: 0,
      accumulatedTablePoints: 0,
      rounds: 0,
      bestPlacement: Number.MAX_SAFE_INTEGER,
      firstPlaceCount: 0,
      roundTotals: [],
      perRound: {},
    })
  }

  for (const s of scores) {
    if (s.state !== 'LOCKED' && s.state !== 'DISPUTED') continue
    for (const p of s.placements) {
      const row = byPlayer.get(p.playerId)
      if (!row) continue
      row.total += p.total
      row.gamePointsTotal += p.gamePoints
      row.accumulatedTablePoints += s.tablePointsTotal
      row.rounds += 1
      if (p.placement < row.bestPlacement) row.bestPlacement = p.placement
      if (p.placement === 1) row.firstPlaceCount += 1
      row.roundTotals.push(p.total)
      row.perRound[s.round] = {
        total: p.total,
        gamePoints: p.gamePoints,
        placement: p.placement,
        table: s.tableNumber,
        tablePoints: s.tablePointsTotal,
      }
    }
  }

  const tiebreakers = rules.tiebreakers ?? []

  return Array.from(byPlayer.entries())
    .map(([playerId, v]) => {
      // Compute drop-worst: sum all round totals except the lowest
      const sortedTotals = [...v.roundTotals].sort((a, b) => a - b)
      const dropWorstTotal = sortedTotals.slice(1).reduce((s, t) => s + t, 0)

      return {
        playerId,
        total: v.total,
        gamePointsTotal: v.gamePointsTotal,
        accumulatedTablePoints: v.accumulatedTablePoints,
        rounds: v.rounds,
        bestPlacement:
          v.bestPlacement === Number.MAX_SAFE_INTEGER ? 0 : v.bestPlacement,
        firstPlaceCount: v.firstPlaceCount,
        dropWorstTotal,
        perRound: v.perRound,
      }
    })
    .sort((a, b) => {
      // Always sort by event points first (implicit, can't be removed)
      if (b.total !== a.total) return b.total - a.total

      // Apply configured tiebreakers in order
      for (const tb of tiebreakers) {
        const cmp = compareTiebreaker(tb, a, b)
        if (cmp !== 0) return cmp
      }

      // Final fallback: player ID for stable sort
      return a.playerId.localeCompare(b.playerId)
    })
}

/**
 * Compare two players using a single tiebreaker method.
 * Returns negative if `a` ranks higher, positive if `b` ranks higher,
 * 0 if tied.
 */
function compareTiebreaker(
  method: TiebreakerMethod,
  a: {
    gamePointsTotal: number
    accumulatedTablePoints: number
    bestPlacement: number
    firstPlaceCount: number
    dropWorstTotal: number
  },
  b: {
    gamePointsTotal: number
    accumulatedTablePoints: number
    bestPlacement: number
    firstPlaceCount: number
    dropWorstTotal: number
  }
): number {
  switch (method) {
    case 'TOTAL_GAME_POINTS':
      return b.gamePointsTotal - a.gamePointsTotal
    case 'TABLE_STRENGTH':
      return b.accumulatedTablePoints - a.accumulatedTablePoints
    case 'FIRST_PLACES':
      return b.firstPlaceCount - a.firstPlaceCount
    case 'BEST_PLACEMENT':
      // Lower placement number is better (1st > 2nd).
      // 0 means "no placement" — treat as worst.
      if (a.bestPlacement === 0 && b.bestPlacement === 0) return 0
      if (a.bestPlacement === 0) return 1
      if (b.bestPlacement === 0) return -1
      return a.bestPlacement - b.bestPlacement
    case 'DROP_WORST_ROUND':
      return b.dropWorstTotal - a.dropWorstTotal
    default:
      return 0
  }
}

/** Compute the table's total gamePoints (sum of all placements' gamePoints). */
export function computeTablePointsTotal(
  placements: PlacementScore[]
): number {
  return placements.reduce((sum, p) => sum + (p.gamePoints || 0), 0)
}

/** Helper: merge event-level modifiers with per-round overrides. */
export function mergeModifiers(
  eventModifiers: ScoreModifierConfig[],
  roundModifiers: ScoreModifierConfig[]
): ScoreModifierConfig[] {
  if (roundModifiers.length === 0) return eventModifiers
  // Per-round overrides REPLACE event defaults for that round
  return roundModifiers
}
