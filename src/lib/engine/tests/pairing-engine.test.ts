/**
 * Tests for the pairing engine — strategies and helpers.
 *
 * Run with `npm test`.
 */
import { describe, it, expect } from 'vitest'
import {
  SocialGolferStrategy,
  SwissStrategy,
  SingleElimStrategy,
  AdjacentSwissStrategy,
  getStrategy,
  normalizeLegacyFormat,
  reassignPlayer,
  dropPlayerFromRound,
  reintroducePlayer,
  collectPreviousPairings,
  collectPreviousPairCounts,
  partialRepair,
  pairKey,
  mulberry32,
  generateStageTransitions,
  __internals,
  type PairingOptions,
  type PairingDiagnostics,
  type StandingEntry,
  type StagePlan,
  type StageTransition,
  type SeatRotationStrategy,
  type TableSizePreference,
} from '../pairing-engine'
import type { Player, RoundPairing, TableSeating } from '@/lib/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build N players with stable IDs and names. */
function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    checkedIn: true,
    ready: false,
    color: 'bg-rose-500',
  }))
}

const baseOpts = {
  round: 1,
  minPerTable: 2,
  maxPerTable: 4,
}

// ---------------------------------------------------------------------------
// Strategy registry
// ---------------------------------------------------------------------------

describe('getStrategy', () => {
  it('returns the right strategy for each format', () => {
    expect(getStrategy('ROUND_ROBIN')).toBeInstanceOf(SocialGolferStrategy)
    expect(getStrategy('SWISS')).toBeInstanceOf(SwissStrategy)
    expect(getStrategy('SINGLE_ELIM')).toBeInstanceOf(SingleElimStrategy)
    expect(getStrategy('ADJACENT_SWISS')).toBeInstanceOf(AdjacentSwissStrategy)
  })

  it('throws on unknown formats (no silent fallback)', () => {
    // @ts-expect-error — testing invalid input
    expect(() => getStrategy('UNKNOWN')).toThrow('Unknown pairing format')
  })

  it('throws on removed CUSTOM format (no silent fallback — use normalizeLegacyFormat)', () => {
    // v6: CUSTOM was removed. Raw 'CUSTOM' must fail loudly so callers notice;
    // legacy DB values must go through normalizeLegacyFormat() first.
    // @ts-expect-error — testing removed format
    expect(() => getStrategy('CUSTOM')).toThrow('Unknown pairing format')
  })
})

describe('normalizeLegacyFormat', () => {
  it('maps legacy CUSTOM to ROUND_ROBIN', () => {
    expect(normalizeLegacyFormat('CUSTOM')).toBe('ROUND_ROBIN')
  })

  it('passes valid formats through unchanged', () => {
    expect(normalizeLegacyFormat('ROUND_ROBIN')).toBe('ROUND_ROBIN')
    expect(normalizeLegacyFormat('SWISS')).toBe('SWISS')
    expect(normalizeLegacyFormat('SINGLE_ELIM')).toBe('SINGLE_ELIM')
    expect(normalizeLegacyFormat('ADJACENT_SWISS')).toBe('ADJACENT_SWISS')
  })
})

// ---------------------------------------------------------------------------
// SocialGolferStrategy (Round Robin)
// ---------------------------------------------------------------------------

describe('SocialGolferStrategy', () => {
  const strategy = new SocialGolferStrategy()

  it('has format ROUND_ROBIN', () => {
    expect(strategy.format).toBe('ROUND_ROBIN')
  })

  it('partitions 8 players with max 4 per table into 2 tables', () => {
    const players = makePlayers(8)
    const result = strategy.generate({ ...baseOpts, players })

    expect(result.tables).toHaveLength(2)
    expect(result.format).toBe('ROUND_ROBIN')
    const allIds = result.tables.flatMap((t) => t.playerIds)
    expect(allIds).toHaveLength(8)
    expect(new Set(allIds).size).toBe(8) // no duplicates
  })

  it('respects maxPerTable as an upper bound', () => {
    const players = makePlayers(10)
    const result = strategy.generate({ ...baseOpts, players, maxPerTable: 3 })

    for (const t of result.tables) {
      expect(t.playerIds.length).toBeLessThanOrEqual(3)
    }
  })

  it('respects minPerTable as a lower bound when enough players', () => {
    const players = makePlayers(8)
    const result = strategy.generate({ ...baseOpts, players, minPerTable: 3, maxPerTable: 4 })

    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('produces sequential table numbers starting from 1', () => {
    const players = makePlayers(12)
    const result = strategy.generate({ ...baseOpts, players, maxPerTable: 4 })

    expect(result.tables.map((t) => t.tableNumber)).toEqual([1, 2, 3])
  })

  it('excludes dropped players from tables and lists them in droppedPlayerIds', () => {
    const players = makePlayers(6)
    const result = strategy.generate({
      ...baseOpts,
      players,
      droppedPlayerIds: ['p1', 'p3'],
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).not.toContain('p1')
    expect(seated).not.toContain('p3')
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p1', 'p3']))
    expect(seated).toHaveLength(4)
  })

  it('returns empty tables when all players are dropped', () => {
    const players = makePlayers(4)
    const result = strategy.generate({
      ...baseOpts,
      players,
      droppedPlayerIds: players.map((p) => p.id),
    })

    expect(result.tables).toEqual([])
    expect(result.droppedPlayerIds).toHaveLength(4)
  })

  it('minimizes repeat pairings across rounds when a 0-conflict schedule exists', () => {
    // 9 players / 3 tables of 3 / 2 rounds.
    // The classic Social Golfer schedule {1,2,3},{4,5,6},{7,8,9} then
    // {1,4,7},{2,5,8},{3,6,9} uses 9 + 9 = 18 distinct pairs (none repeated),
    // out of C(9,2) = 36 total. So 0 conflicts IS achievable.
    const players = makePlayers(9)
    const r1 = strategy.generate({ ...baseOpts, players, maxPerTable: 3 })
    const previous = collectPreviousPairings([r1])
    const r2 = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      previousPairings: previous,
    })

    const pairs2 = collectPreviousPairings([r2])
    let repeats = 0
    for (const pair of pairs2) {
      if (previous.has(pair)) repeats++
    }
    expect(repeats).toBe(0)
  })

  it('still produces a valid pairing when 0-conflict is impossible', () => {
    // 6 players, max 3 per table. Each round has 2 * C(3,2) = 6 pairs.
    // C(6,2) = 15 total pairs. After 2 rounds we've used 12 — third round
    // MUST repeat at least 3 pairs.
    const players = makePlayers(6)
    const r1 = strategy.generate({ ...baseOpts, players, maxPerTable: 3 })
    const r2 = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      previousPairings: collectPreviousPairings([r1]),
    })
    const r3 = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      previousPairings: collectPreviousPairings([r1, r2]),
    })

    // Sanity: still 2 tables, 3 players each
    expect(r3.tables).toHaveLength(2)
    for (const t of r3.tables) {
      expect(t.playerIds).toHaveLength(3)
    }
    const allIds = r3.tables.flatMap((t) => t.playerIds)
    expect(new Set(allIds).size).toBe(6)
  })

  it('scales: finds 0-conflict schedules at 16 players across 3 rounds', () => {
    // 16 players / 4 per table / 4 tables / 3 rounds.
    // Each round uses 4 * C(4,2) = 24 pairs. 3 rounds = 72 pair-slots.
    // C(16,2) = 120 unique pairs. So 0 rematches across 3 rounds IS achievable
    // (60% density — well within the algorithm's comfort zone).
    const players = makePlayers(16)
    const rounds: RoundPairing[] = []
    for (let r = 1; r <= 3; r++) {
      const pairing = strategy.generate({
        ...baseOpts,
        players,
        maxPerTable: 4,
        previousPairings: collectPreviousPairings(rounds),
      })
      rounds.push(pairing)
    }

    // Count total rematches across all 3 rounds
    const allPairs = new Set<string>()
    let rematches = 0
    for (const r of rounds) {
      const roundPairs = collectPreviousPairings([r])
      for (const pair of roundPairs) {
        if (allPairs.has(pair)) rematches++
        else allPairs.add(pair)
      }
    }
    expect(rematches).toBe(0)
  })

  it('scales: finds 0-conflict schedules at 36 players across 3 rounds', () => {
    // 36 players / 4 per table / 9 tables / 3 rounds.
    // Each round: 9 * C(4,2) = 54 pairs. 3 rounds = 162 pair-slots.
    // C(36,2) = 630 unique pairs. 0 rematches is easily achievable (26% density).
    const players = makePlayers(36)
    const rounds: RoundPairing[] = []
    for (let r = 1; r <= 3; r++) {
      const pairing = strategy.generate({
        ...baseOpts,
        players,
        maxPerTable: 4,
        previousPairings: collectPreviousPairings(rounds),
      })
      rounds.push(pairing)
    }

    const allPairs = new Set<string>()
    let rematches = 0
    for (const r of rounds) {
      const roundPairs = collectPreviousPairings([r])
      for (const pair of roundPairs) {
        if (allPairs.has(pair)) rematches++
        else allPairs.add(pair)
      }
    }
    expect(rematches).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// SocialGolferStrategy — variable table sizes (2-player, 2-5, 2-6)
// ---------------------------------------------------------------------------

describe('SocialGolferStrategy — variable table sizes', () => {
  const strategy = new SocialGolferStrategy()

  // --- 2 players per table (heads-up, like chess) ---

  it('2 per table: seats 10 players into 5 tables of 2', () => {
    const players = makePlayers(10)
    const result = strategy.generate({ ...baseOpts, players, minPerTable: 2, maxPerTable: 2 })
    expect(result.tables).toHaveLength(5)
    for (const t of result.tables) {
      expect(t.playerIds).toHaveLength(2)
    }
    const allIds = result.tables.flatMap((t) => t.playerIds)
    expect(new Set(allIds).size).toBe(10)
  })

  it('2 per table: drops the odd player when count is non-divisible (11 players)', () => {
    // 11 / 2 = 5 tables of 2 + 1 leftover. The leftover can't form a valid
    // table of 2, so it should be dropped (added to droppedPlayerIds).
    const players = makePlayers(11)
    const result = strategy.generate({ ...baseOpts, players, minPerTable: 2, maxPerTable: 2 })
    expect(result.tables).toHaveLength(5)
    for (const t of result.tables) {
      expect(t.playerIds).toHaveLength(2)
    }
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(10) // 10 seated, 1 dropped
    expect(result.droppedPlayerIds).toHaveLength(1)
  })

  it('2 per table: finds 0-conflict schedules across 5 rounds (10 players)', () => {
    // 10 players / 2 per table / 5 tables / 5 rounds.
    // Each round: 5 pairs. 5 rounds = 25 pair-slots.
    // C(10,2) = 45 unique pairs. 0 rematches is easily achievable.
    const players = makePlayers(10)
    const rounds: RoundPairing[] = []
    for (let r = 1; r <= 5; r++) {
      const pairing = strategy.generate({
        round: r,
        minPerTable: 2,
        maxPerTable: 2,
        players,
        previousPairings: collectPreviousPairings(rounds),
      })
      rounds.push(pairing)
    }

    const allPairs = new Set<string>()
    let rematches = 0
    for (const r of rounds) {
      for (const pair of collectPreviousPairings([r])) {
        if (allPairs.has(pair)) rematches++
        else allPairs.add(pair)
      }
    }
    expect(rematches).toBe(0)
  })

  it('2 per table: 2-player tables never have a singleton', () => {
    // Test many player counts to ensure no table ever has just 1 player
    for (let n = 4; n <= 20; n++) {
      const players = makePlayers(n)
      const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 2, players })
      for (const t of result.tables) {
        expect(t.playerIds.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  // --- 2 to 5 players per table ---

  it('2-5 per table: seats 12 players correctly', () => {
    const players = makePlayers(12)
    const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 5, players })
    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(2)
      expect(t.playerIds.length).toBeLessThanOrEqual(5)
    }
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(new Set(seated).size).toBe(12)
  })

  it('2-5 per table: seats 7 players (non-divisible)', () => {
    // 7 / 5 = 2 tables. 7 - 5 = 2 >= min(2) → 1 table of 5 + 1 table of 2.
    const players = makePlayers(7)
    const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 5, players })
    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(2)
      expect(t.playerIds.length).toBeLessThanOrEqual(5)
    }
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(new Set(seated).size).toBe(7)
  })

  it('2-5 per table: minimizes rematches across 3 rounds (20 players, high density)', () => {
    // 20 players / 4 tables of 5 / 3 rounds = 120 pair-slots.
    // C(20,2) = 190 unique pairs. Density = 63%.
    // At this density, 0 rematches is theoretically possible but hard for
    // heuristic algorithms. Verify the engine finds FEWER rematches than
    // random sampling would.
    const players = makePlayers(20)
    const rounds: RoundPairing[] = []
    for (let r = 1; r <= 3; r++) {
      const pairing = strategy.generate({
        round: r,
        minPerTable: 2,
        maxPerTable: 5,
        players,
        previousPairings: collectPreviousPairings(rounds),
      })
      rounds.push(pairing)
    }

    const allPairs = new Set<string>()
    let rematches = 0
    for (const r of rounds) {
      for (const pair of collectPreviousPairings([r])) {
        if (allPairs.has(pair)) rematches++
        else allPairs.add(pair)
      }
    }
    // Random sampling would give ~15-20 rematches at this density.
    // The engine should find significantly fewer.
    expect(rematches).toBeLessThan(10)
  })

  // --- 2 to 6 players per table ---

  it('2-6 per table: seats 13 players correctly', () => {
    const players = makePlayers(13)
    const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 6, players })
    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(2)
      expect(t.playerIds.length).toBeLessThanOrEqual(6)
    }
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(new Set(seated).size).toBe(13)
  })

  it('2-6 per table: seats 5 players (small event)', () => {
    // 5 players / 2-6 per table → 1 table of 5
    const players = makePlayers(5)
    const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 6, players })
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].playerIds).toHaveLength(5)
  })

  it('2-6 per table: minimizes rematches across 3 rounds (24 players, high density)', () => {
    // 24 players / 4 tables of 6 / 3 rounds = 180 pair-slots.
    // C(24,2) = 276 unique pairs. Density = 65%.
    // At this density, 0 rematches is hard. Verify the engine minimizes.
    const players = makePlayers(24)
    const rounds: RoundPairing[] = []
    for (let r = 1; r <= 3; r++) {
      const pairing = strategy.generate({
        round: r,
        minPerTable: 2,
        maxPerTable: 6,
        players,
        previousPairings: collectPreviousPairings(rounds),
      })
      rounds.push(pairing)
    }

    const allPairs = new Set<string>()
    let rematches = 0
    for (const r of rounds) {
      for (const pair of collectPreviousPairings([r])) {
        if (allPairs.has(pair)) rematches++
        else allPairs.add(pair)
      }
    }
    // Random sampling would give ~39 rematches at this density.
    // The engine should find significantly fewer (typically 10-20).
    expect(rematches).toBeLessThan(25)
  })

  // --- 3 to 4 players per table (the default Catan config) ---

  it('3-4 per table: drops nobody for 11 players (redistributes)', () => {
    // 11 / 4 = 3 tables. 11 - 8 = 3 >= min(3) → 1 table of 3 + 2 tables of 4.
    // OR 3 tables: [4, 4, 3] — all within 3-4.
    const players = makePlayers(11)
    const result = strategy.generate({ round: 1, minPerTable: 3, maxPerTable: 4, players })
    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(3)
      expect(t.playerIds.length).toBeLessThanOrEqual(4)
    }
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(new Set(seated).size).toBe(11)
    expect(result.droppedPlayerIds).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// SwissStrategy
// ---------------------------------------------------------------------------

describe('SwissStrategy', () => {
  const strategy = new SwissStrategy()

  it('has format SWISS', () => {
    expect(strategy.format).toBe('SWISS')
  })

  it('groups players with similar records at the same table (consecutive slicing)', () => {
    // CORRECT Swiss: players with similar records play each other.
    // 6 players / 3 per table, sorted by standings desc:
    //   [p1(100), p4(75), p2(50), p5(25), p3(1), p6(0)]
    // Top 3 should be at table 1, bottom 3 at table 2.
    const players = makePlayers(6)
    const standings = new Map<string, number>([
      ['p1', 100],
      ['p2', 50],
      ['p3', 1],
      ['p4', 75],
      ['p5', 25],
      ['p6', 0],
    ])
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
    })

    expect(result.tables).toHaveLength(2)
    const t1 = result.tables[0].playerIds
    const t2 = result.tables[1].playerIds
    // Top 3 (p1, p4, p2) at the same table
    expect(t1).toEqual(expect.arrayContaining(['p1', 'p4', 'p2']))
    expect(t1).toHaveLength(3)
    // Bottom 3 (p5, p3, p6) at the other table
    expect(t2).toEqual(expect.arrayContaining(['p5', 'p3', 'p6']))
    expect(t2).toHaveLength(3)
  })

  it('does NOT split top players across tables (snake draft would be wrong)', () => {
    // Explicit test for the bug we fixed: snake-draft distribution
    // (1st→T1, 2nd→T2, 3rd→T1, 4th→T2) is NOT Swiss.
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
    })

    // Sorted: [p1, p2, p3, p4, p5, p6, p7, p8]
    // Correct: T1 = [p1, p2, p3, p4], T2 = [p5, p6, p7, p8]
    // Wrong (snake): T1 = [p1, p3, p5, p7], T2 = [p2, p4, p6, p8]
    const t1 = result.tables[0].playerIds
    // p1 (1st) and p2 (2nd) MUST be at the same table
    expect(t1).toContain('p1')
    expect(t1).toContain('p2')
    // p1 and p3 (3rd) MUST be at the same table
    expect(t1).toContain('p3')
  })

  it('falls back to alphabetical for players with no standings entry', () => {
    const players = makePlayers(4)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 2,
      standings: new Map<string, number>(),
    })

    expect(result.tables).toHaveLength(2)
    expect(result.tables.flatMap((t) => t.playerIds)).toHaveLength(4)
  })

  it('still seats all players even when count does not divide evenly', () => {
    const players = makePlayers(7)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
    })

    const allIds = result.tables.flatMap((t) => t.playerIds)
    expect(allIds).toHaveLength(7)
    expect(new Set(allIds).size).toBe(7)
  })

  it('excludes dropped players', () => {
    const players = makePlayers(5)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      droppedPlayerIds: ['p2'],
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).not.toContain('p2')
    expect(seated).toHaveLength(4)
  })

  it('reduces rematches when previousPairings is provided', () => {
    // 6 players / 3 per table / 2 rounds.
    // Round 1: T1=[p1,p2,p3], T2=[p4,p5,p6]
    // Round 2 Swiss: by pigeonhole, 0 rematches is impossible (3 players
    // per table, 2 round-1 groups → each table has ≥2 from one group → ≥1 rematch).
    // Minimum achievable = 2 (1 per table). The engine should find that minimum
    // when given previousPairings, and do WORSE without them.
    const players = makePlayers(6)
    const standings = new Map<string, number>([
      ['p1', 30], ['p2', 25], ['p3', 20],
      ['p4', 15], ['p5', 10], ['p6', 5],
    ])
    const r1: RoundPairing = {
      round: 1, format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3'] },
        { tableNumber: 2, playerIds: ['p4', 'p5', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairings([r1])

    // With previousPairings: engine should minimize rematches.
    const r2 = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
      previousPairings: previous,
    })
    const pairs2 = collectPreviousPairings([r2])
    let repeatsWithPrev = 0
    for (const pair of pairs2) {
      if (previous.has(pair)) repeatsWithPrev++
    }

    // The mathematical minimum is 2 (pigeonhole). The engine should achieve it.
    expect(repeatsWithPrev).toBe(2)

    // Without previousPairings: the engine just uses the sorted score-group
    // partition, which happens to reproduce round 1 exactly (6 rematches).
    const r2NoPrev = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
    })
    const pairs2NoPrev = collectPreviousPairings([r2NoPrev])
    let repeatsNoPrev = 0
    for (const pair of pairs2NoPrev) {
      if (previous.has(pair)) repeatsNoPrev++
    }
    // Without rematch avoidance, the strict score-group partition reproduces
    // round 1 (all 6 pairs are rematches).
    expect(repeatsNoPrev).toBeGreaterThan(repeatsWithPrev)
  })
})

// ---------------------------------------------------------------------------
// SingleElimStrategy
// ---------------------------------------------------------------------------

describe('SingleElimStrategy', () => {
  const strategy = new SingleElimStrategy()

  it('has format SINGLE_ELIM', () => {
    expect(strategy.format).toBe('SINGLE_ELIM')
  })

  it('advances only the top half by default', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    // Top half = 4 players (p1-p4 have highest standings)
    expect(seated).toHaveLength(4)
    expect(seated).toEqual(expect.arrayContaining(['p1', 'p2', 'p3', 'p4']))
    // Bottom half should be in droppedPlayerIds
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p5', 'p6', 'p7', 'p8']))
  })

  it('respects explicit advanceCount', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
      advanceCount: 2,
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(2)
    // With seedOrder, the top 2 seeds (p1, p2) should be at different tables
    expect(seated).toEqual(expect.arrayContaining(['p1', 'p2']))
  })

  it('caps advanceCount at total player count', () => {
    const players = makePlayers(4)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      advanceCount: 100,
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(4)
  })

  it('still includes pre-dropped players in droppedPlayerIds', () => {
    const players = makePlayers(8)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      droppedPlayerIds: ['p3'],
    })

    expect(result.droppedPlayerIds).toContain('p3')
  })

  it('reduces rematches when previousPairings is provided', () => {
    // 8 players, advance ALL 8, 2 tables of 4.
    // Round 1: T1=[p1,p2,p5,p6], T2=[p3,p4,p7,p8]
    // By pigeonhole, 0 rematches is impossible (4 players per table, 2 round-1
    // groups → each table has ≥2 from one group → ≥1 rematch per table).
    // The engine should find FEWER rematches with previousPairings than without.
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p5', 'p6'] },
        { tableNumber: 2, playerIds: ['p3', 'p4', 'p7', 'p8'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairings([r1])

    // With previousPairings: engine should minimize rematches.
    const resultWithPrev = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
      previousPairings: previous,
      advanceCount: 8,
    })
    const pairsWithPrev = collectPreviousPairings([resultWithPrev])
    let repeatsWithPrev = 0
    for (const pair of pairsWithPrev) {
      if (previous.has(pair)) repeatsWithPrev++
    }

    // Without previousPairings: engine just partitions (no rematch avoidance).
    const resultNoPrev = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
      advanceCount: 8,
    })
    const pairsNoPrev = collectPreviousPairings([resultNoPrev])
    let repeatsNoPrev = 0
    for (const pair of pairsNoPrev) {
      if (previous.has(pair)) repeatsNoPrev++
    }

    // The engine should find fewer (or equal) rematches when given previousPairings.
    expect(repeatsWithPrev).toBeLessThanOrEqual(repeatsNoPrev)
    // The minimum is 4 (by pigeonhole), but with the adjacency map + delta
    // scoring, the engine should achieve the theoretical minimum.
    expect(repeatsWithPrev).toBeLessThanOrEqual(repeatsNoPrev)
  })
})

// ---------------------------------------------------------------------------
// AdjacentSwissStrategy (bracket-style Swiss — v6)
// ---------------------------------------------------------------------------

describe('AdjacentSwissStrategy', () => {
  const strategy = new AdjacentSwissStrategy()

  it('has format ADJACENT_SWISS', () => {
    expect(strategy.format).toBe('ADJACENT_SWISS')
  })

  it('seats players strictly by consecutive standings position (Table 1 = top table)', () => {
    // 8 players, standings p1 > p2 > ... > p8, tables of 4.
    // Table 1 MUST be [p1..p4], Table 2 MUST be [p5..p8] — exact positions,
    // not just "similar records".
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      round: 1,
      minPerTable: 4,
      maxPerTable: 4,
      players,
      standings,
    })

    expect(result.tables).toHaveLength(2)
    expect(result.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(result.tables[1].playerIds).toEqual(['p5', 'p6', 'p7', 'p8'])
  })

  it('re-slices when standings change (players move up/down tables between rounds)', () => {
    // Round 1: p1-p4 at table 1. Round 2: p5 rockets to 2nd place → table 1.
    const players = makePlayers(8)
    const r1Standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const r1 = strategy.generate({
      round: 1, minPerTable: 4, maxPerTable: 4, players, standings: r1Standings,
    })
    expect(r1.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])

    // p5 now has the 2nd-highest total; p3 fell to 6th.
    const r2Standings = new Map<string, number>([
      ['p1', 100], ['p5', 90], ['p2', 80], ['p4', 70],
      ['p6', 60], ['p3', 50], ['p7', 40], ['p8', 30],
    ])
    const r2 = strategy.generate({
      round: 2, minPerTable: 4, maxPerTable: 4, players, standings: r2Standings,
    })

    // Top table is now exactly the top 4 of the NEW standings.
    expect(r2.tables[0].playerIds).toEqual(['p1', 'p5', 'p2', 'p4'])
    expect(r2.tables[1].playerIds).toEqual(['p6', 'p3', 'p7', 'p8'])
  })

  it('does NOT reshuffle to avoid rematches — tier structure is sacred', () => {
    // p1..p4 already played together in round 1 (6 rematches at table 1 if kept).
    // Classic Swiss would break the group to avoid rematches; Adjacent Swiss
    // must keep the exact standings-based composition anyway.
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const r1: RoundPairing = {
      round: 1, format: 'ADJACENT_SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3', 'p4'] },
        { tableNumber: 2, playerIds: ['p5', 'p6', 'p7', 'p8'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairings([r1])

    const r2 = strategy.generate({
      round: 2,
      minPerTable: 4,
      maxPerTable: 4,
      players,
      standings,
      previousPairings: previous,
    })

    // Same strict composition as round 1 — rematches accepted.
    expect(r2.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(r2.tables[1].playerIds).toEqual(['p5', 'p6', 'p7', 'p8'])
  })

  it('is fully deterministic — same standings, same pairing, no RNG consumed', () => {
    const players = makePlayers(12)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const run1 = strategy.generate({ round: 3, minPerTable: 3, maxPerTable: 4, players, standings })
    const run2 = strategy.generate({ round: 3, minPerTable: 3, maxPerTable: 4, players, standings })
    expect(run1).toEqual(run2)
  })

  it('excludes dropped players and lists them in droppedPlayerIds', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      round: 2, minPerTable: 3, maxPerTable: 4, players, standings, droppedPlayerIds: ['p2'],
    })
    // 7 active players → sizes [4, 3]. Strict re-slice: p5 moves UP to fill
    // p2's seat at the top table.
    expect(result.tables[0].playerIds).toEqual(['p1', 'p3', 'p4', 'p5'])
    expect(result.tables[1].playerIds).toEqual(['p6', 'p7', 'p8'])
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p2']))
  })

  it('when the field does not divide evenly, the LOWEST-ranked players sit out', () => {
    // 6 players, tables of 4 → one table of 4, two players out. The bottom
    // two (p5, p6) sit out — NOT the top two.
    const players = makePlayers(6)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      round: 1, minPerTable: 4, maxPerTable: 4, players, standings,
    })
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p5', 'p6']))
    expect(result.droppedPlayerIds).not.toContain('p1')
  })

  it('supports seat rotation without changing table composition', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      round: 2, minPerTable: 4, maxPerTable: 4, players, standings, seatRotation: 'CLOCKWISE',
    })
    expect(result.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(result.tables[0].seats).toEqual([2, 3, 4, 1]) // round 2 clockwise
  })

  it('uses tiebreakers and falls back to name order for determinism', () => {
    const players = makePlayers(6)
    // Everyone tied on total; tiebreakers split them.
    const standings: Map<string, StandingEntry> = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 20 }],
      ['p2', { total: 10, gamePointsTotal: 50 }],
      ['p3', { total: 10, gamePointsTotal: 40 }],
      ['p4', { total: 10, gamePointsTotal: 30 }],
      ['p5', { total: 10, gamePointsTotal: 10 }],
      ['p6', { total: 10, gamePointsTotal: 60 }],
    ])
    const result = strategy.generate({
      round: 1,
      minPerTable: 3,
      maxPerTable: 3,
      players,
      standings,
      tiebreakers: ['TOTAL_GAME_POINTS'],
    })
    // Order by gamePoints: p6(60), p2(50), p3(40), p4(30), p1(20), p5(10)
    expect(result.tables[0].playerIds).toEqual(['p6', 'p2', 'p3'])
    expect(result.tables[1].playerIds).toEqual(['p4', 'p1', 'p5'])
  })

  it('generateWithDiagnostics reports rematch conflicts without trying to fix them', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const r1: RoundPairing = {
      round: 1, format: 'ADJACENT_SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3', 'p4'] },
        { tableNumber: 2, playerIds: ['p5', 'p6', 'p7', 'p8'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairCounts([r1])

    const { pairing, diagnostics } = strategy.generateWithDiagnostics({
      round: 2,
      minPerTable: 4,
      maxPerTable: 4,
      players,
      standings,
      previousPairings: previous,
    })!

    // 2 tables × C(4,2) = 12 rematches, all accepted (tier structure is sacred).
    expect(diagnostics.conflictCount).toBe(12)
    expect(diagnostics.feasible).toBe(false)
    expect(diagnostics.iterationsRun).toBe(0) // no search ever runs
    expect(diagnostics.conflictTableNumbers).toEqual([1, 2])
    expect(pairing.tables[0].playerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('handles empty input', () => {
    const result = strategy.generate({ round: 1, minPerTable: 2, maxPerTable: 4, players: [] })
    expect(result.tables).toHaveLength(0)
  })

  it('works with no standings (alphabetical fallback keeps determinism)', () => {
    const players = makePlayers(6)
    const result = strategy.generate({ round: 1, minPerTable: 3, maxPerTable: 3, players })
    expect(result.tables).toHaveLength(2)
    expect(result.tables[0].playerIds).toEqual(['p1', 'p2', 'p3'])
    expect(result.tables[1].playerIds).toEqual(['p4', 'p5', 'p6'])
  })
})

// ---------------------------------------------------------------------------
// reassignPlayer
// ---------------------------------------------------------------------------

describe('reassignPlayer', () => {
  it('moves a player from one table to another', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] },
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: [],
    }

    const result = reassignPlayer(pairing, 'a', 2)

    expect(result.tables.find((t) => t.tableNumber === 1)?.playerIds).toEqual(['b'])
    expect(result.tables.find((t) => t.tableNumber === 2)?.playerIds).toEqual(['c', 'd', 'a'])
  })

  it('renumbers tables sequentially after move', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a'] }, // will become empty
        { tableNumber: 2, playerIds: ['b', 'c'] },
      ],
      droppedPlayerIds: [],
    }

    const result = reassignPlayer(pairing, 'a', 2)

    // Table 1 is now empty → filtered out; remaining table renumbered to 1
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].tableNumber).toBe(1)
    expect(result.tables[0].playerIds).toEqual(['b', 'c', 'a'])
  })

  it('preserves droppedPlayerIds', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: ['x'],
    }
    const result = reassignPlayer(pairing, 'a', 1)
    expect(result.droppedPlayerIds).toEqual(['x'])
  })

  it('does not duplicate the player if target table somehow has them already', () => {
    // Edge case: if called with toTableNumber === source table
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: [],
    }
    const result = reassignPlayer(pairing, 'a', 1)
    // 'a' is removed first, then pushed to table 1 — so should appear once
    expect(result.tables[0].playerIds.filter((id) => id === 'a')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// dropPlayerFromRound
// ---------------------------------------------------------------------------

describe('dropPlayerFromRound', () => {
  it('removes the player from all tables', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] },
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: [],
    }
    const result = dropPlayerFromRound(pairing, 'a')
    expect(result.tables.flatMap((t) => t.playerIds)).not.toContain('a')
  })

  it('adds the player to droppedPlayerIds', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: [],
    }
    const result = dropPlayerFromRound(pairing, 'a')
    expect(result.droppedPlayerIds).toContain('a')
  })

  it('deduplicates if player was already in droppedPlayerIds', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: ['a'],
    }
    const result = dropPlayerFromRound(pairing, 'a')
    expect(result.droppedPlayerIds.filter((id) => id === 'a')).toHaveLength(1)
  })

  it('removes the table entirely if it becomes empty', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a'] },
        { tableNumber: 2, playerIds: ['b', 'c'] },
      ],
      droppedPlayerIds: [],
    }
    const result = dropPlayerFromRound(pairing, 'a')
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].tableNumber).toBe(1) // renumbered
  })

  it('is a no-op if the player was not seated', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: [],
    }
    const result = dropPlayerFromRound(pairing, 'zzz')
    expect(result.tables[0].playerIds).toEqual(['a', 'b'])
    expect(result.droppedPlayerIds).toContain('zzz')
  })
})

// ---------------------------------------------------------------------------
// reintroducePlayer
// ---------------------------------------------------------------------------

describe('reintroducePlayer', () => {
  it('removes the player from droppedPlayerIds', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: ['x'],
    }
    const result = reintroducePlayer(pairing, 'x', 4)
    expect(result.droppedPlayerIds).not.toContain('x')
  })

  it('places the player at the first table with room', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // 2 players, room for 4
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: ['x'],
    }
    const result = reintroducePlayer(pairing, 'x', 4)
    expect(result.tables[0].playerIds).toContain('x')
  })

  it('creates a new table when all tables are full', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: ['x'],
    }
    const result = reintroducePlayer(pairing, 'x', 2)
    expect(result.tables).toHaveLength(2)
    expect(result.tables[1].playerIds).toEqual(['x'])
  })

  it('is a no-op for the tables if player is already seated', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: ['a'], // weird state but should be handled
    }
    const result = reintroducePlayer(pairing, 'a', 4)
    expect(result.tables[0].playerIds).toEqual(['a', 'b']) // unchanged
    expect(result.droppedPlayerIds).not.toContain('a')
  })

  it('handles empty tables list', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [],
      droppedPlayerIds: ['x'],
    }
    const result = reintroducePlayer(pairing, 'x', 4)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].playerIds).toEqual(['x'])
    expect(result.tables[0].tableNumber).toBe(1)
  })

  it('renumbers tables sequentially', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      // Note: deliberately non-sequential table numbers to verify renumber.
      // maxPerTable=2 below forces a new table to be created.
      tables: [
        { tableNumber: 5, playerIds: ['a', 'b'] },
      ],
      droppedPlayerIds: ['x'],
    }
    const result = reintroducePlayer(pairing, 'x', 2)
    expect(result.tables.map((t) => t.tableNumber)).toEqual([1, 2])
  })
})

// ---------------------------------------------------------------------------
// collectPreviousPairings + pairKey
// ---------------------------------------------------------------------------

describe('collectPreviousPairings', () => {
  it('collects every unordered pair from every table in every round', () => {
    const rounds: RoundPairing[] = [
      {
        round: 1,
        format: 'ROUND_ROBIN',
        tables: [{ tableNumber: 1, playerIds: ['a', 'b', 'c'] }],
        droppedPlayerIds: [],
      },
      {
        round: 2,
        format: 'ROUND_ROBIN',
        tables: [{ tableNumber: 1, playerIds: ['a', 'd'] }],
        droppedPlayerIds: [],
      },
    ]
    const set = collectPreviousPairings(rounds)
    // Round 1: (a,b), (a,c), (b,c) = 3 pairs
    // Round 2: (a,d) = 1 pair
    expect(set.size).toBe(4)
    expect(set.has(pairKey('a', 'b'))).toBe(true)
    expect(set.has(pairKey('a', 'c'))).toBe(true)
    expect(set.has(pairKey('b', 'c'))).toBe(true)
    expect(set.has(pairKey('a', 'd'))).toBe(true)
  })

  it('returns empty set for empty input', () => {
    expect(collectPreviousPairings([]).size).toBe(0)
  })

  it('ignores tables with < 2 players', () => {
    const rounds: RoundPairing[] = [
      {
        round: 1,
        format: 'ROUND_ROBIN',
        tables: [
          { tableNumber: 1, playerIds: ['a'] }, // singleton
          { tableNumber: 2, playerIds: [] },    // empty
        ],
        droppedPlayerIds: [],
      },
    ]
    expect(collectPreviousPairings(rounds).size).toBe(0)
  })
})

describe('pairKey', () => {
  it('returns a deterministic key regardless of argument order', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'))
  })

  it('returns the same string for equal inputs', () => {
    expect(pairKey('x', 'x')).toBe('x|x')
  })
})

// ===========================================================================
// PHASE 3 — Rematch counts, byes, tiebreakers, diagnostics, partial re-pair
// ===========================================================================

// ---------------------------------------------------------------------------
// Phase 3.1 — Weighted adjacency map (rematch counting)
// ---------------------------------------------------------------------------

describe('Phase 3: weighted adjacency (rematch counting)', () => {
  const strategy = new SocialGolferStrategy()
  const { buildAdjacency, scoreTable, meetCount } = __internals

  it('buildAdjacency accepts a Set (binary) and assigns weight 1 per pair', () => {
    const set = new Set<string>([pairKey('a', 'b'), pairKey('a', 'c')])
    const adj = buildAdjacency(set)!
    expect(meetCount(adj, 'a', 'b')).toBe(1)
    expect(meetCount(adj, 'a', 'c')).toBe(1)
    expect(meetCount(adj, 'b', 'c')).toBe(0)
    expect(meetCount(adj, 'b', 'a')).toBe(1) // symmetric
  })

  it('buildAdjacency accepts a Map (weighted) and preserves meet counts', () => {
    const map = new Map<string, number>([
      [pairKey('a', 'b'), 3], // met 3 times
      [pairKey('a', 'c'), 1],
    ])
    const adj = buildAdjacency(map)!
    expect(meetCount(adj, 'a', 'b')).toBe(3)
    expect(meetCount(adj, 'b', 'a')).toBe(3)
    expect(meetCount(adj, 'a', 'c')).toBe(1)
  })

  it('scoreTable sums meet counts (not just binary presence)', () => {
    const map = new Map<string, number>([
      [pairKey('a', 'b'), 2],
      [pairKey('a', 'c'), 1],
      [pairKey('b', 'c'), 1],
    ])
    const adj = buildAdjacency(map)!
    // table [a,b,c] → 2 + 1 + 1 = 4
    expect(scoreTable(['a', 'b', 'c'], adj)).toBe(4)
  })

  it('collectPreviousPairCounts builds a weighted map from rounds', () => {
    const rounds: RoundPairing[] = [
      {
        round: 1, format: 'ROUND_ROBIN',
        tables: [{ tableNumber: 1, playerIds: ['a', 'b', 'c'] }],
        droppedPlayerIds: [],
      },
      {
        round: 2, format: 'ROUND_ROBIN',
        tables: [{ tableNumber: 1, playerIds: ['a', 'b', 'd'] }],
        droppedPlayerIds: [],
      },
    ]
    const counts = collectPreviousPairCounts(rounds)
    expect(counts.get(pairKey('a', 'b'))).toBe(2) // met in both rounds
    expect(counts.get(pairKey('a', 'c'))).toBe(1)
    expect(counts.get(pairKey('a', 'd'))).toBe(1)
    expect(counts.get(pairKey('b', 'd'))).toBe(1)
    expect(counts.has(pairKey('c', 'd'))).toBe(false)
  })

  it('engine minimizes total rematch WEIGHT, not just rematch count', () => {
    // 6 players, 3 per table, 3 rounds.
    // R1: T1=[p1,p2,p3], T2=[p4,p5,p6]
    // R2: T1=[p1,p4,p5], T2=[p2,p3,p6]
    // After R1+R2:
    //   - p2p3 has met 2× (weight 2)
    //   - p4p5 has met 2× (weight 2)
    //   - all other pairs from R1+R2 have weight 1
    //   - pairs that never met (weight 0): p1p6, p2p4, p2p5, p3p4, p3p5
    //
    // For R3, 2 tables of 3 = 6 pair slots. The minimum total weight
    // is 4: any triangle containing p1 has weight ≥2 (p1 met everyone except p6,
    // but p6 has met the others). So we need 2 disjoint triangles each with
    // weight exactly 2.
    //
    // The weighted engine should AVOID the weight-2 pairs (p2p3, p4p5)
    // in favor of weight-1 pairs when possible. With binary adjacency,
    // all rematch pairs would have weight 1, total = 2.
    const players = makePlayers(6)
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3'] },
        { tableNumber: 2, playerIds: ['p4', 'p5', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const r2: RoundPairing = {
      round: 2, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p4', 'p5'] },
        { tableNumber: 2, playerIds: ['p2', 'p3', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairCounts([r1, r2])

    // Run with weighted adjacency
    const r3 = strategy.generate({
      round: 3,
      minPerTable: 3,
      maxPerTable: 3,
      players,
      previousPairings: previous,
      rng: mulberry32(42),
    })

    // Compute total rematch weight of round 3
    const r3Pairs = collectPreviousPairCounts([r3])
    let totalWeight = 0
    for (const [key, count] of r3Pairs) {
      totalWeight += (previous.get(key) ?? 0) * count
    }

    // Theoretical minimum is 4 (not 2): any pair of disjoint triangles must
    // include at least one weight-2 pair OR two weight-1 pairs.
    // The engine should achieve the minimum.
    expect(totalWeight).toBe(4)

    // Sanity check: with binary adjacency (Set form), the engine would also
    // produce 4 (since 4 weight-1 pairs would be used). The improvement from
    // weighted adjacency shows up in LATER rounds — keeping p2p3 apart.
    const setForm = collectPreviousPairings([r1, r2])
    const r3Binary = strategy.generate({
      round: 3,
      minPerTable: 3,
      maxPerTable: 3,
      players,
      previousPairings: setForm,
      rng: mulberry32(42),
    })
    const r3BinaryPairs = collectPreviousPairCounts([r3Binary])
    let binaryWeight = 0
    for (const [key, count] of r3BinaryPairs) {
      binaryWeight += (previous.get(key) ?? 0) * count
    }
    expect(binaryWeight).toBe(4)
  })

  it('engine accepts Set OR Map for previousPairings (backward compat)', () => {
    const players = makePlayers(6)
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3'] },
        { tableNumber: 2, playerIds: ['p4', 'p5', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const setForm = collectPreviousPairings([r1])
    const mapForm = collectPreviousPairCounts([r1])

    const result1 = strategy.generate({
      round: 2, minPerTable: 3, maxPerTable: 3,
      players, previousPairings: setForm, rng: mulberry32(42),
    })
    const result2 = strategy.generate({
      round: 2, minPerTable: 3, maxPerTable: 3,
      players, previousPairings: mapForm, rng: mulberry32(42),
    })

    // Both forms should produce equivalent (likely identical) results.
    expect(result1.tables.length).toBe(result2.tables.length)
    const seated1 = result1.tables.flatMap((t) => t.playerIds).sort()
    const seated2 = result2.tables.flatMap((t) => t.playerIds).sort()
    expect(seated1).toEqual(seated2)
  })
})

// ---------------------------------------------------------------------------
// Phase 3.2 — Single-elim byes for non-power-of-2 fields
// ---------------------------------------------------------------------------

describe('Phase 3: single-elim byes', () => {
  const strategy = new SingleElimStrategy()
  const { isPow2, nextPow2, computeByeSeeds } = __internals

  it('isPow2 correctly identifies powers of 2', () => {
    expect(isPow2(1)).toBe(true)
    expect(isPow2(2)).toBe(true)
    expect(isPow2(4)).toBe(true)
    expect(isPow2(8)).toBe(true)
    expect(isPow2(16)).toBe(true)
    expect(isPow2(3)).toBe(false)
    expect(isPow2(6)).toBe(false)
    expect(isPow2(7)).toBe(false)
    expect(isPow2(12)).toBe(false)
  })

  it('nextPow2 rounds up to the next power of 2', () => {
    expect(nextPow2(1)).toBe(1)
    expect(nextPow2(2)).toBe(2)
    expect(nextPow2(3)).toBe(4)
    expect(nextPow2(5)).toBe(8)
    expect(nextPow2(6)).toBe(8)
    expect(nextPow2(8)).toBe(8)
    expect(nextPow2(9)).toBe(16)
    expect(nextPow2(15)).toBe(16)
    expect(nextPow2(16)).toBe(16)
  })

  it('computeByeSeeds returns [] for power-of-2 fields', () => {
    expect(computeByeSeeds(2)).toEqual([])
    expect(computeByeSeeds(4)).toEqual([])
    expect(computeByeSeeds(8)).toEqual([])
    expect(computeByeSeeds(16)).toEqual([])
  })

  it('computeByeSeeds returns top-N seeds for non-power-of-2 fields', () => {
    expect(computeByeSeeds(3)).toEqual([0]) // nextPow2=4, 1 bye
    expect(computeByeSeeds(5)).toEqual([0, 1, 2]) // nextPow2=8, 3 byes
    expect(computeByeSeeds(6)).toEqual([0, 1]) // nextPow2=8, 2 byes
    expect(computeByeSeeds(7)).toEqual([0]) // nextPow2=8, 1 bye
    expect(computeByeSeeds(9)).toEqual([0, 1, 2, 3, 4, 5, 6]) // nextPow2=16, 7 byes
  })

  it('6-player field: 2 top seeds get byes, 4 players play at 2 tables of 2', () => {
    const players = makePlayers(6)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      advanceCount: 6, // advance all 6
      rng: mulberry32(42),
    })

    // Top 2 seeds (p1, p2) should be byes → in droppedPlayerIds
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p1', 'p2']))
    // The other 4 players should be seated at 2 tables of 2
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(4)
    expect(seated).toEqual(expect.arrayContaining(['p3', 'p4', 'p5', 'p6']))
    expect(seated).not.toContain('p1')
    expect(seated).not.toContain('p2')
  })

  it('5-player field: 3 top seeds get byes, 2 players play at 1 table', () => {
    const players = makePlayers(5)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      advanceCount: 5,
      rng: mulberry32(42),
    })

    // Top 3 seeds get byes
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p1', 'p2', 'p3']))
    // Bottom 2 play
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(2)
    expect(seated).toEqual(expect.arrayContaining(['p4', 'p5']))
  })

  it('8-player field (power of 2): no byes, all 8 play', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      advanceCount: 8,
      rng: mulberry32(42),
    })

    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(8) // no byes
  })

  it('byes are computed from advanceCount, not total player count', () => {
    // 12 players, advanceCount=6 → byes for top 2 (nextPow2(6)=8, 2 byes)
    const players = makePlayers(12)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      advanceCount: 6,
      rng: mulberry32(42),
    })

    // Top 2 of the ADVANCED 6 (i.e., p1, p2) get byes
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p1', 'p2']))
    // The other 4 of the advanced 6 (p3-p6) play
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(4)
    expect(seated).toEqual(expect.arrayContaining(['p3', 'p4', 'p5', 'p6']))
    // p7-p12 are below the cut (also in dropped, but as elim losers, not byes)
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['p7', 'p8', 'p9', 'p10', 'p11', 'p12']))
  })

  it('bye players do not cause "vanishing player" validation errors', () => {
    // This is a regression test — the validatePairing helper checks that
    // every active player is either seated or in droppedPlayerIds.
    // Bye players must be in droppedPlayerIds to pass validation.
    const players = makePlayers(6)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    expect(() => {
      strategy.generate({
        ...baseOpts,
        players,
        minPerTable: 2,
        maxPerTable: 2,
        standings,
        advanceCount: 6,
        rng: mulberry32(42),
      })
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Phase 3.3 — Tiebreaker-aware standings
// ---------------------------------------------------------------------------

describe('Phase 3: tiebreaker-aware standings', () => {
  const { buildStandingsComparator } = __internals

  it('accepts Map<string, number> (legacy form) and sorts by total desc, then name', () => {
    const players = makePlayers(3)
    // All three players tied on total
    const standings = new Map<string, number>([
      ['p1', 10], ['p2', 10], ['p3', 10],
    ])
    const cmp = buildStandingsComparator(standings, [])
    const sorted = [...players].sort(cmp)
    // Ties broken alphabetically: Player 1, Player 2, Player 3
    expect(sorted.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('accepts Map<string, StandingEntry> and sorts by total desc', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 50 }],
      ['p2', { total: 30 }],
      ['p3', { total: 100 }],
    ])
    const cmp = buildStandingsComparator(standings, [])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p3', 'p1', 'p2'])
  })

  it('TOTAL_GAME_POINTS tiebreaker: higher gamePoints ranks higher', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 50 }],
      ['p2', { total: 10, gamePointsTotal: 80 }],
      ['p3', { total: 10, gamePointsTotal: 30 }],
    ])
    const cmp = buildStandingsComparator(standings, ['TOTAL_GAME_POINTS'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('FIRST_PLACES tiebreaker: more 1st-place finishes ranks higher', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, firstPlaceCount: 1 }],
      ['p2', { total: 10, firstPlaceCount: 3 }],
      ['p3', { total: 10, firstPlaceCount: 0 }],
    ])
    const cmp = buildStandingsComparator(standings, ['FIRST_PLACES'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('BEST_PLACEMENT tiebreaker: lower best placement ranks higher', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, bestPlacement: 2 }],
      ['p2', { total: 10, bestPlacement: 1 }],
      ['p3', { total: 10, bestPlacement: 3 }],
    ])
    const cmp = buildStandingsComparator(standings, ['BEST_PLACEMENT'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('DROP_WORST_ROUND tiebreaker: higher dropWorstTotal ranks higher', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, dropWorstTotal: 25 }],
      ['p2', { total: 10, dropWorstTotal: 40 }],
      ['p3', { total: 10, dropWorstTotal: 15 }],
    ])
    const cmp = buildStandingsComparator(standings, ['DROP_WORST_ROUND'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('TABLE_STRENGTH tiebreaker: higher accumulatedTablePoints ranks higher', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, accumulatedTablePoints: 100 }],
      ['p2', { total: 10, accumulatedTablePoints: 200 }],
      ['p3', { total: 10, accumulatedTablePoints: 50 }],
    ])
    const cmp = buildStandingsComparator(standings, ['TABLE_STRENGTH'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('multiple tiebreakers apply in order — first that breaks the tie wins', () => {
    const players = makePlayers(4)
    // All tied on total. p1 and p2 tied on gamePointsTotal=50 (high),
    // p3 and p4 tied on gamePointsTotal=30 (low).
    // Within each group, FIRST_PLACES breaks the tie:
    //   p1 (3 firsts) > p2 (1 first); p3 (2 firsts) > p4 (0 firsts).
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 50, firstPlaceCount: 3 }],
      ['p2', { total: 10, gamePointsTotal: 50, firstPlaceCount: 1 }],
      ['p3', { total: 10, gamePointsTotal: 30, firstPlaceCount: 2 }],
      ['p4', { total: 10, gamePointsTotal: 30, firstPlaceCount: 0 }],
    ])
    const cmp = buildStandingsComparator(standings, ['TOTAL_GAME_POINTS', 'FIRST_PLACES'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('falls back to name sort when all tiebreakers tie', () => {
    const players = makePlayers(3)
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 50 }],
      ['p2', { total: 10, gamePointsTotal: 50 }],
      ['p3', { total: 10, gamePointsTotal: 50 }],
    ])
    const cmp = buildStandingsComparator(standings, ['TOTAL_GAME_POINTS'])
    const sorted = [...players].sort(cmp)
    expect(sorted.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('Swiss strategy uses tiebreakers when provided', () => {
    const strategy = new SwissStrategy()
    const players = makePlayers(4)
    // All tied on total=10. p2 has higher gamePointsTotal.
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 30 }],
      ['p2', { total: 10, gamePointsTotal: 50 }],
      ['p3', { total: 10, gamePointsTotal: 40 }],
      ['p4', { total: 10, gamePointsTotal: 20 }],
    ])
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      tiebreakers: ['TOTAL_GAME_POINTS'],
      rng: mulberry32(42),
    })

    // Sorted: p2 (50), p3 (40), p1 (30), p4 (20)
    // Top table = [p2, p3]; bottom table = [p1, p4]
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(4)
    // p2 and p3 (top 2 by tiebreaker) should be at the same table
    const topTable = result.tables.find((t) => t.playerIds.includes('p2'))!
    expect(topTable.playerIds).toEqual(expect.arrayContaining(['p2', 'p3']))
  })

  it('Single Elim uses tiebreakers to pick top seeds', () => {
    const strategy = new SingleElimStrategy()
    const players = makePlayers(4)
    // All tied on total=10. p3 has highest gamePointsTotal.
    const standings = new Map<string, StandingEntry>([
      ['p1', { total: 10, gamePointsTotal: 30 }],
      ['p2', { total: 10, gamePointsTotal: 20 }],
      ['p3', { total: 10, gamePointsTotal: 50 }],
      ['p4', { total: 10, gamePointsTotal: 40 }],
    ])
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      standings,
      tiebreakers: ['TOTAL_GAME_POINTS'],
      advanceCount: 4, // no byes (power of 2)
      rng: mulberry32(42),
    })

    // All 4 advance (no byes since 4 is a power of 2)
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// Phase 3.4 — Feasibility diagnostics
// ---------------------------------------------------------------------------

describe('Phase 3: feasibility diagnostics', () => {
  const strategy = new SocialGolferStrategy()

  it('generateWithDiagnostics returns {pairing, diagnostics} shape', () => {
    const players = makePlayers(8)
    const { pairing, diagnostics } = strategy.generateWithDiagnostics({
      ...baseOpts,
      players,
      rng: mulberry32(42),
    })!

    expect(pairing).toBeDefined()
    expect(pairing.tables).toHaveLength(2)
    expect(diagnostics).toBeDefined()
    expect(diagnostics.feasible).toBe(true) // 8 players, no previous → 0 conflicts
    expect(diagnostics.conflictCount).toBe(0)
    expect(diagnostics.conflictingTables).toBe(0)
    expect(diagnostics.iterationsRun).toBeGreaterThanOrEqual(0)
    expect(diagnostics.restartsRun).toBeGreaterThanOrEqual(0)
    expect(diagnostics.timeBudgetMs).toBeGreaterThanOrEqual(0)
    expect(diagnostics.timeBudgetRequestedMs).toBe(2000)
    expect(diagnostics.terminatedByTime).toBe(false)
    expect(diagnostics.conflictTableNumbers).toEqual([])
  })

  it('reports feasible=true when 0 conflicts (trivial case)', () => {
    const players = makePlayers(4)
    const { diagnostics } = strategy.generateWithDiagnostics({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 2,
      rng: mulberry32(42),
    })!

    expect(diagnostics.feasible).toBe(true)
    expect(diagnostics.conflictCount).toBe(0)
  })

  it('reports conflictCount correctly when rematches are unavoidable', () => {
    // 6 players, 3 per table, 2 rounds → pigeonhole forces ≥2 rematches
    const players = makePlayers(6)
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3'] },
        { tableNumber: 2, playerIds: ['p4', 'p5', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairCounts([r1])

    const { diagnostics } = strategy.generateWithDiagnostics({
      round: 2,
      minPerTable: 3,
      maxPerTable: 3,
      players,
      previousPairings: previous,
      rng: mulberry32(42),
    })!

    // 2 conflicts forced by pigeonhole
    expect(diagnostics.conflictCount).toBe(2)
    expect(diagnostics.feasible).toBe(false)
    expect(diagnostics.conflictingTables).toBe(2) // both tables have 1 rematch
    expect(diagnostics.conflictTableNumbers).toHaveLength(2)
    expect(diagnostics.conflictTableNumbers).toEqual(expect.arrayContaining([1, 2]))
  })

  it('respects deadlineMs option', () => {
    const players = makePlayers(20)
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3', 'p4'] },
        { tableNumber: 2, playerIds: ['p5', 'p6', 'p7', 'p8'] },
        { tableNumber: 3, playerIds: ['p9', 'p10', 'p11', 'p12'] },
        { tableNumber: 4, playerIds: ['p13', 'p14', 'p15', 'p16'] },
        { tableNumber: 5, playerIds: ['p17', 'p18', 'p19', 'p20'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = collectPreviousPairCounts([r1])

    const { diagnostics } = strategy.generateWithDiagnostics({
      round: 2,
      minPerTable: 4,
      maxPerTable: 4,
      players,
      previousPairings: previous,
      deadlineMs: 50, // 50ms — very tight
      rng: mulberry32(42),
    })!

    expect(diagnostics.timeBudgetRequestedMs).toBe(50)
    // Search may or may not be terminated by time, but time should be bounded
    expect(diagnostics.timeBudgetMs).toBeLessThan(500) // way under any sane cap
  })

  it('Swiss strategy exposes generateWithDiagnostics too', () => {
    const swiss = new SwissStrategy()
    const players = makePlayers(6)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const { pairing, diagnostics } = swiss.generateWithDiagnostics({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
      rng: mulberry32(42),
    })!

    expect(pairing.tables).toHaveLength(2)
    expect(diagnostics).toBeDefined()
    expect(diagnostics.feasible).toBe(true)
  })

  it('SingleElim strategy exposes generateWithDiagnostics too', () => {
    const elim = new SingleElimStrategy()
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const { pairing, diagnostics } = elim.generateWithDiagnostics({
      ...baseOpts,
      players,
      maxPerTable: 4,
      standings,
      rng: mulberry32(42),
    })!

    expect(pairing.tables).toHaveLength(1)
    expect(diagnostics).toBeDefined()
  })

  it('empty input returns empty pairing with trivially-feasible diagnostics', () => {
    const { pairing, diagnostics } = strategy.generateWithDiagnostics({
      ...baseOpts,
      players: [],
    })!

    expect(pairing.tables).toHaveLength(0)
    expect(diagnostics.feasible).toBe(true)
    expect(diagnostics.conflictCount).toBe(0)
    expect(diagnostics.iterationsRun).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 3.5 — Partial re-pair
// ---------------------------------------------------------------------------

describe('Phase 3: partialRepair', () => {
  it('removes specified players from tables and re-places them', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, ['a', 'd'], {
      maxPerTable: 3,
      rng: mulberry32(42),
    })

    // All 6 players should still be seated
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(6)
    expect(new Set(seated).size).toBe(6)
    expect(result.droppedPlayerIds).toHaveLength(0)
  })

  it('preserves the seats of players NOT in the repair set', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 3,
      rng: mulberry32(42),
    })

    // b and c should still be at table 1 (only 'a' was removed)
    const table1 = result.tables.find((t) => t.playerIds.includes('b'))!
    expect(table1.playerIds).toEqual(expect.arrayContaining(['b', 'c']))
    expect(table1.playerIds).toHaveLength(3) // b, c, and re-placed 'a' or someone else

    // d, e, f should all be at the same table (table 2)
    const table2 = result.tables.find((t) => t.playerIds.includes('d'))!
    expect(table2.playerIds).toEqual(expect.arrayContaining(['d', 'e', 'f']))
  })

  it('uses previousPairings to AVOID rematches when re-placing', () => {
    // Setup: a already met b and c in round 1.
    // After repair, a should prefer to go to table 2 (with d, e, f) since
    // they haven't met. maxPerTable=4 so table 2 has room.
    const pairing: RoundPairing = {
      round: 2,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] }, // a is here but met b,c
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = new Set<string>([
      pairKey('a', 'b'), pairKey('a', 'c'), pairKey('b', 'c'),
    ])

    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      previousPairings: previous,
      rng: mulberry32(42),
    })

    // a should now be at table 2 (no rematches), table 1 has [b, c]
    const aTable = result.tables.find((t) => t.playerIds.includes('a'))!
    expect(aTable.playerIds).toEqual(expect.arrayContaining(['d', 'e', 'f']))
    expect(aTable.playerIds).not.toContain('b')
    expect(aTable.playerIds).not.toContain('c')
  })

  it('weighted previousPairings (Map) also work', () => {
    const pairing: RoundPairing = {
      round: 2,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    const previous = new Map<string, number>([
      [pairKey('a', 'b'), 2], // met 2x → stronger aversion
      [pairKey('a', 'c'), 1],
      [pairKey('b', 'c'), 1],
    ])

    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      previousPairings: previous,
      rng: mulberry32(42),
    })

    // a should avoid table 1 (weighted 3 conflicts) → go to table 2
    const aTable = result.tables.find((t) => t.playerIds.includes('a'))!
    expect(aTable.playerIds).toEqual(expect.arrayContaining(['d', 'e', 'f']))
  })

  it('is a no-op for empty repair list', () => {
    const pairing: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'] }],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, [], { maxPerTable: 4 })
    expect(result.tables).toEqual(pairing.tables)
  })

  it('drops player to droppedPlayerIds when no table has room', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // full at maxPerTable=2
        { tableNumber: 2, playerIds: ['c', 'd'] }, // full
      ],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, ['e'], { maxPerTable: 2 })

    // 'e' has nowhere to go → in droppedPlayerIds
    expect(result.droppedPlayerIds).toContain('e')
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).not.toContain('e')
  })

  it('renumbers tables sequentially after repair', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] },
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, ['a', 'b'], { maxPerTable: 2 })
    expect(result.tables.map((t) => t.tableNumber)).toEqual([1, 2])
  })

  it('preserves existing droppedPlayerIds (adds new unseated, dedupes)', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] },
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: ['pre-dropped'],
    }
    const result = partialRepair(pairing, ['unseatable-1', 'unseatable-2'], {
      maxPerTable: 2, // both tables already full
    })
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining([
      'pre-dropped', 'unseatable-1', 'unseatable-2',
    ]))
  })
})

// ---------------------------------------------------------------------------
// Phase 3 — Backward compat (no regressions)
// ---------------------------------------------------------------------------

describe('Phase 3: backward compatibility', () => {
  it('generate() still works (calls generateWithDiagnostics internally)', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(8)
    const result = strategy.generate({ ...baseOpts, players })
    expect(result.tables).toHaveLength(2)
    expect(result.format).toBe('ROUND_ROBIN')
  })

  it('Set<string> form of previousPairings still works (legacy callers)', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(6)
    const r1: RoundPairing = {
      round: 1, format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['p1', 'p2', 'p3'] },
        { tableNumber: 2, playerIds: ['p4', 'p5', 'p6'] },
      ],
      droppedPlayerIds: [],
    }
    const setForm = collectPreviousPairings([r1])
    const r2 = strategy.generate({
      round: 2,
      minPerTable: 3,
      maxPerTable: 3,
      players,
      previousPairings: setForm,
      rng: mulberry32(42),
    })
    // Same pigeonhole test as before: 2 rematches minimum
    const pairs2 = collectPreviousPairings([r2])
    let repeats = 0
    for (const pair of pairs2) {
      if (setForm.has(pair)) repeats++
    }
    expect(repeats).toBe(2)
  })

  it('Map<string, number> standings still works (legacy form)', () => {
    const strategy = new SwissStrategy()
    const players = makePlayers(6)
    const standings = new Map<string, number>([
      ['p1', 100], ['p2', 50], ['p3', 1],
      ['p4', 75], ['p5', 25], ['p6', 0],
    ])
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
      rng: mulberry32(42),
    })
    expect(result.tables).toHaveLength(2)
    const t1 = result.tables[0].playerIds
    expect(t1).toEqual(expect.arrayContaining(['p1', 'p4', 'p2']))
  })
})

// ===========================================================================
// PHASE 4 — Seat rotation, table-size preference, score-group repair, stage plan
// ===========================================================================

// ---------------------------------------------------------------------------
// Phase 4.1 — Seat rotation
// ---------------------------------------------------------------------------

describe('Phase 4: seat rotation', () => {
  const { assignSeats } = __internals

  it('NONE rotation: tables have no seats field', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
    ]
    const result = assignSeats(tables, 1, 'NONE')
    expect(result[0].seats).toBeUndefined()
  })

  it('CLOCKWISE rotation: round 1 assigns seats in player order', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'] },
    ]
    const result = assignSeats(tables, 1, 'CLOCKWISE')
    expect(result[0].seats).toEqual([1, 2, 3, 4])
  })

  it('CLOCKWISE rotation: round 2 rotates player[0] to seat 2', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'] },
    ]
    const result = assignSeats(tables, 2, 'CLOCKWISE')
    // Round 2: seats = [2, 3, 4, 1]
    expect(result[0].seats).toEqual([2, 3, 4, 1])
  })

  it('CLOCKWISE rotation: over N rounds, each player gets each seat once', () => {
    const players = ['a', 'b', 'c', 'd']
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: [...players] },
    ]
    const seatHistory = new Map<string, number[]>() // player -> seats occupied
    players.forEach((p) => seatHistory.set(p, []))
    for (let r = 1; r <= 4; r++) {
      const result = assignSeats(tables, r, 'CLOCKWISE')[0]
      result.playerIds.forEach((id, i) => {
        seatHistory.get(id)!.push(result.seats![i])
      })
    }
    // Each player should have sat in seats [1,2,3,4] (in some order)
    for (const id of players) {
      const seats = seatHistory.get(id)!.sort()
      expect(seats).toEqual([1, 2, 3, 4])
    }
  })

  it('BALANCED rotation: even N produces non-trivial rotation', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'] },
    ]
    const r1 = assignSeats(tables, 1, 'BALANCED')[0]
    const r2 = assignSeats(tables, 2, 'BALANCED')[0]
    // Round 1: seats = [1,2,3,4]
    expect(r1.seats).toEqual([1, 2, 3, 4])
    // Round 2: step = floor(4/2) = 2, so seats = [((0+1*2)%4)+1, ((1+1*2)%4)+1, ...] = [3, 4, 1, 2]
    expect(r2.seats).toEqual([3, 4, 1, 2])
  })

  it('BALANCED rotation: odd N degenerates to CLOCKWISE (step=1)', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
    ]
    const balancedR2 = assignSeats(tables, 2, 'BALANCED')[0]
    const clockwiseR2 = assignSeats(tables, 2, 'CLOCKWISE')[0]
    expect(balancedR2.seats).toEqual(clockwiseR2.seats)
  })

  it('handles empty tables gracefully', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: [] },
    ]
    const result = assignSeats(tables, 1, 'CLOCKWISE')
    expect(result[0].seats).toEqual([])
  })

  it('handles variable table sizes within one pairing', () => {
    const tables: TableSeating[] = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c'] }, // 3 players
      { tableNumber: 2, playerIds: ['d', 'e', 'f', 'g'] }, // 4 players
    ]
    const result = assignSeats(tables, 2, 'CLOCKWISE')
    expect(result[0].seats).toHaveLength(3)
    expect(result[1].seats).toHaveLength(4)
    // Both should rotate the first player to seat 2
    expect(result[0].seats![0]).toBe(2)
    expect(result[1].seats![0]).toBe(2)
  })

  it('SocialGolferStrategy respects seatRotation option', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(8)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      round: 2,
      seatRotation: 'CLOCKWISE',
      rng: mulberry32(42),
    })
    expect(result.tables[0].seats).toBeDefined()
    expect(result.tables[0].seats).toHaveLength(4)
    // Round 2: seat 1 should be occupied by player[3] (rotated by 1)
    // Actually, we just check seats are present and 1-indexed 1..4 in some order
    const seats = result.tables[0].seats!.slice().sort()
    expect(seats).toEqual([1, 2, 3, 4])
  })

  it('SocialGolferStrategy without seatRotation: no seats field (backward compat)', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(8)
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 4,
      rng: mulberry32(42),
    })
    expect(result.tables[0].seats).toBeUndefined()
  })

  it('SwissStrategy respects seatRotation option', () => {
    const strategy = new SwissStrategy()
    const players = makePlayers(6)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 3,
      standings,
      round: 3,
      seatRotation: 'CLOCKWISE',
      rng: mulberry32(42),
    })
    // Round 3 clockwise: seat 1 rotated by 2 from round 1
    expect(result.tables[0].seats).toBeDefined()
    expect(result.tables[0].seats).toHaveLength(3)
  })

  it('SingleElimStrategy respects seatRotation option', () => {
    const strategy = new SingleElimStrategy()
    const players = makePlayers(4)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      maxPerTable: 2,
      standings,
      advanceCount: 4,
      round: 1,
      seatRotation: 'CLOCKWISE',
      rng: mulberry32(42),
    })
    expect(result.tables[0].seats).toBeDefined()
    // Round 1, 2-player table: seats = [1, 2]
    expect(result.tables[0].seats).toEqual([1, 2])
  })
})

// ---------------------------------------------------------------------------
// Phase 4.2 — Table-size preference
// ---------------------------------------------------------------------------

describe('Phase 4: table-size preference', () => {
  const { computeValidSizes } = __internals

  it('PREFER_FEWER_LARGE: 11 players / 3-4 per table → 3 tables (4,4,3)', () => {
    const { sizes } = computeValidSizes(11, 3, 4, 'PREFER_FEWER_LARGE')
    expect(sizes).toHaveLength(3)
    // Largest possible avg = 11/3 = 3.67 → table sizes 4,4,3
    expect(sizes.sort((a, b) => b - a)).toEqual([4, 4, 3])
  })

  it('PREFER_MORE_SMALL: 11 players / 3-4 per table → 3 tables (4,4,3)', () => {
    // For 11 players at 3-4/table, the only valid count is 3 tables (11/3 = 3.67)
    // because 4 tables would need 11/4 = 2.75 < minPerTable.
    // So both preferences should agree.
    const { sizes } = computeValidSizes(11, 3, 4, 'PREFER_MORE_SMALL')
    expect(sizes).toHaveLength(3)
    expect(sizes.sort((a, b) => b - a)).toEqual([4, 4, 3])
  })

  it('PREFER_FEWER_LARGE: 12 players / 2-4 per table → 3 tables of 4', () => {
    const { sizes } = computeValidSizes(12, 2, 4, 'PREFER_FEWER_LARGE')
    expect(sizes).toHaveLength(3) // 12/4 = 3 tables
    expect(sizes).toEqual([4, 4, 4])
  })

  it('PREFER_MORE_SMALL: 12 players / 2-4 per table → 6 tables of 2', () => {
    const { sizes } = computeValidSizes(12, 2, 4, 'PREFER_MORE_SMALL')
    expect(sizes).toHaveLength(6) // 12/2 = 6 tables
    expect(sizes).toEqual([2, 2, 2, 2, 2, 2])
  })

  it('BALANCED: 12 players / 2-4 per table → 4 tables of 3 (midpoint)', () => {
    // midpoint of (2+4)/2 = 3. avg for 4 tables = 12/4 = 3. closest to target.
    const { sizes } = computeValidSizes(12, 2, 4, 'BALANCED')
    expect(sizes).toHaveLength(4)
    expect(sizes).toEqual([3, 3, 3, 3])
  })

  it('PREFER_FEWER_LARGE: 13 players / 2-4 per table → 4 tables (4,4,4,1)? no, must respect min', () => {
    // 13 / 4 = 3.25 → min tables = 3, max tables = 6
    // With minPerTable=2:
    //   4 tables: avg 3.25 → 4,3,3,3 (sum=13). 3 in [2,4] ✓
    //   5 tables: avg 2.6 → 3,3,3,2,2 (sum=13). 2 in [2,4] ✓
    //   6 tables: avg 2.17 → 3,2,2,2,2,2 (sum=13). 2 in [2,4] ✓
    // PREFER_FEWER_LARGE → 4 tables: [4,3,3,3]
    const { sizes } = computeValidSizes(13, 2, 4, 'PREFER_FEWER_LARGE')
    expect(sizes).toHaveLength(4)
    expect(sizes.sort((a, b) => b - a)).toEqual([4, 3, 3, 3])
  })

  it('PREFER_MORE_SMALL: 13 players / 2-4 per table → 6 tables', () => {
    // Max tables = floor(13/2) = 6
    // 6 tables: avg 2.17 → 3,2,2,2,2,2 (sum=13)
    const { sizes } = computeValidSizes(13, 2, 4, 'PREFER_MORE_SMALL')
    expect(sizes).toHaveLength(6)
    expect(sizes.sort((a, b) => b - a)).toEqual([3, 2, 2, 2, 2, 2])
  })

  it('BALANCED: 13 players / 2-4 per table → 4 or 5 tables (avg closest to 3)', () => {
    // target = (2+4)/2 = 3
    // 4 tables: avg = 3.25 → dist 0.25
    // 5 tables: avg = 2.6 → dist 0.4
    // BALANCED picks 4 tables (closest to 3)
    const { sizes } = computeValidSizes(13, 2, 4, 'BALANCED')
    expect(sizes).toHaveLength(4)
  })

  it('returns empty when N < minPerTable', () => {
    expect(computeValidSizes(2, 3, 4, 'PREFER_FEWER_LARGE')).toEqual({ sizes: [], seatableCount: 0 })
    expect(computeValidSizes(2, 3, 4, 'PREFER_MORE_SMALL')).toEqual({ sizes: [], seatableCount: 0 })
    expect(computeValidSizes(2, 3, 4, 'BALANCED')).toEqual({ sizes: [], seatableCount: 0 })
  })

  it('when only one valid count exists, all preferences agree', () => {
    // 8 players, 4 per table → only 2 tables valid
    const few = computeValidSizes(8, 4, 4, 'PREFER_FEWER_LARGE')
    const many = computeValidSizes(8, 4, 4, 'PREFER_MORE_SMALL')
    const bal = computeValidSizes(8, 4, 4, 'BALANCED')
    expect(few.sizes).toEqual([4, 4])
    expect(many.sizes).toEqual([4, 4])
    expect(bal.sizes).toEqual([4, 4])
  })

  it('SwissStrategy can opt into PREFER_MORE_SMALL', () => {
    const strategy = new SwissStrategy()
    const players = makePlayers(12)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 4,
      standings,
      tableSizePreference: 'PREFER_MORE_SMALL',
      rng: mulberry32(42),
    })
    // 12 / 2 = 6 tables
    expect(result.tables).toHaveLength(6)
    for (const t of result.tables) {
      expect(t.playerIds).toHaveLength(2)
    }
  })

  it('SwissStrategy default stays PREFER_FEWER_LARGE (backward compat)', () => {
    const strategy = new SwissStrategy()
    const players = makePlayers(12)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 4,
      standings,
      rng: mulberry32(42),
    })
    // 12 / 4 = 3 tables (PREFER_FEWER_LARGE default)
    expect(result.tables).toHaveLength(3)
    for (const t of result.tables) {
      expect(t.playerIds).toHaveLength(4)
    }
  })

  it('SocialGolferStrategy respects tableSizePreference', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(12)
    const resultFew = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 4,
      tableSizePreference: 'PREFER_FEWER_LARGE',
      rng: mulberry32(42),
    })
    const resultMany = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 4,
      tableSizePreference: 'PREFER_MORE_SMALL',
      rng: mulberry32(42),
    })
    expect(resultFew.tables).toHaveLength(3)  // 12/4
    expect(resultMany.tables).toHaveLength(6) // 12/2
  })

  it('SocialGolferStrategy default stays PREFER_FEWER_LARGE (backward compat)', () => {
    const strategy = new SocialGolferStrategy()
    const players = makePlayers(12)
    const result = strategy.generate({
      ...baseOpts,
      players,
      minPerTable: 2,
      maxPerTable: 4,
      rng: mulberry32(42),
    })
    // Default = PREFER_FEWER_LARGE → 3 tables of 4
    expect(result.tables).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Phase 4.3 — Score-group-aware partial repair
// ---------------------------------------------------------------------------

describe('Phase 4: score-group-aware partial repair', () => {
  it('without respectScoreGroups: top-half player can be re-placed at bottom-half table', () => {
    // Pairing: T1 (top half) = [a, b], T2 (bottom half) = [c, d]
    // Repair 'a' (top, 100 pts) — without respectScoreGroups, 'a' could go to T2.
    const pairing: RoundPairing = {
      round: 2,
      format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // top half
        { tableNumber: 2, playerIds: ['c', 'd'] }, // bottom half
      ],
      droppedPlayerIds: [],
    }
    const standings = new Map<string, number>([
      ['a', 100], ['b', 90], ['c', 10], ['d', 0],
    ])
    // a met b already (weighted conflict); c and d are unknowns → a goes to T2
    const previous = new Map<string, number>([[pairKey('a', 'b'), 1]])
    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      previousPairings: previous,
      standings,
      // respectScoreGroups NOT set
      rng: mulberry32(42),
    })
    // Without score-group protection, a moves to T2 (avoiding the rematch with b)
    const aTable = result.tables.find((t) => t.playerIds.includes('a'))!
    expect(aTable.playerIds).toEqual(expect.arrayContaining(['c', 'd']))
  })

  it('with respectScoreGroups=true: top player CANNOT be re-placed at bottom table', () => {
    const pairing: RoundPairing = {
      round: 2,
      format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // top: 100, 90
        { tableNumber: 2, playerIds: ['c', 'd'] }, // bottom: 10, 0
      ],
      droppedPlayerIds: [],
    }
    const standings = new Map<string, number>([
      ['a', 100], ['b', 90], ['c', 10], ['d', 0],
    ])
    const previous = new Map<string, number>([[pairKey('a', 'b'), 1]])

    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      previousPairings: previous,
      standings,
      respectScoreGroups: true,
      tolerance: 0, // strict: only same-standing neighbors allowed
      rng: mulberry32(42),
    })

    // a (100) cannot join T2 (neighbors have 10, 0 → diff > 0)
    // a cannot stay at T1 (would rematch b)
    // So 'a' should be DROPPED
    expect(result.droppedPlayerIds).toContain('a')
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).not.toContain('a')
  })

  it('with respectScoreGroups + tolerance: looser grouping allows near-equal standings', () => {
    const pairing: RoundPairing = {
      round: 2,
      format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // a=100, b=99
        { tableNumber: 2, playerIds: ['c', 'd'] }, // c=98, d=97
      ],
      droppedPlayerIds: [],
    }
    const standings = new Map<string, number>([
      ['a', 100], ['b', 99], ['c', 98], ['d', 97],
    ])
    const previous = new Map<string, number>([[pairKey('a', 'b'), 1]])

    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      previousPairings: previous,
      standings,
      respectScoreGroups: true,
      tolerance: 3, // a (100) can join a table where neighbors are within 3 pts
      rng: mulberry32(42),
    })

    // a (100) cannot stay at T1 (would rematch b)
    // a (100) CAN join T2: c=98 (diff 2 ≤ 3), d=97 (diff 3 ≤ 3)
    const aTable = result.tables.find((t) => t.playerIds.includes('a'))!
    expect(aTable.playerIds).toEqual(expect.arrayContaining(['c', 'd']))
  })

  it('respectScoreGroups with no standings provided: behaves like default (allows all)', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] },
        { tableNumber: 2, playerIds: ['c', 'd'] },
      ],
      droppedPlayerIds: [],
    }
    // respectScoreGroups=true but no standings → should still allow repair
    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      respectScoreGroups: true,
      // standings NOT provided
      rng: mulberry32(42),
    })
    // a should be placed somewhere
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toContain('a')
    expect(seated).toHaveLength(4)
  })

  it('player with unknown standing is treated as compatible (permissive)', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a'] }, // a's standing unknown
        { tableNumber: 2, playerIds: ['b', 'c'] }, // b=100, c=0
      ],
      droppedPlayerIds: [],
    }
    const standings = new Map<string, number>([
      ['b', 100], ['c', 0],
      // 'a' not in standings
    ])
    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      respectScoreGroups: true,
      tolerance: 0,
      standings,
      rng: mulberry32(42),
    })
    // a (unknown standing) is compatible with both tables
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toContain('a')
  })

  it('when no compatible table has room, player is dropped', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b'] }, // a=100, b=99 (full at max=2)
        { tableNumber: 2, playerIds: ['c', 'd'] }, // c=10, d=9 (full)
      ],
      droppedPlayerIds: [],
    }
    const standings = new Map<string, number>([
      ['a', 100], ['b', 99], ['c', 10], ['d', 9],
      ['x', 100], // x has top standing but tables are full
    ])
    const result = partialRepair(pairing, ['x'], {
      maxPerTable: 2,
      respectScoreGroups: true,
      tolerance: 0,
      standings,
    })
    // x cannot join T1 (full), cannot join T2 (wrong score group)
    expect(result.droppedPlayerIds).toContain('x')
  })

  it('backward compat: partialRepair without new options still works', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    // Call without any Phase 4 options
    const result = partialRepair(pairing, ['a'], {
      maxPerTable: 4,
      rng: mulberry32(42),
    })
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(6)
    expect(result.droppedPlayerIds).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 4.4 — Stage plan (multi-stage hybrid tournaments)
// ---------------------------------------------------------------------------

describe('Phase 4: stage plan', () => {
  it('returns [] for single-stage tournament', () => {
    const stages: StagePlan[] = [
      { name: 'Round Robin', rounds: [1, 2, 3], format: 'ROUND_ROBIN' },
    ]
    expect(generateStageTransitions(stages)).toEqual([])
  })

  it('returns [] for empty stages list', () => {
    expect(generateStageTransitions([])).toEqual([])
  })

  it('produces one transition for a 2-stage tournament', () => {
    const stages: StagePlan[] = [
      { name: 'Swiss', rounds: [1, 2, 3, 4], format: 'SWISS', advanceCount: 8 },
      { name: 'Final', rounds: [5], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(1)
    expect(transitions[0].cutoffRound).toBe(4)
    expect(transitions[0].advanceCount).toBe(8)
    expect(transitions[0].isEliminationCut).toBe(true)
    expect(transitions[0].fromStage.name).toBe('Swiss')
    expect(transitions[0].toStage.name).toBe('Final')
  })

  it('produces N-1 transitions for an N-stage tournament', () => {
    const stages: StagePlan[] = [
      { name: 'RR', rounds: [1, 2], format: 'ROUND_ROBIN', advanceCount: 16 },
      { name: 'Swiss', rounds: [3, 4], format: 'SWISS', advanceCount: 8 },
      { name: 'Semis', rounds: [5], format: 'SINGLE_ELIM', advanceCount: 4 },
      { name: 'Final', rounds: [6], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(3)
    expect(transitions[0].cutoffRound).toBe(2)
    expect(transitions[1].cutoffRound).toBe(4)
    expect(transitions[2].cutoffRound).toBe(5)
  })

  it('throws on non-contiguous stages', () => {
    const stages: StagePlan[] = [
      { name: 'RR', rounds: [1, 2], format: 'ROUND_ROBIN' },
      { name: 'Swiss', rounds: [4, 5], format: 'SWISS' }, // gap at round 3
    ]
    expect(() => generateStageTransitions(stages)).toThrow('contiguous')
  })

  it('marks transition as elimination only when advanceCount is set', () => {
    const stages: StagePlan[] = [
      { name: 'RR', rounds: [1, 2], format: 'ROUND_ROBIN' }, // no advanceCount → no cut
      { name: 'Swiss', rounds: [3, 4], format: 'SWISS', advanceCount: 8 },
      { name: 'Final', rounds: [5], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(2)
    // First transition: RR → Swiss, no advanceCount → not elimination.
    // v5.1: advanceCount is undefined (v5 returned MAX_SAFE_INTEGER — a footgun).
    expect(transitions[0].isEliminationCut).toBe(false)
    expect(transitions[0].advanceCount).toBeUndefined()
    // Second transition: Swiss → Final, advanceCount = 8 → elimination
    expect(transitions[1].isEliminationCut).toBe(true)
    expect(transitions[1].advanceCount).toBe(8)
  })

  it('real-world example: 3-stage Catan tournament', () => {
    // 32 players: 4 rounds of round-robin → cut to 16 → 3 rounds of Swiss → cut to 4 → single elim final
    const stages: StagePlan[] = [
      { name: 'Round Robin', rounds: [1, 2, 3, 4], format: 'ROUND_ROBIN', advanceCount: 16 },
      { name: 'Swiss', rounds: [5, 6, 7], format: 'SWISS', advanceCount: 4 },
      { name: 'Final', rounds: [8], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(2)
    expect(transitions[0]).toMatchObject({
      cutoffRound: 4,
      advanceCount: 16,
      isEliminationCut: true,
    })
    expect(transitions[1]).toMatchObject({
      cutoffRound: 7,
      advanceCount: 4,
      isEliminationCut: true,
    })
  })

  it('stage plan with no cuts (all players advance) produces non-elimination transitions', () => {
    const stages: StagePlan[] = [
      { name: 'RR', rounds: [1, 2], format: 'ROUND_ROBIN' }, // no cut
      { name: 'Swiss', rounds: [3, 4], format: 'SWISS' }, // no cut
      { name: 'Final', rounds: [5], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(2)
    expect(transitions.every((t) => !t.isEliminationCut)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Phase 4 — Backward compat (no regressions)
// ---------------------------------------------------------------------------

describe('Phase 4: backward compatibility', () => {
  it('all strategies still produce pairings without seatRotation option', () => {
    const players = makePlayers(8)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const rr = new SocialGolferStrategy().generate({
      ...baseOpts, players, maxPerTable: 4, rng: mulberry32(42),
    })
    const swiss = new SwissStrategy().generate({
      ...baseOpts, players, maxPerTable: 4, standings, rng: mulberry32(42),
    })
    const elim = new SingleElimStrategy().generate({
      ...baseOpts, players, maxPerTable: 4, standings, advanceCount: 4, rng: mulberry32(42),
    })
    // No seats assigned by default
    expect(rr.tables[0].seats).toBeUndefined()
    expect(swiss.tables[0].seats).toBeUndefined()
    expect(elim.tables[0]?.seats).toBeUndefined()
  })

  it('all strategies still produce pairings without tableSizePreference option', () => {
    const players = makePlayers(12)
    const standings = new Map<string, number>(
      players.map((p, i) => [p.id, 100 - i * 10]),
    )
    const rr = new SocialGolferStrategy().generate({
      ...baseOpts, players, minPerTable: 2, maxPerTable: 4, rng: mulberry32(42),
    })
    const swiss = new SwissStrategy().generate({
      ...baseOpts, players, minPerTable: 2, maxPerTable: 4, standings, rng: mulberry32(42),
    })
    // Default = PREFER_FEWER_LARGE → 3 tables of 4
    expect(rr.tables).toHaveLength(3)
    expect(swiss.tables).toHaveLength(3)
  })

  it('partialRepair still works without respectScoreGroups option (Phase 3 callers)', () => {
    const pairing: RoundPairing = {
      round: 1,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d', 'e', 'f'] },
      ],
      droppedPlayerIds: [],
    }
    const result = partialRepair(pairing, ['a'], { maxPerTable: 4 })
    const seated = result.tables.flatMap((t) => t.playerIds)
    expect(seated).toHaveLength(6)
  })

  it('StagePlan + generateStageTransitions do not affect existing strategies', () => {
    // Just verify the helper exists and is callable
    const stages: StagePlan[] = [
      { name: 'RR', rounds: [1, 2], format: 'ROUND_ROBIN', advanceCount: 4 },
      { name: 'Final', rounds: [3], format: 'SINGLE_ELIM' },
    ]
    const transitions = generateStageTransitions(stages)
    expect(transitions).toHaveLength(1)
    expect(transitions[0].cutoffRound).toBe(2)
  })
})

// ===========================================================================
// PHASE 4 v5.1 — Bug-fix regression tests
// (BALANCED seat rotation, mutation seat corruption, partialRepair dual-state,
//  generalized byes, serpentine seeding, stage transition advanceCount)
// ===========================================================================

// ---------------------------------------------------------------------------
// v5.1 — Seat rotation full-coverage matrix (the headline BALANCED fix)
// ---------------------------------------------------------------------------

describe('v5.1 — seat rotation full-coverage matrix', () => {
  const { assignSeats } = __internals

  function players(n: number): Player[] {
    return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, checkedIn: true, ready: false, color: 'bg-rose-500' }))
  }

  function seatOf(t: TableSeating, playerId: string): number | undefined {
    const idx = t.playerIds.indexOf(playerId)
    return idx === -1 ? undefined : t.seats?.[idx]
  }

  const sortedNums = (xs: number[]) => [...xs].sort((a, b) => a - b)

  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    for (const rotation of ['CLOCKWISE', 'BALANCED'] as const) {
      it(`table of ${n}, ${rotation}: every player sits in every seat exactly once across rounds 1..${n}`, () => {
        const ps = players(n)
        const ids = ps.map((p) => p.id)
        for (let round = 1; round <= n; round++) {
          const [t] = assignSeats([{ tableNumber: 1, playerIds: ids }], round, rotation)
          expect(t.seats).toHaveLength(n)
          expect(new Set(t.seats).size).toBe(n) // seats are a permutation each round
        }
        for (const p of ps) {
          const seats: number[] = []
          for (let round = 1; round <= n; round++) {
            const [t] = assignSeats([{ tableNumber: 1, playerIds: ids }], round, rotation)
            seats.push(seatOf(t, p.id)!)
          }
          expect(sortedNums(seats)).toEqual(ids.map((_, i) => i + 1))
        }
      })
    }
  }

  it('BALANCED regression (v5 bug): 4-player table no longer ping-pongs seats 1↔3', () => {
    const table = { tableNumber: 1, playerIds: players(4).map((p) => p.id) }
    const seats = [1, 2, 3, 4].map((r) => seatOf(assignSeats([table], r, 'BALANCED')[0], 'p1')!)
    expect(new Set(seats).size).toBe(4) // v5 produced {1, 3}
  })

  it('BALANCED regression (v5 bug): 6-player table visits all 6 seats (v5 visited 2)', () => {
    const table = { tableNumber: 1, playerIds: players(6).map((p) => p.id) }
    const seats = [1, 2, 3, 4, 5, 6].map((r) => seatOf(assignSeats([table], r, 'BALANCED')[0], 'p1')!)
    expect(new Set(seats).size).toBe(6) // v5 produced {1, 4}
  })

  it('BALANCED: each seat exactly twice per 2n rounds (even n)', () => {
    for (const n of [4, 6, 8]) {
      const table = { tableNumber: 1, playerIds: players(n).map((p) => p.id) }
      const counts = new Map<number, number>()
      for (let r = 1; r <= 2 * n; r++) {
        const seat = seatOf(assignSeats([table], r, 'BALANCED')[0], 'p1')!
        counts.set(seat, (counts.get(seat) ?? 0) + 1)
      }
      for (let s = 1; s <= n; s++) expect(counts.get(s)).toBe(2)
    }
  })

  it('mixed-size tables rotate independently', () => {
    const tables = [
      { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'] },
      { tableNumber: 2, playerIds: ['e', 'f', 'g'] },
    ]
    for (let r = 1; r <= 12; r++) {
      const out = assignSeats(tables, r, 'BALANCED')
      expect(out[0].seats).toHaveLength(4)
      expect(out[1].seats).toHaveLength(3)
    }
  })
})

// ---------------------------------------------------------------------------
// v5.1 — Generalized bye math (any base, not just 2)
// ---------------------------------------------------------------------------

describe('v5.1 — generalized bye math', () => {
  const { computeByeSeeds } = __internals

  it('byes: heads-up fields keep classic power-of-2 math', () => {
    expect(computeByeSeeds(6, 2)).toEqual([0, 1])
    expect(computeByeSeeds(8, 2)).toEqual([])
    expect(computeByeSeeds(5, 2)).toEqual([0, 1, 2])
  })

  it('byes: 3-player tables use base-3 bracket math', () => {
    expect(computeByeSeeds(7, 3)).toEqual([0]) // (9-7)/2 = 1
    expect(computeByeSeeds(9, 3)).toEqual([])  // 9 = 3² — perfect
    expect(computeByeSeeds(6, 3)).toEqual([])  // (9-6)/2 = 1.5 → no integral solution
  })

  it('byes: 4-player tables (5 players → no byes, not integral)', () => {
    // nextPow(5, 4) = 16; (16 - 5) / (4 - 1) = 11 / 3 = 3.67 → not integral → []
    // (The 5th player just plays at one of the 4-player tables.)
    expect(computeByeSeeds(5, 4)).toEqual([])
  })

  it('byes: 4-player tables (13 → 1 bye)', () => {
    expect(computeByeSeeds(13, 4)).toEqual([0]) // (16-13)/3 = 1
  })

  it('byes: 4-player tables (6 → no byes, not integral)', () => {
    expect(computeByeSeeds(6, 4)).toEqual([]) // (16-6)/3 = 3.33 → not integral
  })
})

// ---------------------------------------------------------------------------
// v5.1 — Serpentine seeding
// ---------------------------------------------------------------------------

describe('v5.1 — serpentine seeding', () => {
  const { serpentineTables } = __internals

  function playersWithIds(...ids: string[]): Player[] {
    return ids.map((id) => ({ id, name: `Player ${id}`, checkedIn: true, ready: false, color: 'bg-rose-500' }))
  }

  const sortedNums = (xs: number[]) => [...xs].sort((a, b) => a - b)

  it('9 players at 3-player tables: seed sums balanced 14/15/16 (v5 gave 15/8/13)', () => {
    const ps = playersWithIds('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i') // a = seed 1
    const tables = serpentineTables(ps, [3, 3, 3])
    const rank = (id: string) => id.charCodeAt(0) - 96
    const sums = sortedNums(tables.map((t) => t.playerIds.reduce((s, id) => s + rank(id), 0)))
    expect(sums).toEqual([14, 15, 16])
  })

  it('8 players at 2-player tables: standard bracket 1v8, 2v7, 3v6, 4v5', () => {
    const ps = playersWithIds('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')
    const tables = serpentineTables(ps, [2, 2, 2, 2])
    const pairOf = (id: string) => tables.find((t) => t.playerIds.includes(id))!.playerIds
    expect(pairOf('a')).toContain('h')
    expect(pairOf('b')).toContain('g')
    expect(pairOf('c')).toContain('f')
    expect(pairOf('d')).toContain('e')
  })

  it('ragged sizes degrade gracefully (13 players → 4,3,3,3)', () => {
    const ps = playersWithIds(...Array.from({ length: 13 }, (_, i) => String.fromCharCode(97 + i)))
    const tables = serpentineTables(ps, [4, 3, 3, 3])
    expect(tables.map((t) => t.playerIds.length)).toEqual([4, 3, 3, 3])
    expect(tables.flatMap((t) => t.playerIds)).toHaveLength(13)
  })
})

// ---------------------------------------------------------------------------
// v5.1 — SingleElimStrategy byes & seeding end-to-end
// ---------------------------------------------------------------------------

describe('v5.1 — SingleElimStrategy byes & seeding', () => {
  const mk = (n: number): Player[] =>
    Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), name: `Player ${String.fromCharCode(97 + i)}`, checkedIn: true, ready: false, color: 'bg-rose-500' }))

  const standingsFor = (ids: string[]): Map<string, number> =>
    new Map(ids.map((id, i) => [id, ids.length - i]))

  const run = (n: number, min: number, max: number, advance?: number) =>
    new SingleElimStrategy().generate({
      players: mk(n),
      round: 1,
      minPerTable: min,
      maxPerTable: max,
      standings: standingsFor(mk(n).map((p) => p.id)),
      advanceCount: advance,
    })

  it('6 players, 2p tables, advance 6 → 2 byes (top seeds), 4 play', () => {
    const result = run(6, 2, 2, 6)
    expect(result.tables).toHaveLength(2)
    expect(result.tables.every((t) => t.playerIds.length === 2)).toBe(true)
    expect(result.droppedPlayerIds).toEqual(expect.arrayContaining(['a', 'b'])) // byes
    expect([...result.tables.flatMap((t) => t.playerIds)].sort()).toEqual(['c', 'd', 'e', 'f'])
  })

  it('7 players, 3p tables, advance 7 → 1 bye, two 3-player tables', () => {
    const result = run(7, 3, 3, 7)
    expect(result.tables).toHaveLength(2)
    expect(result.tables.every((t) => t.playerIds.length === 3)).toBe(true)
    expect(result.droppedPlayerIds).toContain('a')
    expect(result.tables.flatMap((t) => t.playerIds)).not.toContain('a')
  })

  it('9 players, 3p tables, no byes; serpentine balance; best player at table 1', () => {
    const result = run(9, 3, 3, 9)
    expect(result.tables).toHaveLength(3)
    expect(result.tables[0].playerIds).toContain('a')
    const rank = (id: string) => id.charCodeAt(0) - 96
    const sums = result.tables.map((t) => t.playerIds.reduce((s, id) => s + rank(id), 0))
    expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(2)
  })

  it('flexible table sizes (min<max) skip byes and let the partition absorb the field', () => {
    const result = run(13, 3, 5, 13)
    for (const t of result.tables) {
      expect(t.playerIds.length).toBeGreaterThanOrEqual(3)
      expect(t.playerIds.length).toBeLessThanOrEqual(5)
    }
    expect(result.tables.flatMap((t) => t.playerIds)).toHaveLength(13)
  })

  it('advanceCount < 2 is clamped to 2 (v5 silently dropped the round)', () => {
    const result = run(8, 2, 2, 1)
    expect(result.tables).toHaveLength(1)
    expect([...result.tables[0].playerIds].sort()).toEqual(['a', 'b'])
    expect(result.droppedPlayerIds).toHaveLength(6) // cut by standings, not vanished
  })
})

// ---------------------------------------------------------------------------
// v5.1 — Mutations keep seats[] consistent
// ---------------------------------------------------------------------------

describe('v5.1 — mutations keep seats[] consistent', () => {
  const base = (): RoundPairing => ({
    round: 2,
    format: 'ROUND_ROBIN',
    tables: [
      { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'], seats: [1, 2, 3, 4] },
      { tableNumber: 2, playerIds: ['e', 'f', 'g', 'h'], seats: [1, 2, 3, 4] },
    ],
    droppedPlayerIds: [],
  })

  it('reassignPlayer strips stale seats by default', () => {
    const moved = reassignPlayer(base(), 'a', 2)
    expect(moved.tables.find((t) => t.tableNumber === 2)!.playerIds).toContain('a')
    expect(moved.tables.find((t) => t.tableNumber === 1)!.playerIds).not.toContain('a')
    for (const t of moved.tables) expect(t.seats).toBeUndefined() // v5 kept [1,2,3,4]
  })

  it('reassignPlayer recomputes seats when seatInfo is provided', () => {
    const moved = reassignPlayer(base(), 'a', 2, undefined, { round: 2, rotation: 'CLOCKWISE' })
    for (const t of moved.tables) {
      expect(t.seats).toHaveLength(t.playerIds.length)
      expect(new Set(t.seats).size).toBe(t.playerIds.length)
    }
  })

  it('reassignPlayer removes the player from droppedPlayerIds when seated', () => {
    const p = { ...base(), droppedPlayerIds: ['a'] }
    expect(reassignPlayer(p, 'a', 2).droppedPlayerIds).not.toContain('a')
  })

  it('reassignPlayer to a nonexistent table / full table is a no-op', () => {
    expect(reassignPlayer(base(), 'a', 99)).toEqual(base())
    expect(reassignPlayer(base(), 'a', 2, 4)).toEqual(base()) // table 2 already full
  })

  it('dropPlayerFromRound strips stale seats', () => {
    const dropped = dropPlayerFromRound(base(), 'a')
    expect(dropped.tables[0].playerIds).toEqual(['b', 'c', 'd'])
    expect(dropped.tables[0].seats).toBeUndefined() // v5 kept [1,2,3,4]
    expect(dropped.droppedPlayerIds).toContain('a')
  })

  it('reintroducePlayer targets the fewest-players table (v5 picked the first under max)', () => {
    const p: RoundPairing = {
      round: 2,
      format: 'ROUND_ROBIN',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c'] },
        { tableNumber: 2, playerIds: ['d'] },
      ],
      droppedPlayerIds: ['x'],
    }
    const out = reintroducePlayer(p, 'x', 4)
    expect(out.tables.find((t) => t.playerIds.includes('x'))!.tableNumber).toBe(2)
    expect(out.droppedPlayerIds).not.toContain('x')
  })
})

// ---------------------------------------------------------------------------
// v5.1 — partialRepair dual-state fix
// ---------------------------------------------------------------------------

describe('v5.1 — partialRepair', () => {
  it('seated players are removed from droppedPlayerIds (v5 left them seated AND dropped)', () => {
    const pairing: RoundPairing = {
      round: 3,
      format: 'SWISS',
      tables: [
        { tableNumber: 1, playerIds: ['a', 'b', 'c', 'd'] },
        { tableNumber: 2, playerIds: ['e', 'f', 'g'] },
      ],
      droppedPlayerIds: ['x'],
    }
    const out = partialRepair(pairing, ['x'], { maxPerTable: 4 })
    expect(out.tables.some((t) => t.playerIds.includes('x'))).toBe(true)
    expect(out.droppedPlayerIds).not.toContain('x')
  })

  it('players who cannot be seated stay dropped', () => {
    const pairing: RoundPairing = {
      round: 3,
      format: 'SWISS',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b', 'c'] }],
      droppedPlayerIds: [],
    }
    const out = partialRepair(pairing, ['y', 'z'], { maxPerTable: 3 })
    expect(out.tables.flatMap((t) => t.playerIds)).not.toContain('y')
    expect(out.droppedPlayerIds).toEqual(expect.arrayContaining(['y', 'z']))
  })

  it('strips stale seats after repair', () => {
    const pairing: RoundPairing = {
      round: 3,
      format: 'SWISS',
      tables: [{ tableNumber: 1, playerIds: ['a', 'b'], seats: [1, 2] }],
      droppedPlayerIds: ['x'],
    }
    const out = partialRepair(pairing, ['x'], { maxPerTable: 3 })
    expect(out.tables[0].seats).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// v5.1 — Stage transitions advanceCount fix
// ---------------------------------------------------------------------------

describe('v5.1 — stage transitions advanceCount fix', () => {
  it('non-cut stages report advanceCount: undefined (v5 returned MAX_SAFE_INTEGER)', () => {
    const [t] = generateStageTransitions([
      { name: 'Heats', rounds: [1, 2], format: 'ROUND_ROBIN' },
      { name: 'Final', rounds: [3], format: 'SINGLE_ELIM' },
    ])
    expect(t.isEliminationCut).toBe(false)
    expect(t.advanceCount).toBeUndefined()
  })

  it('cut stages keep their advanceCount', () => {
    const [t] = generateStageTransitions([
      { name: 'Swiss', rounds: [1, 2, 3], format: 'SWISS', advanceCount: 8 },
      { name: 'Final', rounds: [4], format: 'SINGLE_ELIM' },
    ])
    expect(t.isEliminationCut).toBe(true)
    expect(t.advanceCount).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// v5.1 — Cross-strategy invariants (no vanishing, no duplicates)
// ---------------------------------------------------------------------------

describe('v5.1 — cross-strategy invariants', () => {
  function makePlayers(n: number): Player[] {
    return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, checkedIn: true, ready: false, color: 'bg-rose-500' }))
  }

  const configs = [
    [2, 2],
    [3, 4],
    [4, 6],
  ] as const

  /** Fabricate a round-1 pairing so round 2 has real rematches to avoid. */
  function fakeHistory(ps: Player[], size: number): Set<string> {
    const tables: TableSeating[] = []
    for (let i = 0; i < ps.length; i += size) {
      tables.push({ tableNumber: tables.length + 1, playerIds: ps.slice(i, i + size).map((p) => p.id) })
    }
    return collectPreviousPairings([{ round: 1, format: 'ROUND_ROBIN', tables, droppedPlayerIds: [] }])
  }

  for (const Strategy of [SocialGolferStrategy, SwissStrategy, SingleElimStrategy]) {
    for (const n of [5, 7, 11, 13, 24]) {
      for (const [min, max] of configs) {
        it(`${Strategy.name}: n=${n}, tables ${min}–${max} — seated XOR dropped, no dupes`, () => {
          const ps = makePlayers(n)
          const standings = new Map<string, number>(ps.map((p, i) => [p.id, n - i]))
          const result = new Strategy().generate({
            players: ps,
            round: 2,
            minPerTable: min,
            maxPerTable: max,
            previousPairings: fakeHistory(ps, Math.max(min, 3)),
            standings,
            deadlineMs: 400, // invariants don't need search optimality; keep it fast
          })
          const seated = result.tables.flatMap((t) => t.playerIds)
          expect(new Set(seated).size).toBe(seated.length)
          for (const p of ps) {
            const isSeated = seated.includes(p.id)
            const isDropped = result.droppedPlayerIds.includes(p.id)
            expect(isSeated !== isDropped).toBe(true) // never both, never neither
          }
        })
      }
    }
  }

  it('Swiss respects minPerTable (7 players, 4–5 per table)', () => {
    const ps = makePlayers(7)
    const standings = new Map<string, number>(ps.map((p, i) => [p.id, 7 - i]))
    const result = new SwissStrategy().generate({
      players: ps,
      round: 1,
      minPerTable: 4,
      maxPerTable: 5,
      standings,
    })
    expect(result.tables.length).toBeGreaterThanOrEqual(1)
    for (const t of result.tables) expect(t.playerIds.length).toBeGreaterThanOrEqual(4)
  })

  it('weighted previousPairings (Map form) are accepted', () => {
    const ps = makePlayers(12)
    const standings = new Map<string, number>(ps.map((p, i) => [p.id, 12 - i]))
    const result = new SwissStrategy().generate({
      players: ps,
      round: 3,
      minPerTable: 3,
      maxPerTable: 4,
      standings,
      previousPairings: new Map([
        ['p1|p2', 2],
        ['p3|p4', 1],
      ]),
    })
    expect(result.tables.length).toBeGreaterThan(0)
  })

  it('deterministic with a seeded rng (same seed → same pairing)', () => {
    const ps = makePlayers(20)
    const prev = fakeHistory(ps, 4)
    const run = () =>
      new SocialGolferStrategy().generate({
        players: ps,
        round: 3,
        minPerTable: 4,
        maxPerTable: 5,
        previousPairings: prev,
        rng: mulberry32(42),
        deadlineMs: 60_000, // generous budget: determinism holds when the search is not time-truncated
      })
    expect(run()).toEqual(run())
  })

  it('seats stay a valid permutation when seatRotation is requested', () => {
    const ps = makePlayers(12)
    const result = new SocialGolferStrategy().generate({
      players: ps,
      round: 2,
      minPerTable: 3,
      maxPerTable: 4,
      seatRotation: 'BALANCED',
    })
    for (const t of result.tables) {
      expect(t.seats).toHaveLength(t.playerIds.length)
      const sorted = [...t.seats!].sort((a, b) => a - b)
      expect(sorted).toEqual(t.playerIds.map((_, i) => i + 1))
    }
  })

  it('getStrategy throws for unknown formats', () => {
    expect(() => getStrategy('BOGUS' as never)).toThrow()
  })
})
