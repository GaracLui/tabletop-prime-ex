/**
 * Multiplayer Pairing Engine — Strategy Pattern (v6)
 *
 * v6 changes:
 *   - REMOVED CustomStrategy (it was an alias of SocialGolferStrategy with no
 *     distinct behavior — ROUND_ROBIN does the same job).
 *   - NEW AdjacentSwissStrategy ('ADJACENT_SWISS'): bracket-style Swiss used by
 *     TFT / MTG Commander finals / poker final tables. Groups players strictly
 *     by consecutive leaderboard position — Table 1 is always the top table,
 *     and players move up/down tables every round based on new standings.
 *     Fully deterministic, no rematch optimization (tier structure is sacred).
 *   - normalizeLegacyFormat(): maps legacy 'CUSTOM' rows to ROUND_ROBIN so old
 *     databases keep working before/without the enum migration.
 *   - PairingDiagnostics.seatableCount added (how many actives fit the tables).
 *
 * v5.1 (Phase 4 bugfixes): BALANCED rotation offsets (full seat coverage),
 *   mutation seat stripping, partialRepair dual-state fix, generalized byes
 *   for any bracket base, serpentine seeding, advanceCount clamping.
 *
 * v5 (Phase 4): seat rotation, table-size preference, score-group repair, stage plan
 * v4 (Phase 3): rematch counts, byes, tiebreakers, diagnostics, partial re-pair
 * v3 (Phase 2): delta scoring, adjacency map, time budget, Swiss minPerTable, single-elim seeding
 * v2.1 (Phase 1): finalize(), reassignPlayer fixes, early-exit, deterministic RNG, getStrategy throws
 */

import type { Player, RoundPairing, RoundFormat, TableSeating } from '@/lib/types'
import { MAX_PAIRING_ATTEMPTS } from '@/lib/constants'

export interface PairingStrategy {
  readonly format: RoundFormat
  generate(opts: PairingOptions): RoundPairing
  /**
   * Phase 3: Run the strategy and return both the pairing and diagnostics
   * about how the search went (conflicts left, iterations, time used, etc.).
   */
  generateWithDiagnostics?(opts: PairingOptions): { pairing: RoundPairing; diagnostics: PairingDiagnostics }
}

// ---------------------------------------------------------------------------
// Standing entry — richer than just `number`
// ---------------------------------------------------------------------------

/**
 * A standings row. Replaces the bare `Map<string, number>` so the pairing
 * engine can apply tiebreakers consistently with the scoring engine.
 *
 * The legacy `Map<string, number>` is still accepted (treated as just `total`).
 */
export interface StandingEntry {
  /** Event points (always the primary sort key). */
  total: number
  /** Tiebreaker 1: sum of gamePoints across all rounds. */
  gamePointsTotal?: number
  /** Tiebreaker 2: best (lowest) single-round placement. */
  bestPlacement?: number
  /** Tiebreaker 3: count of rounds where placement === 1. */
  firstPlaceCount?: number
  /** Tiebreaker 4: sum of all round totals except the lowest. */
  dropWorstTotal?: number
  /** Tiebreaker 5: sum of tablePointsTotal for every table played. */
  accumulatedTablePoints?: number
}

/** Backward-compat: callers can still pass a plain number map. */
export type StandingsMap = Map<string, number | StandingEntry>

// ---------------------------------------------------------------------------
// Pairing options
// ---------------------------------------------------------------------------

export interface PairingOptions {
  players: Player[]
  round: number
  minPerTable: number
  maxPerTable: number
  /**
   * Phase 2 (binary): Set<string> of pair keys (canonical "a|b" form).
   * Phase 3 (weighted): also accept Map<string, number> of pairKey -> meet count.
   * The engine converts either form to the weighted adjacency map.
   */
  previousPairings?: Set<string> | Map<string, number>
  /** Players who dropped for this round only (still in the event). */
  droppedPlayerIds?: string[]
  /** Standings map for Swiss / Single Elim. Accepts number OR StandingEntry. */
  standings?: StandingsMap
  /** Ordered tiebreaker chain (same as ScoringRules.tiebreakers). */
  tiebreakers?: import('@/lib/types').TiebreakerMethod[]
  /** For Single Elim: number of players to advance. Defaults to top half. */
  advanceCount?: number
  /** Deterministic RNG for reproducible pairings (use mulberry32(seed)). */
  rng?: () => number
  /** Max time in ms for min-conflicts search. Default: 2000. */
  deadlineMs?: number
  /**
   * Phase 4: Within-table seat assignment strategy.
   * Default: 'NONE' (no seats[] produced, backward compat).
   */
  seatRotation?: SeatRotationStrategy
  /**
   * Phase 4: How to scan table sizes when N doesn't divide evenly.
   * Default: 'PREFER_FEWER_LARGE' (matches v1-v4 behavior).
   * Swiss recommends 'PREFER_MORE_SMALL' for tighter score-group separation,
   * but the default stays PREFER_FEWER_LARGE for backward compat.
   */
  tableSizePreference?: TableSizePreference
}

// ---------------------------------------------------------------------------
// Pairing diagnostics — surfaced to the UI so organizers know if a 0-conflict
// solution was found, how many conflicts remain, etc.
// ---------------------------------------------------------------------------

export interface PairingDiagnostics {
  /** True if the engine reached a 0-conflict pairing. */
  feasible: boolean
  /** Number of rematch pairs in the final pairing (weighted by meet count). */
  conflictCount: number
  /** Number of conflicting tables (tables with ≥1 rematch). */
  conflictingTables: number
  /** Total iterations run across all restarts. */
  iterationsRun: number
  /** Number of restarts used. */
  restartsRun: number
  /** Wall-clock ms consumed by the search. */
  timeBudgetMs: number
  /** Time budget that was requested (deadlineMs option). */
  timeBudgetRequestedMs: number
  /** True if the search terminated due to time budget, not iteration cap. */
  terminatedByTime: boolean
  /** Table numbers that still contain rematches. */
  conflictTableNumbers: number[]
  /**
   * v6: How many active players the computed table structure can seat.
   * Less than the active count means the lowest-ranked players sit out
   * (e.g., 5 players at a 4-max table). Undefined when not meaningful.
   */
  seatableCount?: number
}

// ---------------------------------------------------------------------------
// Phase 4: Seat rotation, table-size preference, stage plan
// ---------------------------------------------------------------------------

/**
 * Phase 4: How to assign seats within each table.
 *
 * NONE — no seat assignment (default; backward compat; seats[] is undefined).
 * CLOCKWISE — first player rotates clockwise by 1 each round.
 *   Round 1: player[0] sits in seat 1, player[1] in seat 2, etc.
 *   Round 2: player[0] sits in seat 2, player[1] in seat 3, …, player[N-1] in seat 1.
 *   Over N rounds, every player sits in every seat once (perfect for first-player rotation).
 *
 * BALANCED — players are spread so each player gets each seat approximately
 *   equally across the tournament, even when rounds ≠ table size.
 *   Uses a Latin-square-style distribution: seat(i, R) = ((i + R * step) % n) + 1
 *   where step = floor(n/2) for even n (gives "opposite" seat each round),
 *   step = 1 for odd n (degenerates to CLOCKWISE).
 */
export type SeatRotationStrategy = 'NONE' | 'CLOCKWISE' | 'BALANCED'

/**
 * Phase 4: How computeValidSizes scans the table-count range.
 *
 * PREFER_FEWER_LARGE — scan from floor(n/max) upward. Fewer, larger tables.
 *   Default for most formats (matches v1-v4 behavior).
 * PREFER_MORE_SMALL — scan from floor(n/min) downward. More, smaller tables.
 *   Default for Swiss (better score-group differentiation).
 * BALANCED — prefer the table count whose average table size is closest to
 *   the midpoint of (min+max)/2.
 */
export type TableSizePreference = 'PREFER_FEWER_LARGE' | 'PREFER_MORE_SMALL' | 'BALANCED'

/**
 * Phase 4: A tournament stage — a contiguous run of rounds using one format.
 * Used by generateStageTransitions() to compute advance counts between stages.
 */
export interface StagePlan {
  /** Stage name (display only). */
  name: string
  /** Round numbers this stage covers (1-indexed, contiguous). */
  rounds: number[]
  /** Pairing format for all rounds in this stage. */
  format: RoundFormat
  /**
   * Number of players to ADVANCE to the next stage.
   * Undefined = advance all players (no cut).
   * For the final stage, this is ignored.
   */
  advanceCount?: number
}

/**
 * Phase 4: Computed transition between two stages.
 * Tells the caller: at the end of `fromStage`, take the top N players
 * (by standings) and only they participate in `toStage`.
 */
export interface StageTransition {
  /** Round number where `fromStage` ends. */
  cutoffRound: number
  /** Stage that just ended. */
  fromStage: StagePlan
  /** Stage that begins next round. */
  toStage: StagePlan
  /**
   * Number of players who advance from `fromStage` to `toStage`.
   * v5.1: undefined when `fromStage.advanceCount` is unset (no cut — all
   * players advance). Use isEliminationCut to distinguish cut vs. no-cut.
   */
  advanceCount: number | undefined
  /** Players NOT in the top-N are dropped from `toStage` (eliminated). */
  isEliminationCut: boolean
}

// ---------------------------------------------------------------------------
// RNG — deterministic PRNG
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Weighted adjacency map — replaces both Set<string> and pairKey strings
// ---------------------------------------------------------------------------

/**
 * Weighted adjacency map: Map<playerId, Map<otherId, meetCount>>.
 * meetCount = number of rounds these two players have been at the same table.
 * scoreTable now sums meetCounts (so meeting 3× is 3× worse than meeting 1×).
 */
export type AdjacencyMap = Map<string, Map<string, number>>

/**
 * Build a weighted adjacency map from either:
 *   - Set<string> of pair keys (legacy: meet count = 1)
 *   - Map<string, number> of pairKey -> meet count (weighted)
 */
function buildAdjacency(
  previous: Set<string> | Map<string, number> | undefined,
): AdjacencyMap | undefined {
  if (!previous || previous.size === 0) return undefined
  const map: AdjacencyMap = new Map()
  const ensure = (id: string): Map<string, number> => {
    let m = map.get(id)
    if (!m) {
      m = new Map()
      map.set(id, m)
    }
    return m
  }
  if (previous instanceof Set) {
    for (const key of previous) {
      const [a, b] = key.split('|')
      if (a === b) continue
      ensure(a).set(b, 1)
      ensure(b).set(a, 1)
    }
  } else {
    for (const [key, count] of previous) {
      const [a, b] = key.split('|')
      if (a === b) continue
      ensure(a).set(b, count)
      ensure(b).set(a, count)
    }
  }
  return map
}

/** Get meet count between two players (0 = never met). */
function meetCount(adj: AdjacencyMap | undefined, a: string, b: string): number {
  if (!adj) return 0
  return adj.get(a)?.get(b) ?? 0
}

/** Sum of meet counts (weights) at a single table. */
function scoreTable(playerIds: string[], adj: AdjacencyMap | undefined): number {
  if (!adj || adj.size === 0) return 0
  let total = 0
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      total += meetCount(adj, playerIds[i], playerIds[j])
    }
  }
  return total
}

/** Score all tables (full rescore). */
function scoreAllTables(tables: TableSeating[], adj: AdjacencyMap | undefined): number {
  if (!adj || adj.size === 0) return 0
  let total = 0
  for (const t of tables) total += scoreTable(t.playerIds, adj)
  return total
}

// ---------------------------------------------------------------------------
// finalize() + validation (from Phase 1)
// ---------------------------------------------------------------------------

function finalize(
  active: Player[],
  tables: TableSeating[],
  dropped: string[],
  round: number,
  format: RoundFormat,
  byes: string[] = [],
): RoundPairing {
  const seatedIds = new Set(tables.flatMap((t) => t.playerIds))
  const unseated = active.filter((p) => !seatedIds.has(p.id) && !byes.includes(p.id)).map((p) => p.id)
  const filtered = tables.filter((t) => t.playerIds.length > 0)
  filtered.forEach((t, i) => (t.tableNumber = i + 1))
  const allDropped = [...new Set([...dropped, ...unseated, ...byes])]
  return {
    round,
    format,
    tables: filtered,
    droppedPlayerIds: allDropped,
  }
}

function validatePairing(pairing: RoundPairing, active: Player[]): void {
  if (process.env.NODE_ENV === 'production') return
  const seen = new Set<string>()
  for (const t of pairing.tables) {
    if (t.playerIds.length === 0) console.warn('[pairing] Empty table in result')
    for (const id of t.playerIds) {
      if (seen.has(id)) console.error(`[pairing] Player ${id} at multiple tables!`)
      seen.add(id)
    }
  }
  for (const p of active) {
    if (!seen.has(p.id) && !pairing.droppedPlayerIds.includes(p.id)) {
      console.error(`[pairing] Player ${p.id} vanished!`)
    }
  }
}

// ---------------------------------------------------------------------------
// Standings comparator — applies tiebreaker chain
// ---------------------------------------------------------------------------

/**
 * Build a comparator that sorts players by:
 *   1. StandingEntry.total (desc)
 *   2. Each tiebreaker in opts.tiebreakers (desc for count-like, asc for placement-like)
 *   3. Player.name (asc) as final fallback
 *
 * Legacy callers pass `Map<string, number>` (treated as just `total`); the
 * tiebreaker list is empty in that case, so we fall straight to name sort.
 */
function buildStandingsComparator(
  standings: StandingsMap | undefined,
  tiebreakers: import('@/lib/types').TiebreakerMethod[] = [],
): (a: Player, b: Player) => number {
  const get = (id: string): StandingEntry => {
    const raw = standings?.get(id)
    if (raw === undefined) return { total: 0 }
    return typeof raw === 'number' ? { total: raw } : raw
  }
  return (a: Player, b: Player): number => {
    const sa = get(a.id)
    const sb = get(b.id)
    if (sb.total !== sa.total) return sb.total - sa.total
    for (const tb of tiebreakers) {
      const cmp = compareByTiebreaker(tb, sa, sb)
      if (cmp !== 0) return cmp
    }
    return a.name.localeCompare(b.name)
  }
}

/** Compare two StandingEntry objects by a single tiebreaker method. */
function compareByTiebreaker(
  method: import('@/lib/types').TiebreakerMethod,
  a: StandingEntry,
  b: StandingEntry,
): number {
  switch (method) {
    case 'TOTAL_GAME_POINTS': {
      const av = a.gamePointsTotal ?? 0
      const bv = b.gamePointsTotal ?? 0
      return bv - av
    }
    case 'TABLE_STRENGTH': {
      const av = a.accumulatedTablePoints ?? 0
      const bv = b.accumulatedTablePoints ?? 0
      return bv - av
    }
    case 'FIRST_PLACES': {
      const av = a.firstPlaceCount ?? 0
      const bv = b.firstPlaceCount ?? 0
      return bv - av
    }
    case 'BEST_PLACEMENT': {
      const av = a.bestPlacement ?? Number.MAX_SAFE_INTEGER
      const bv = b.bestPlacement ?? Number.MAX_SAFE_INTEGER
      return av - bv // lower = better
    }
    case 'DROP_WORST_ROUND': {
      const av = a.dropWorstTotal ?? 0
      const bv = b.dropWorstTotal ?? 0
      return bv - av
    }
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Min-conflicts search state — captures diagnostics
// ---------------------------------------------------------------------------

interface SearchStats {
  iterations: number
  restarts: number
  startTime: number
  endTime: number
  terminatedByTime: boolean
}

// ---------------------------------------------------------------------------
// SocialGolferStrategy
// ---------------------------------------------------------------------------

export class SocialGolferStrategy implements PairingStrategy {
  readonly format: RoundFormat = 'ROUND_ROBIN'

  generate(opts: PairingOptions): RoundPairing {
    return this.generateWithDiagnostics(opts).pairing
  }

  generateWithDiagnostics(opts: PairingOptions): {
    pairing: RoundPairing
    diagnostics: PairingDiagnostics
  } {
    const rng = opts.rng ?? Math.random
    const active = opts.players.filter(
      (p) => !opts.droppedPlayerIds?.includes(p.id)
    )
    if (active.length === 0) {
      return {
        pairing: {
          round: opts.round,
          format: this.format,
          tables: [],
          droppedPlayerIds: opts.droppedPlayerIds ?? [],
        },
        diagnostics: emptyDiagnostics(opts.deadlineMs ?? 2000),
      }
    }

    const adj = buildAdjacency(opts.previousPairings)

    let best: TableSeating[] | null = null
    let bestScore = Number.POSITIVE_INFINITY
    const stats: SearchStats = {
      iterations: 0,
      restarts: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      terminatedByTime: false,
    }

    // Phase 4: respect table-size preference (default = PREFER_FEWER_LARGE for RR/Custom)
    const preference: TableSizePreference = opts.tableSizePreference ?? 'PREFER_FEWER_LARGE'

    // 1. Greedy min-conflicts partition
    const greedy = this.greedyPartition(active, opts.minPerTable, opts.maxPerTable, adj, rng, preference)
    const greedyScore = scoreAllTables(greedy, adj)
    if (greedyScore < bestScore) {
      bestScore = greedyScore
      best = greedy
    }

    // 2. Random sampling — only if greedy didn't find 0
    if (bestScore > 0) {
      const attempts = Math.min(500, Math.max(MAX_PAIRING_ATTEMPTS, Math.ceil(active.length * 1.5)))
      for (let attempt = 0; attempt < attempts; attempt++) {
        const shuffled = shuffle(active, rng)
        const tables = this.partition(shuffled, opts.minPerTable, opts.maxPerTable, preference)
        const score = scoreAllTables(tables, adj)
        if (score < bestScore) {
          bestScore = score
          best = tables
          if (score === 0) break
        }
      }
    }

    // 3. Min-conflicts local search with delta scoring + time budget
    if (bestScore > 0 && adj && adj.size > 0) {
      const pairsPerTable = (opts.maxPerTable * (opts.maxPerTable - 1)) / 2
      const maxIter = Math.max(2000, Math.min(20000, active.length * 50 * pairsPerTable))
      const restarts = Math.max(3, Math.min(10, Math.ceil(active.length / 20) + 1))
      const deadline = Date.now() + (opts.deadlineMs ?? 2000)
      for (let restart = 0; restart < restarts && bestScore > 0; restart++) {
        stats.restarts++
        // v5.1: pass `preference` so restart candidates use the same scan direction
        // as the greedy/random stages (v5 forgot this arg → restarts always
        // produced PREFER_FEWER_LARGE structures even when caller asked for
        // PREFER_MORE_SMALL).
        const startTables = restart === 0
          ? best!
          : this.partition(shuffle(active, rng), opts.minPerTable, opts.maxPerTable, preference)
        const { result, iterations, terminatedByTime } = this.minConflictsSearch(
          startTables,
          adj,
          maxIter,
          rng,
          deadline,
        )
        stats.iterations += iterations
        if (terminatedByTime) stats.terminatedByTime = true
        const polishedScore = scoreAllTables(result, adj)
        if (polishedScore < bestScore) {
          bestScore = polishedScore
          best = result
        }
        if (Date.now() > deadline) {
          stats.terminatedByTime = true
          break
        }
      }
    }
    stats.endTime = Date.now()

    const rotation = opts.seatRotation ?? 'NONE'
    const finalizedTables = assignSeats(best ?? [], opts.round, rotation)
    const result = finalize(active, finalizedTables, opts.droppedPlayerIds ?? [], opts.round, this.format)
    validatePairing(result, active)
    return { pairing: result, diagnostics: buildDiagnostics(result, adj, stats, opts.deadlineMs ?? 2000) }
  }

  partition(
    players: Player[],
    minPerTable: number,
    maxPerTable: number,
    preference: TableSizePreference = 'PREFER_FEWER_LARGE',
  ): TableSeating[] {
    const n = players.length
    if (n === 0) return []
    const { sizes } = computeValidSizes(n, minPerTable, maxPerTable, preference)
    const tables: TableSeating[] = []
    let cursor = 0
    for (let t = 0; t < sizes.length; t++) {
      tables.push({ tableNumber: t + 1, playerIds: players.slice(cursor, cursor + sizes[t]).map((p) => p.id) })
      cursor += sizes[t]
    }
    return tables
  }

  greedyPartition(
    players: Player[],
    minPerTable: number,
    maxPerTable: number,
    adj?: AdjacencyMap,
    rng: () => number = Math.random,
    preference: TableSizePreference = 'PREFER_FEWER_LARGE',
  ): TableSeating[] {
    const n = players.length
    if (n === 0) return []
    const { sizes } = computeValidSizes(n, minPerTable, maxPerTable, preference)
    const tableCount = sizes.length
    const tables: TableSeating[] = Array.from({ length: tableCount }, (_, i) => ({ tableNumber: i + 1, playerIds: [] }))
    const seatableCount = sizes.reduce((a, b) => a + b, 0)
    const remaining = shuffle(players, rng).slice(0, seatableCount)
    const maxSlots = Math.max(...sizes)

    for (let slot = 0; slot < maxSlots; slot++) {
      for (let t = 0; t < tableCount; t++) {
        if (tables[t].playerIds.length >= sizes[t]) continue
        if (remaining.length === 0) break
        let bestIdx = 0
        let bestConflicts = Infinity
        for (let i = 0; i < remaining.length; i++) {
          let conflicts = 0
          for (const otherId of tables[t].playerIds) {
            conflicts += meetCount(adj, remaining[i].id, otherId)
          }
          if (conflicts < bestConflicts) {
            bestConflicts = conflicts
            bestIdx = i
          }
        }
        tables[t].playerIds.push(remaining[bestIdx].id)
        remaining.splice(bestIdx, 1)
      }
    }
    return tables.filter((t) => t.playerIds.length > 0)
  }

  /**
   * Min-conflicts local search — iteratively swap players between tables.
   *
   * Phase 2: delta scoring + adjacency + time budget
   * Phase 3: weighted adjacency (meet count) instead of binary
   *          returns SearchStats so callers can capture diagnostics
   */
  minConflictsSearch(
    tables: TableSeating[],
    adj: AdjacencyMap,
    maxIterations: number,
    rng: () => number = Math.random,
    deadline: number = Date.now() + 2000,
  ): { result: TableSeating[]; iterations: number; terminatedByTime: boolean } {
    let current = tables.map((t) => ({ ...t, playerIds: [...t.playerIds] }))

    let tableScores = current.map((t) => scoreTable(t.playerIds, adj))
    let currentScore = tableScores.reduce((a, b) => a + b, 0)
    if (currentScore === 0) {
      return { result: current, iterations: 0, terminatedByTime: false }
    }

    let bestEver = current.map((t) => ({ ...t, playerIds: [...t.playerIds] }))
    let bestEverScore = currentScore
    let stepsWithoutImprovement = 0
    let iterations = 0
    let terminatedByTime = false

    for (let iter = 0; iter < maxIterations && currentScore > 0; iter++) {
      iterations++
      if (Date.now() > deadline) {
        terminatedByTime = true
        break
      }

      const conflictingTables: number[] = []
      for (let ti = 0; ti < current.length; ti++) {
        if (tableScores[ti] > 0) conflictingTables.push(ti)
      }
      if (conflictingTables.length === 0) break

      const sourceIdx = conflictingTables[Math.floor(rng() * conflictingTables.length)]
      const sourceTable = current[sourceIdx]

      const conflictingPlayers = sourceTable.playerIds.filter((id) =>
        sourceTable.playerIds.some((other) => other !== id && meetCount(adj, id, other) > 0)
      )
      if (conflictingPlayers.length === 0) continue
      const playerId = conflictingPlayers[Math.floor(rng() * conflictingPlayers.length)]

      let bestSwapSrcIdx = -1
      let bestSwapTgtIdx = -1
      let bestSwapPlayerId = ''
      let bestSwapScoreDelta = 0

      for (let targetIdx = 0; targetIdx < current.length; targetIdx++) {
        if (targetIdx === sourceIdx) continue
        const targetTable = current[targetIdx]

        for (const otherPlayerId of targetTable.playerIds) {
          const srcBefore = tableScores[sourceIdx]
          const tgtBefore = tableScores[targetIdx]

          const newSrcIds = sourceTable.playerIds.filter((id) => id !== playerId)
          newSrcIds.push(otherPlayerId)
          const newTgtIds = targetTable.playerIds.filter((id) => id !== otherPlayerId)
          newTgtIds.push(playerId)

          const srcAfter = scoreTable(newSrcIds, adj)
          const tgtAfter = scoreTable(newTgtIds, adj)

          const delta = (srcAfter + tgtAfter) - (srcBefore + tgtBefore)
          if (delta < bestSwapScoreDelta) {
            bestSwapScoreDelta = delta
            bestSwapSrcIdx = sourceIdx
            bestSwapTgtIdx = targetIdx
            bestSwapPlayerId = otherPlayerId
          }
        }
      }

      if (bestSwapSrcIdx >= 0) {
        const src = current[bestSwapSrcIdx]
        const tgt = current[bestSwapTgtIdx]
        src.playerIds = src.playerIds.filter((id) => id !== playerId)
        src.playerIds.push(bestSwapPlayerId)
        tgt.playerIds = tgt.playerIds.filter((id) => id !== bestSwapPlayerId)
        tgt.playerIds.push(playerId)

        tableScores[bestSwapSrcIdx] = scoreTable(src.playerIds, adj)
        tableScores[bestSwapTgtIdx] = scoreTable(tgt.playerIds, adj)
        currentScore += bestSwapScoreDelta

        stepsWithoutImprovement = 0
        if (currentScore < bestEverScore) {
          bestEverScore = currentScore
          bestEver = current.map((t) => ({ ...t, playerIds: [...t.playerIds] }))
        }
        if (currentScore === 0) break
      } else {
        stepsWithoutImprovement++
        if (stepsWithoutImprovement > 200) break

        const targetIdx = Math.floor(rng() * current.length)
        if (targetIdx !== sourceIdx && current[targetIdx].playerIds.length > 0) {
          const targetTable = current[targetIdx]
          const otherPlayerId = targetTable.playerIds[Math.floor(rng() * targetTable.playerIds.length)]

          const srcBefore = tableScores[sourceIdx]
          const tgtBefore = tableScores[targetIdx]
          const newSrcIds = sourceTable.playerIds.filter((id) => id !== playerId)
          newSrcIds.push(otherPlayerId)
          const newTgtIds = targetTable.playerIds.filter((id) => id !== otherPlayerId)
          newTgtIds.push(playerId)
          const srcAfter = scoreTable(newSrcIds, adj)
          const tgtAfter = scoreTable(newTgtIds, adj)
          const delta = (srcAfter + tgtAfter) - (srcBefore + tgtBefore)

          if (delta <= 0) {
            sourceTable.playerIds = sourceTable.playerIds.filter((id) => id !== playerId)
            sourceTable.playerIds.push(otherPlayerId)
            targetTable.playerIds = targetTable.playerIds.filter((id) => id !== otherPlayerId)
            targetTable.playerIds.push(playerId)
            tableScores[sourceIdx] = scoreTable(sourceTable.playerIds, adj)
            tableScores[targetIdx] = scoreTable(targetTable.playerIds, adj)
            currentScore += delta
          }
        }
      }
    }

    return { result: bestEver, iterations, terminatedByTime }
  }
}

// ---------------------------------------------------------------------------
// SwissStrategy
// ---------------------------------------------------------------------------

export class SwissStrategy implements PairingStrategy {
  readonly format: RoundFormat = 'SWISS'

  generate(opts: PairingOptions): RoundPairing {
    return this.generateWithDiagnostics(opts).pairing
  }

  generateWithDiagnostics(opts: PairingOptions): {
    pairing: RoundPairing
    diagnostics: PairingDiagnostics
  } {
    const rng = opts.rng ?? Math.random
    const active = opts.players.filter(
      (p) => !opts.droppedPlayerIds?.includes(p.id)
    )
    if (active.length === 0) {
      return {
        pairing: {
          round: opts.round,
          format: this.format,
          tables: [],
          droppedPlayerIds: opts.droppedPlayerIds ?? [],
        },
        diagnostics: emptyDiagnostics(opts.deadlineMs ?? 2000),
      }
    }

    const comparator = buildStandingsComparator(opts.standings, opts.tiebreakers)
    const sorted = [...active].sort(comparator)

    // Phase 4: callers can opt into PREFER_MORE_SMALL for tighter score-group
    // separation. Default remains PREFER_FEWER_LARGE for backward compat with
    // existing callers/tests; the audit recommends PREFER_MORE_SMALL for Swiss.
    const swissPreference: TableSizePreference = opts.tableSizePreference ?? 'PREFER_FEWER_LARGE'
    const { sizes } = computeValidSizes(sorted.length, opts.minPerTable, opts.maxPerTable, swissPreference)
    const tableCount = sizes.length

    const groups: Player[][] = []
    let cursor = 0
    for (let t = 0; t < tableCount; t++) {
      groups.push(sorted.slice(cursor, cursor + sizes[t]))
      cursor += sizes[t]
    }

    const adj = buildAdjacency(opts.previousPairings)
    let best: TableSeating[] | null = null
    let bestScore = Number.POSITIVE_INFINITY
    const stats: SearchStats = {
      iterations: 0,
      restarts: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      terminatedByTime: false,
    }

    if (adj && adj.size > 0) {
      const strictTables: TableSeating[] = groups.map((g, i) => ({
        tableNumber: i + 1,
        playerIds: g.map((p) => p.id),
      }))
      const strictScore = scoreAllTables(strictTables, adj)
      best = strictTables
      bestScore = strictScore

      const golfer = new SocialGolferStrategy()
      const greedy = golfer.greedyPartition(sorted, opts.minPerTable, opts.maxPerTable, adj, rng, swissPreference)
      const greedyScore = scoreAllTables(greedy, adj)
      if (greedyScore < bestScore) {
        bestScore = greedyScore
        best = greedy
      }

      if (bestScore > 0) {
        const { result, iterations, terminatedByTime } = golfer.minConflictsSearch(
          best!,
          adj,
          Math.min(2000, sorted.length * 10),
          rng,
          Date.now() + (opts.deadlineMs ?? 2000),
        )
        stats.iterations += iterations
        if (terminatedByTime) stats.terminatedByTime = true
        const polishedScore = scoreAllTables(result, adj)
        if (polishedScore < bestScore) {
          bestScore = polishedScore
          best = result
        }
      }

      if (bestScore > 0) {
        const attempts = Math.min(500, Math.max(MAX_PAIRING_ATTEMPTS, Math.ceil(sorted.length * 1.5)))
        for (let attempt = 0; attempt < attempts; attempt++) {
          const shuffled = shuffle(sorted, rng)
          const tables: TableSeating[] = []
          let cursor2 = 0
          for (let t = 0; t < tableCount; t++) {
            tables.push({
              tableNumber: t + 1,
              playerIds: shuffled.slice(cursor2, cursor2 + sizes[t]).map((p) => p.id),
            })
            cursor2 += sizes[t]
          }
          const score = scoreAllTables(tables, adj)
          if (score < bestScore) {
            bestScore = score
            best = tables
            if (score === 0) break
          }
        }
      }
    } else {
      best = groups.map((g, i) => ({
        tableNumber: i + 1,
        playerIds: g.map((p) => p.id),
      }))
    }
    stats.endTime = Date.now()

    const rotation = opts.seatRotation ?? 'NONE'
    const finalizedTables = assignSeats(best ?? [], opts.round, rotation)
    const result = finalize(active, finalizedTables, opts.droppedPlayerIds ?? [], opts.round, this.format)
    validatePairing(result, active)
    return { pairing: result, diagnostics: buildDiagnostics(result, adj, stats, opts.deadlineMs ?? 2000) }
  }
}

// ---------------------------------------------------------------------------
// AdjacentSwissStrategy — bracket-style Swiss (v6)
// ---------------------------------------------------------------------------

/**
 * Bracket-Style / Adjacent Swiss — the format used by TFT lobbies, Magic:
 * The Gathering Commander finals, and poker tournament final tables.
 *
 * Unlike classic Swiss (which pairs players by match record and then optimizes
 * to avoid rematches), Adjacent Swiss groups players by their EXACT,
 * CONSECUTIVE positions in the overall standings:
 *
 *   - Strict ranking: table composition is 100% determined by the current
 *     leaderboard. No shuffling, no rematch optimization — a swap that would
 *     avoid a rematch but break the tier structure is never made.
 *   - Tiered tables: Table 1 is always the "top table" featuring the current
 *     tournament leaders. Table N is always the bottom of the standings.
 *   - Dynamic movement: after each round, players move up or down tables based
 *     on their new point totals. Climb the standings → play at a higher table.
 *
 * The strategy is fully deterministic (no RNG consumed) and runs in
 * O(n log n) (the sort) — no search, no time budget needed.
 *
 * Rematches are reported in diagnostics (so the UI can warn the organizer)
 * but never "fixed" — preserving the bracket structure IS the feature.
 */
export class AdjacentSwissStrategy implements PairingStrategy {
  readonly format: RoundFormat = 'ADJACENT_SWISS'

  generate(opts: PairingOptions): RoundPairing {
    return this.generateWithDiagnostics(opts).pairing
  }

  generateWithDiagnostics(opts: PairingOptions): {
    pairing: RoundPairing
    diagnostics: PairingDiagnostics
  } {
    const active = opts.players.filter(
      (p) => !opts.droppedPlayerIds?.includes(p.id)
    )
    if (active.length === 0) {
      return {
        pairing: {
          round: opts.round,
          format: this.format,
          tables: [],
          droppedPlayerIds: opts.droppedPlayerIds ?? [],
        },
        diagnostics: emptyDiagnostics(opts.deadlineMs ?? 2000),
      }
    }

    // 1. STRICT ranking: standings (with tiebreaker chain), then name for
    //    full determinism. This ordering defines the tables — nothing may
    //    reorder it afterwards.
    const comparator = buildStandingsComparator(opts.standings, opts.tiebreakers)
    const sorted = [...active].sort(comparator)

    // 2. Tiered tables: slice the ranked list consecutively.
    //    Table 1 = positions 1..k, Table 2 = next k, etc.
    const preference: TableSizePreference = opts.tableSizePreference ?? 'PREFER_FEWER_LARGE'
    const { sizes, seatableCount } = computeValidSizes(
      sorted.length,
      opts.minPerTable,
      opts.maxPerTable,
      preference,
    )

    const tables: TableSeating[] = []
    let cursor = 0
    for (let t = 0; t < sizes.length; t++) {
      tables.push({
        tableNumber: t + 1,
        playerIds: sorted.slice(cursor, cursor + sizes[t]).map((p) => p.id),
      })
      cursor += sizes[t]
    }

    // 3. When the field can't be divided evenly into valid tables, the
    //    LOWEST-ranked players sit out (top-down slicing leaves them last).
    //    That is the correct behavior for a bracket-style format: the bottom
    //    of the standings loses its seat, not the top.
    const stats: SearchStats = {
      iterations: 0,
      restarts: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      terminatedByTime: false,
    }

    // 4. Seat rotation still applies WITHIN each table (it never changes
    //    table composition, only seat numbers).
    const rotation = opts.seatRotation ?? 'NONE'
    const finalTables = assignSeats(tables, opts.round, rotation)

    const adj = buildAdjacency(opts.previousPairings)
    const result = finalize(active, finalTables, opts.droppedPlayerIds ?? [], opts.round, this.format)
    validatePairing(result, active)

    const diagnostics = buildDiagnostics(result, adj, stats, opts.deadlineMs ?? 2000)
    // The search never runs, so "feasible" here means "no rematch at all",
    // which is informational for this format — rematches are accepted
    // whenever the standings dictate them.
    diagnostics.seatableCount = seatableCount
    return { pairing: result, diagnostics }
  }
}

// ---------------------------------------------------------------------------
// SingleElimStrategy — Phase 3 adds byes for non-power-of-2 fields
// ---------------------------------------------------------------------------

/**
 * Standard bracket seeding: for N players, returns the seed order so that
 * the strongest players are spread across tables as evenly as possible.
 *
 * For 2-player tables (8 players): [0,7,3,4,1,6,2,5]
 *   Table 1: seeds 0,7 → Table 2: seeds 3,4 → Table 3: seeds 1,6 → Table 4: seeds 2,5
 *
 * Algorithm: build the bracket recursively. Each round, mirror the current
 * seeds around the midpoint so seed 0 plays seed N-1, seed 1 plays seed N-2, etc.
 */
function seedOrder(n: number): number[] {
  if (n <= 1) return n === 1 ? [0] : []
  let order = [0, 1]
  while (order.length < n) {
    const size = order.length
    const mirrored: number[] = []
    for (const r of order) {
      mirrored.push(r)
      const opponent = size * 2 - 1 - r
      if (opponent < n) mirrored.push(opponent)
    }
    order = mirrored
  }
  return order.slice(0, n)
}

/** True if n is a power of `base` (default base=2). */
function isPow(n: number, base: number = 2): boolean {
  if (n <= 0) return false
  while (n > 1) {
    if (n % base !== 0) return false
    n = Math.floor(n / base)
  }
  return true
}

/** Next power of `base` ≥ n (e.g., nextPow(6, 2)=8, nextPow(7, 3)=9). */
function nextPow(n: number, base: number = 2): number {
  if (n <= 1) return 1
  let p = 1
  while (p < n) p *= base
  return p
}

/** True if n is a power of 2 (backward-compat alias for isPow). */
function isPow2(n: number): boolean {
  return isPow(n, 2)
}

/** Next power of 2 ≥ n (backward-compat alias for nextPow). */
function nextPow2(n: number): number {
  return nextPow(n, 2)
}

/**
 * v5.1: Compute byes for single-elim when field size is not a perfect bracket.
 *
 * Generalized for any table size `base` (2 = heads-up, 3 = 3-player elim,
 * 4 = 4-player elim). Uses the bracket-completion formula:
 *
 *   byes = (base^k - n) / (base - 1)
 *
 * where k is the smallest integer with base^k ≥ n. If (base^k - n) is not
 * divisible by (base - 1), no clean bracket exists — return [] (no byes).
 *
 * For base=2: byes = nextPow2(n) - n (the v1-v5 formula).
 * For base=3 (n=7): nextPow=9, byes = (9-7)/2 = 1. Top seed gets the bye.
 * For base=3 (n=6): nextPow=9, byes = (9-6)/2 = 1.5 → not integer → [].
 * For base=4 (n=13): nextPow=16, byes = (16-13)/3 = 1. Top seed gets the bye.
 *
 * Returns the seed indices (0-based into sorted players) that get byes.
 */
function computeByeSeeds(n: number, base: number = 2): number[] {
  if (base < 2) return []
  if (isPow(n, base)) return []
  const targetPow = nextPow(n, base)
  const diff = targetPow - n
  if (diff % (base - 1) !== 0) return [] // no integral bracket solution
  const byeCount = diff / (base - 1)
  if (byeCount <= 0) return []
  // Top `byeCount` seeds get byes: seeds 0..byeCount-1
  return Array.from({ length: byeCount }, (_, i) => i)
}

/**
 * v5.1: Serpentine (snake-draft) seeding for multi-player elim tables.
 *
 * Distributes players across tables so that each table has roughly equal
 * seed-sum (top seed at table 1, then snake back). This is the standard
 * WBC / Conquest-style seeding for multiplayer single-elim.
 *
 * Algorithm: walk players in rank order. For each "row" of the snake,
 * alternate LTR and RTL. When a table is full, stop placing into it.
 *
 * Example: 9 players at sizes [3,3,3] (a=rank 1, b=rank 2, …):
 *   Row 0 (LTR): T1=a, T2=b, T3=c
 *   Row 1 (RTL): T3=d, T2=e, T1=f
 *   Row 2 (LTR): T1=g, T2=h, T3=i
 *   → T1=[a,f,g] (sum=14), T2=[b,e,h] (sum=15), T3=[c,d,i] (sum=16)
 *
 * Example: 8 players at sizes [2,2,2,2] (standard heads-up bracket):
 *   → T1=[1,8], T2=[2,7], T3=[3,6], T4=[4,5]  (1v8, 2v7, 3v6, 4v5)
 */
function serpentineTables(players: Player[], sizes: number[]): TableSeating[] {
  if (players.length === 0 || sizes.length === 0) return []
  const sorted = [...players] // caller is expected to have already sorted by standing
  const tables: TableSeating[] = sizes.map((_, i) => ({
    tableNumber: i + 1,
    playerIds: [],
  }))
  const capacities = [...sizes]
  let playerIdx = 0
  for (let row = 0; playerIdx < sorted.length; row++) {
    const ltr = row % 2 === 0
    let placedThisRow = 0
    for (let slot = 0; slot < tables.length; slot++) {
      if (playerIdx >= sorted.length) break
      const ti = ltr ? slot : tables.length - 1 - slot
      if (tables[ti].playerIds.length >= capacities[ti]) continue
      tables[ti].playerIds.push(sorted[playerIdx].id)
      playerIdx++
      placedThisRow++
    }
    // v5.1 fix: bail if no progress was made this row — otherwise we'd infinite-loop
    // when the field can't fit (e.g., 5 players, sizes=[4] — 5th player unplaceable).
    if (placedThisRow === 0) break
  }
  return tables.filter((t) => t.playerIds.length > 0)
}

export class SingleElimStrategy implements PairingStrategy {
  readonly format: RoundFormat = 'SINGLE_ELIM'

  generate(opts: PairingOptions): RoundPairing {
    return this.generateWithDiagnostics(opts).pairing
  }

  generateWithDiagnostics(opts: PairingOptions): {
    pairing: RoundPairing
    diagnostics: PairingDiagnostics
  } {
    const rng = opts.rng ?? Math.random
    const active = opts.players.filter(
      (p) => !opts.droppedPlayerIds?.includes(p.id)
    )
    if (active.length === 0) {
      return {
        pairing: {
          round: opts.round,
          format: this.format,
          tables: [],
          droppedPlayerIds: opts.droppedPlayerIds ?? [],
        },
        diagnostics: emptyDiagnostics(opts.deadlineMs ?? 2000),
      }
    }

    const comparator = buildStandingsComparator(opts.standings, opts.tiebreakers)
    const sorted = [...active].sort(comparator)

    // v5.1: Clamp advanceCount to a minimum of 2 (v5 silently dropped the round
    // when advanceCount was < 2). The default is top half, capped at total.
    const requestedAdvance = opts.advanceCount ?? Math.max(2, Math.floor(sorted.length / 2))
    const advanceCount = Math.min(Math.max(2, requestedAdvance), sorted.length)
    const advanced = sorted.slice(0, advanceCount)

    // v5.1: Use generalized bye math. The bracket base is minPerTable when it's
    // a fixed-size bracket (min === max), otherwise we treat the field as
    // irregular and skip byes entirely (flexible table sizes absorb the field).
    const fixedSize = opts.minPerTable === opts.maxPerTable
    const bracketBase = fixedSize ? opts.minPerTable : opts.maxPerTable
    const byeSeedIndices = fixedSize
      ? computeByeSeeds(advanceCount, bracketBase)
      : []
    const byePlayerIds = byeSeedIndices.map((i) => advanced[i].id)
    const playingPlayers = advanced.filter((p) => !byePlayerIds.includes(p.id))

    // v5.1: Use serpentine seeding for the playing players (replaces
    // seedOrder-based consecutive slicing). Serpentine gives balanced
    // seed-sums across tables for any table count, including non-powers-of-2.
    const adj = buildAdjacency(opts.previousPairings)
    let tables: TableSeating[]
    const stats: SearchStats = {
      iterations: 0,
      restarts: 0,
      startTime: Date.now(),
      endTime: Date.now(),
      terminatedByTime: false,
    }

    // Compute table sizes for the playing players (those who actually compete).
    const elimPreference: TableSizePreference = opts.tableSizePreference ?? 'PREFER_FEWER_LARGE'
    const { sizes: playingSizes } = computeValidSizes(
      playingPlayers.length,
      opts.minPerTable,
      opts.maxPerTable,
      elimPreference,
    )

    if (adj && adj.size > 0 && playingPlayers.length > 0) {
      // Start from serpentine seeding, then run min-conflicts to avoid rematches.
      const serpentine = serpentineTables(playingPlayers, playingSizes)
      let best: TableSeating[] = serpentine
      let bestScore = scoreAllTables(serpentine, adj)

      const golfer = new SocialGolferStrategy()
      const greedy = golfer.greedyPartition(playingPlayers, opts.minPerTable, opts.maxPerTable, adj, rng, elimPreference)
      const greedyScore = scoreAllTables(greedy, adj)
      if (greedyScore < bestScore) {
        bestScore = greedyScore
        best = greedy
      }

      if (bestScore > 0) {
        const attempts = Math.min(500, Math.max(MAX_PAIRING_ATTEMPTS, Math.ceil(advanced.length * 1.5)))
        for (let attempt = 0; attempt < attempts; attempt++) {
          const shuffled = shuffle(playingPlayers, rng)
          const candidate = golfer.partition(shuffled, opts.minPerTable, opts.maxPerTable, elimPreference)
          const score = scoreAllTables(candidate, adj)
          if (score < bestScore) {
            bestScore = score
            best = candidate
            if (score === 0) break
          }
        }
      }

      if (bestScore > 0) {
        const { result, iterations, terminatedByTime } = golfer.minConflictsSearch(
          best!,
          adj,
          Math.min(2000, advanced.length * 10),
          rng,
          Date.now() + (opts.deadlineMs ?? 2000),
        )
        stats.iterations += iterations
        if (terminatedByTime) stats.terminatedByTime = true
        const polishedScore = scoreAllTables(result, adj)
        if (polishedScore < bestScore) {
          bestScore = polishedScore
          best = result
        }
      }

      tables = best ?? []
    } else if (playingPlayers.length > 0) {
      // No previous pairings — just use serpentine seeding directly.
      tables = serpentineTables(playingPlayers, playingSizes)
    } else {
      // All players got byes (shouldn't happen, but be safe).
      tables = []
    }
    stats.endTime = Date.now()

    // Phase 4: apply seat rotation if requested
    const rotation = opts.seatRotation ?? 'NONE'
    tables = assignSeats(tables, opts.round, rotation)

    // Bye players are added to droppedPlayerIds so finalize() includes them,
    // but they are NOT counted as "vanishing" — they intentionally sit out.
    const allDropped = [
      ...(opts.droppedPlayerIds ?? []),
      ...sorted.slice(advanceCount).map((p) => p.id),
    ]
    const result = finalize(playingPlayers, tables, allDropped, opts.round, this.format, byePlayerIds)
    validatePairing(result, active)
    return { pairing: result, diagnostics: buildDiagnostics(result, adj, stats, opts.deadlineMs ?? 2000) }
  }
}

// ---------------------------------------------------------------------------
// Strategy registry + mutations
// ---------------------------------------------------------------------------

const STRATEGIES: Record<RoundFormat, PairingStrategy> = {
  ROUND_ROBIN: new SocialGolferStrategy(),
  SWISS: new SwissStrategy(),
  SINGLE_ELIM: new SingleElimStrategy(),
  ADJACENT_SWISS: new AdjacentSwissStrategy(),
}

/**
 * v6: Normalize a format string coming from storage / network.
 *
 * Legacy databases may still hold 'CUSTOM' rows (the format was removed in v6 —
 * it duplicated ROUND_ROBIN behavior). Until the enum migration
 * prisma/replace-custom-format-with-adjacent-swiss.sql is applied, those rows
 * must not crash getStrategy(). Map them to ROUND_ROBIN, which is behaviorally
 * identical to what CustomStrategy did.
 */
export function normalizeLegacyFormat(format: string): RoundFormat {
  if (format === 'CUSTOM') return 'ROUND_ROBIN'
  return format as RoundFormat
}

export function getStrategy(format: RoundFormat): PairingStrategy {
  const strategy = STRATEGIES[format]
  if (!strategy) {
    throw new Error(`Unknown pairing format: ${format}. Valid formats: ${Object.keys(STRATEGIES).join(', ')}`)
  }
  return strategy
}

export function reassignPlayer(
  pairing: RoundPairing,
  playerId: string,
  toTableNumber: number,
  maxPerTable?: number,
  /** v5.1: If provided, recompute seats after the move using this rotation. */
  seatInfo?: { round: number; rotation: SeatRotationStrategy },
): RoundPairing {
  const target = pairing.tables.find((t) => t.tableNumber === toTableNumber)
  if (!target) return pairing
  if (maxPerTable !== undefined && target.playerIds.length >= maxPerTable) return pairing

  // v5.1: Strip seats during mutation — old seats[] would be misaligned with
  // the new playerIds[] after the move. Recompute at the end if seatInfo given.
  const tables = pairing.tables.map((t) => ({ ...t, playerIds: [...t.playerIds], seats: undefined }))
  for (const t of tables) {
    t.playerIds = t.playerIds.filter((id) => id !== playerId)
  }
  const targetTable = tables.find((t) => t.tableNumber === toTableNumber)
  if (targetTable) targetTable.playerIds.push(playerId)

  const droppedPlayerIds = pairing.droppedPlayerIds.filter((id) => id !== playerId)
  const filtered = tables.filter((t) => t.playerIds.length > 0)
  filtered.forEach((t, i) => (t.tableNumber = i + 1))

  // v5.1: Recompute seats if requested
  const finalTables = seatInfo
    ? assignSeats(filtered, seatInfo.round, seatInfo.rotation)
    : filtered

  return { ...pairing, tables: finalTables, droppedPlayerIds }
}

export function dropPlayerFromRound(
  pairing: RoundPairing,
  playerId: string
): RoundPairing {
  // v5.1: Strip seats — lengths would mismatch after the filter.
  const tables = pairing.tables.map((t) => ({
    ...t,
    playerIds: t.playerIds.filter((id) => id !== playerId),
    seats: undefined,
  }))
  const filtered = tables.filter((t) => t.playerIds.length > 0)
  filtered.forEach((t, i) => (t.tableNumber = i + 1))
  const dropped = Array.from(new Set([...pairing.droppedPlayerIds, playerId]))
  return { ...pairing, tables: filtered, droppedPlayerIds: dropped }
}

export function reintroducePlayer(
  pairing: RoundPairing,
  playerId: string,
  maxPerTable: number
): RoundPairing {
  const droppedPlayerIds = pairing.droppedPlayerIds.filter((id) => id !== playerId)
  if (pairing.tables.some((t) => t.playerIds.includes(playerId))) {
    return { ...pairing, droppedPlayerIds }
  }

  // v5.1: Strip seats — we're about to push to playerIds[] which would
  // misalign any pre-existing seats[].
  const tables: TableSeating[] = pairing.tables.map((t) => ({ ...t, playerIds: [...t.playerIds], seats: undefined }))

  // v5.1: Target the fewest-players table (under maxPerTable) instead of the
  // first one under max. This balances table sizes instead of piling on table 1.
  let target: TableSeating | undefined
  let bestCount = Infinity
  for (const t of tables) {
    if (t.playerIds.length >= maxPerTable) continue
    if (t.playerIds.length < bestCount) {
      bestCount = t.playerIds.length
      target = t
    }
  }
  if (!target) {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.tableNumber)) + 1 : 1
    target = { tableNumber: nextNumber, playerIds: [] }
    tables.push(target)
  }
  target.playerIds.push(playerId)
  tables.forEach((t, i) => (t.tableNumber = i + 1))
  return { ...pairing, tables, droppedPlayerIds }
}

/**
 * Phase 3 / Phase 4: Partial re-pair.
 *
 * Re-places only the specified players into the existing pairing structure,
 * preserving the seats of all other players. Useful when one player drops
 * or is added between rounds and you don't want to nuke the whole bracket.
 *
 * Algorithm:
 *   1. Remove the specified players from all tables.
 *   2. For each player to re-place, find the table where they cause the
 *      fewest rematches (using previousPairings). Greedy assignment.
 *   3. If no table has room, the player is added to droppedPlayerIds.
 *
 * Phase 4 adds `respectScoreGroups`:
 *   When true (and standings + tolerance are provided), a player can only
 *   be placed at a table where every existing neighbor's standing is within
 *   `tolerance` (default = 0, meaning exact same standing). This prevents
 *   a top-half Swiss player from being re-placed at a bottom-half table
 *   after a drop/add.
 *
 * Note: this is NOT a full re-generation. If the structure is fundamentally
 * wrong (wrong table count, wrong sizes), call strategy.generate() instead.
 */
export function partialRepair(
  pairing: RoundPairing,
  playersToRepair: string[],
  opts: {
    maxPerTable: number
    previousPairings?: Set<string> | Map<string, number>
    rng?: () => number
    /** Phase 4: When true, only place at tables where neighbors have similar standing. */
    respectScoreGroups?: boolean
    /** Phase 4: Standings map (required when respectScoreGroups=true). */
    standings?: StandingsMap
    /**
     * Phase 4: Max |standing - neighborStanding| allowed for repair.
     * Default 0 = exact match (only same-standing neighbors allowed).
     * Set higher for looser grouping (e.g., 1 = allow neighbors within 1 point).
     */
    tolerance?: number
  },
): RoundPairing {
  if (playersToRepair.length === 0) return pairing
  const rng = opts.rng ?? Math.random
  const tolerance = opts.tolerance ?? 0

  // 1. Remove the players to repair from all tables.
  // v5.1: Strip seats — we'll be mutating playerIds[] which would misalign any
  // pre-existing seats[]. Caller can recompute via assignSeats if needed.
  const tables = pairing.tables.map((t) => ({
    ...t,
    playerIds: t.playerIds.filter((id) => !playersToRepair.includes(id)),
    seats: undefined,
  }))

  // 2. Build adjacency from previous pairings.
  const adj = buildAdjacency(opts.previousPairings)

  // Phase 4: helper to look up a player's standing total
  const getStanding = (id: string): number | undefined => {
    const raw = opts.standings?.get(id)
    if (raw === undefined) return undefined
    return typeof raw === 'number' ? raw : raw.total
  }

  // Phase 4: helper to check if a table is score-compatible with a player
  const isScoreCompatible = (playerId: string, tableIdx: number): boolean => {
    if (!opts.respectScoreGroups || !opts.standings) return true
    const myStanding = getStanding(playerId)
    if (myStanding === undefined) return true // unknown standing = allow
    for (const otherId of tables[tableIdx].playerIds) {
      const otherStanding = getStanding(otherId)
      if (otherStanding === undefined) continue
      if (Math.abs(myStanding - otherStanding) > tolerance) return false
    }
    return true
  }

  // 3. Sort players to repair by descending number of prior conflicts
  //    (most-constrained-first heuristic — place the hard ones first).
  const repairQueue = [...playersToRepair].sort((a, b) => {
    const ca = adj ? countMet(adj, a) : 0
    const cb = adj ? countMet(adj, b) : 0
    return cb - ca
  })

  // 4. Greedy: assign each player to the table with the fewest new conflicts
  //    that still has room AND is score-compatible (if respectScoreGroups).
  for (const playerId of repairQueue) {
    let bestTableIdx = -1
    let bestConflictCount = Infinity
    for (let i = 0; i < tables.length; i++) {
      if (tables[i].playerIds.length >= opts.maxPerTable) continue
      // Phase 4: skip tables outside the player's score group
      if (!isScoreCompatible(playerId, i)) continue
      let conflicts = 0
      for (const otherId of tables[i].playerIds) {
        conflicts += meetCount(adj, playerId, otherId)
      }
      // Tiny tiebreaker: prefer the table with fewer players (more room).
      if (
        conflicts < bestConflictCount ||
        (conflicts === bestConflictCount &&
          bestTableIdx >= 0 &&
          tables[i].playerIds.length < tables[bestTableIdx].playerIds.length)
      ) {
        bestConflictCount = conflicts
        bestTableIdx = i
      }
    }
    if (bestTableIdx >= 0) {
      tables[bestTableIdx].playerIds.push(playerId)
    }
    // else: player stays dropped (will be in droppedPlayerIds)
  }

  // 5. Renumber tables sequentially (drop empties).
  const filtered = tables.filter((t) => t.playerIds.length > 0)
  filtered.forEach((t, i) => (t.tableNumber = i + 1))

  // 6. Players to repair who didn't get seated → add to droppedPlayerIds.
  // v5.1 FIX: Previously this added ALL playersToRepair to droppedPlayerIds
  // without checking if they were successfully seated — producing the dual-state
  // bug "seated AND dropped" that we fixed in reassignPlayer. Now we filter out
  // successfully-seated players after the union.
  const seated = new Set(filtered.flatMap((t) => t.playerIds))
  const unseated = playersToRepair.filter((id) => !seated.has(id))
  const droppedPlayerIds = Array.from(
    new Set([...pairing.droppedPlayerIds, ...unseated]),
  ).filter((id) => !seated.has(id))

  return { ...pairing, tables: filtered, droppedPlayerIds }
}

/** Count how many distinct players this player has previously met. */
function countMet(adj: AdjacencyMap, playerId: string): number {
  return adj.get(playerId)?.size ?? 0
}

// ---------------------------------------------------------------------------
// Diagnostics helpers
// ---------------------------------------------------------------------------

function emptyDiagnostics(deadlineMs: number): PairingDiagnostics {
  return {
    feasible: true,
    conflictCount: 0,
    conflictingTables: 0,
    iterationsRun: 0,
    restartsRun: 0,
    timeBudgetMs: 0,
    timeBudgetRequestedMs: deadlineMs,
    terminatedByTime: false,
    conflictTableNumbers: [],
  }
}

function buildDiagnostics(
  pairing: RoundPairing,
  adj: AdjacencyMap | undefined,
  stats: SearchStats,
  deadlineMs: number,
): PairingDiagnostics {
  const conflictTableNumbers: number[] = []
  let totalConflicts = 0
  if (adj && adj.size > 0) {
    for (const t of pairing.tables) {
      const c = scoreTable(t.playerIds, adj)
      if (c > 0) {
        conflictTableNumbers.push(t.tableNumber)
        totalConflicts += c
      }
    }
  }
  return {
    feasible: totalConflicts === 0,
    conflictCount: totalConflicts,
    conflictingTables: conflictTableNumbers.length,
    iterationsRun: stats.iterations,
    restartsRun: stats.restarts,
    timeBudgetMs: stats.endTime - stats.startTime,
    timeBudgetRequestedMs: deadlineMs,
    terminatedByTime: stats.terminatedByTime,
    conflictTableNumbers,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function collectPreviousPairings(rounds: RoundPairing[]): Set<string> {
  const set = new Set<string>()
  for (const r of rounds) {
    for (const t of r.tables) {
      for (let i = 0; i < t.playerIds.length; i++) {
        for (let j = i + 1; j < t.playerIds.length; j++) {
          set.add(pairKey(t.playerIds[i], t.playerIds[j]))
        }
      }
    }
  }
  return set
}

/**
 * Phase 3: Weighted variant of collectPreviousPairings.
 * Returns Map<pairKey, meetCount> where meetCount = number of rounds
 * the pair has been at the same table.
 */
export function collectPreviousPairCounts(rounds: RoundPairing[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rounds) {
    for (const t of r.tables) {
      for (let i = 0; i < t.playerIds.length; i++) {
        for (let j = i + 1; j < t.playerIds.length; j++) {
          const key = pairKey(t.playerIds[i], t.playerIds[j])
          map.set(key, (map.get(key) ?? 0) + 1)
        }
      }
    }
  }
  return map
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Compute valid table sizes for N players with min..max per table.
 *
 * Phase 4: `preference` controls scan direction.
 *   - PREFER_FEWER_LARGE (default): scan upward from floor(n/max). Fewer, larger tables.
 *   - PREFER_MORE_SMALL: scan downward from floor(n/min). More, smaller tables.
 *   - BALANCED: prefer the table count whose average size is closest to (min+max)/2.
 */
function computeValidSizes(
  n: number,
  minPerTable: number,
  maxPerTable: number,
  preference: TableSizePreference = 'PREFER_FEWER_LARGE',
): { sizes: number[]; seatableCount: number } {
  if (n < minPerTable) return { sizes: [], seatableCount: 0 }
  const minTables = Math.max(1, Math.floor(n / maxPerTable))
  const maxTables = Math.floor(n / minPerTable)

  // Helper: try a given table count, return sizes if valid else null
  const tryTableCount = (tableCount: number): { sizes: number[]; seatableCount: number } | null => {
    if (tableCount < minTables || tableCount > maxTables) return null
    const base = Math.floor(n / tableCount)
    const extra = n % tableCount
    if (base >= minPerTable && base + 1 <= maxPerTable) {
      const sizes = Array.from({ length: tableCount }, (_, i) => base + (i < extra ? 1 : 0))
      return { sizes, seatableCount: n }
    }
    if (extra === 0 && base >= minPerTable && base <= maxPerTable) {
      return { sizes: Array(tableCount).fill(base), seatableCount: n }
    }
    return null
  }

  if (preference === 'PREFER_FEWER_LARGE') {
    // Scan upward (fewer tables first) — original v1-v4 behavior
    for (let tc = minTables; tc <= maxTables; tc++) {
      const result = tryTableCount(tc)
      if (result) return result
    }
  } else if (preference === 'PREFER_MORE_SMALL') {
    // Scan downward (more tables first)
    for (let tc = maxTables; tc >= minTables; tc--) {
      const result = tryTableCount(tc)
      if (result) return result
    }
  } else {
    // BALANCED: prefer table count whose average (n/tc) is closest to (min+max)/2
    const target = (minPerTable + maxPerTable) / 2
    let bestResult: { sizes: number[]; seatableCount: number } | null = null
    let bestDist = Infinity
    for (let tc = minTables; tc <= maxTables; tc++) {
      const result = tryTableCount(tc)
      if (!result) continue
      const avg = n / tc
      const dist = Math.abs(avg - target)
      if (dist < bestDist) {
        bestDist = dist
        bestResult = result
      }
    }
    if (bestResult) return bestResult
  }

  // Fallback: cap at maxPerTable, minTables tables
  const tableCount = minTables
  const seatableCount = tableCount * maxPerTable
  return { sizes: Array(tableCount).fill(maxPerTable), seatableCount }
}

// ---------------------------------------------------------------------------
// Phase 4: Seat assignment helper
// ---------------------------------------------------------------------------

/**
 * Assign seat numbers (1-indexed) to each player at each table.
 *
 * NONE — clears any existing seats[] (returns tables unchanged).
 * CLOCKWISE — seat(i, R) = ((i + R - 1) % n) + 1. Player[0] sits in seat 1
 *   on round 1, seat 2 on round 2, etc. Over N rounds, every player gets
 *   every seat exactly once.
 * BALANCED — uses an offset sequence that visits all N residues while keeping
 *   consecutive rounds as "opposite" as possible. For even n, the offsets are
 *   0, n/2, 1, 1+n/2, 2, 2+n/2, … (so round R's offset alternates between
 *   the lower half and the upper half, walking each half forward by 1).
 *   For odd n, BALANCED degenerates to CLOCKWISE (step = 1) since
 *   gcd(1, n) = 1 is the only coprime step.
 *
 * v5.1 fix: the previous BALANCED used step=floor(n/2) with gcd(step,n)=2 for
 * even n, so the rotation only visited n/2 seats (e.g., 4-player tables
 * ping-ponged between seats 1 and 3, never visiting 2 or 4).
 *
 * Note: rotation is applied per-table independently. Tables of different sizes
 * rotate independently (a 3-player table and a 4-player table both start their
 * own rotation at round 1).
 */
function assignSeats(
  tables: TableSeating[],
  round: number,
  rotation: SeatRotationStrategy,
): TableSeating[] {
  if (rotation === 'NONE') {
    // Strip any pre-existing seats (shouldn't happen, but be safe)
    return tables.map((t) => ({ ...t, seats: undefined }))
  }

  return tables.map((t) => {
    const n = t.playerIds.length
    if (n === 0) return { ...t, seats: [] }
    const r = round - 1
    const seats = t.playerIds.map((_, i) => {
      const offset = rotation === 'BALANCED' ? balancedOffset(r, n) : r % n
      return ((i + offset) % n) + 1
    })
    return { ...t, seats }
  })
}

/**
 * v5.1 fix: BALANCED offset sequence that visits all n residues.
 *
 * For odd n: r % n (degenerates to CLOCKWISE — only coprime step).
 * For even n: 0, n/2, 1, 1+n/2, 2, 2+n/2, … — alternates between the lower
 * and upper halves, walking each forward by 1. Period = n (full coverage),
 * and consecutive rounds are always "opposite" (differ by n/2 mod n).
 */
function balancedOffset(r: number, n: number): number {
  if (n % 2 === 1) return r % n
  const half = r >> 1
  return (half + (r & 1) * (n >> 1)) % n
}

// ---------------------------------------------------------------------------
// Phase 4: Stage plan helper
// ---------------------------------------------------------------------------

/**
 * Phase 4: Given a list of tournament stages, compute the transitions
 * between them. Each transition identifies the cutoff round and how many
 * players advance.
 *
 * Stages must be contiguous (stage 2 starts at round R+1 where stage 1 ended
 * at round R) and sorted by round number.
 *
 * Returns N-1 transitions for N stages. The final stage has no transition
 * (nothing to advance to).
 *
 * Example: 3-stage tournament (RR rounds 1-3 → Swiss rounds 4-5 → Elim round 6)
 *   stages = [
 *     { name: 'Round Robin', rounds: [1,2,3], format: 'ROUND_ROBIN', advanceCount: 16 },
 *     { name: 'Swiss',       rounds: [4,5],   format: 'SWISS',       advanceCount: 8 },
 *     { name: 'Final',       rounds: [6],    format: 'SINGLE_ELIM' },
 *   ]
 *   → transitions = [
 *     { cutoffRound: 3, advanceCount: 16, isEliminationCut: true, ... },
 *     { cutoffRound: 5, advanceCount: 8,  isEliminationCut: true, ... },
 *   ]
 */
export function generateStageTransitions(stages: StagePlan[]): StageTransition[] {
  if (stages.length < 2) return []
  // Validate contiguity
  for (let i = 1; i < stages.length; i++) {
    const prevEnd = Math.max(...stages[i - 1].rounds)
    const currStart = Math.min(...stages[i].rounds)
    if (currStart !== prevEnd + 1) {
      throw new Error(
        `Stages must be contiguous: stage ${i} starts at round ${currStart} but previous ends at ${prevEnd}`,
      )
    }
  }

  const transitions: StageTransition[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    const fromStage = stages[i]
    const toStage = stages[i + 1]
    const cutoffRound = Math.max(...fromStage.rounds)
    // v5.1: Return undefined for non-cut stages (v5 returned MAX_SAFE_INTEGER,
    // which was a footgun if a caller used the number without checking isEliminationCut).
    const advanceCount = fromStage.advanceCount
    const isEliminationCut = fromStage.advanceCount !== undefined
    transitions.push({
      cutoffRound,
      fromStage,
      toStage,
      advanceCount,
      isEliminationCut,
    })
  }
  return transitions
}

/** Exposed for tests */
export const __internals = {
  buildAdjacency,
  scoreTable,
  scoreAllTables,
  meetCount,
  seedOrder,
  isPow,
  nextPow,
  isPow2,
  nextPow2,
  computeByeSeeds,
  serpentineTables,
  buildStandingsComparator,
  computeValidSizes,
  assignSeats,
  balancedOffset,
}
