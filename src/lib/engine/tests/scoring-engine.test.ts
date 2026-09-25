/**
 * Tests for the scoring engine — modifiers, placement scoring, and the
 * standings aggregator with all 5 tiebreaker methods.
 *
 * Run with `npm test`.
 */
import { describe, it, expect } from 'vitest'
import {
  applyModifier,
  scorePlacement,
  scoreTable,
  aggregateStandings,
  computeTablePointsTotal,
  mergeModifiers,
} from '../scoring-engine'
import type {
  ScoringRules,
  ScoreModifierConfig,
  PlacementScore,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultRules: ScoringRules = {
  placementPoints: [10, 6, 3, 1],
  modifiers: [],
  tiebreakers: [],
}

function mod(partial: Partial<ScoreModifierConfig>): ScoreModifierConfig {
  return {
    id: partial.id || 'mod_test',
    type: partial.type || 'FLAT_BONUS',
    label: partial.label || 'Test',
    value: partial.value ?? 0,
    appliesTo: partial.appliesTo ?? 'ALL',
  }
}

// ---------------------------------------------------------------------------
// applyModifier
// ---------------------------------------------------------------------------

describe('applyModifier', () => {
  const ctx = {
    playerId: 'p1',
    placement: 1,
    gamePoints: 20,
    round: 2,
    totalRounds: 4,
    attended: true,
  }

  it('ATTENDANCE_BONUS adds value when attended', () => {
    expect(applyModifier(mod({ type: 'ATTENDANCE_BONUS', value: 2 }), 10, ctx)).toBe(2)
  })

  it('ATTENDANCE_BONUS adds 0 when not attended', () => {
    expect(applyModifier(mod({ type: 'ATTENDANCE_BONUS', value: 2 }), 10, { ...ctx, attended: false })).toBe(0)
  })

  it('FINAL_ROUND_MULTIPLIER only fires on the last round', () => {
    // round 2 of 4 — not the final → no delta
    expect(applyModifier(mod({ type: 'FINAL_ROUND_MULTIPLIER', value: 2 }), 10, ctx)).toBe(0)
    // round 4 of 4 — final → delta = total * (value-1) = 10 * 1 = 10
    expect(applyModifier(mod({ type: 'FINAL_ROUND_MULTIPLIER', value: 2 }), 10, { ...ctx, round: 4 })).toBe(10)
  })

  it('FINAL_ROUND_MULTIPLIER is a no-op when totalRounds is 1', () => {
    // Avoids "every round is final" edge case
    expect(applyModifier(mod({ type: 'FINAL_ROUND_MULTIPLIER', value: 2 }), 10, { ...ctx, round: 1, totalRounds: 1 })).toBe(0)
  })

  it('FLAT_BONUS adds value regardless of round', () => {
    expect(applyModifier(mod({ type: 'FLAT_BONUS', value: 5 }), 10, ctx)).toBe(5)
    expect(applyModifier(mod({ type: 'FLAT_BONUS', value: 5 }), 10, { ...ctx, round: 4 })).toBe(5)
  })

  it('MULTIPLIER applies (value-1) * currentTotal', () => {
    // value=2 doubles → delta = 10 * 1 = 10
    expect(applyModifier(mod({ type: 'MULTIPLIER', value: 2 }), 10, ctx)).toBe(10)
    // value=3 triples → delta = 10 * 2 = 20
    expect(applyModifier(mod({ type: 'MULTIPLIER', value: 3 }), 10, ctx)).toBe(20)
    // value=1 → no change
    expect(applyModifier(mod({ type: 'MULTIPLIER', value: 1 }), 10, ctx)).toBe(0)
  })

  it('CUSTOM adds a flat value (alias for FLAT_BONUS)', () => {
    expect(applyModifier(mod({ type: 'CUSTOM', value: 7 }), 10, ctx)).toBe(7)
  })

  it('skips modifiers that target a different round', () => {
    expect(applyModifier(mod({ type: 'FLAT_BONUS', value: 5, appliesTo: 3 }), 10, ctx)).toBe(0)
  })

  it('applies modifiers with appliesTo "ALL" to every round', () => {
    expect(applyModifier(mod({ type: 'FLAT_BONUS', value: 5, appliesTo: 'ALL' }), 10, ctx)).toBe(5)
    expect(applyModifier(mod({ type: 'FLAT_BONUS', value: 5, appliesTo: 'ALL' }), 10, { ...ctx, round: 4 })).toBe(5)
  })

  it('rounds MULTIPLIER delta to nearest integer', () => {
    // 10 * (1.5 - 1) = 5
    expect(applyModifier(mod({ type: 'MULTIPLIER', value: 1.5 }), 10, ctx)).toBe(5)
    // 7 * (1.5 - 1) = 3.5 → rounds to 4 (Math.round)
    expect(applyModifier(mod({ type: 'MULTIPLIER', value: 1.5 }), 7, ctx)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// scorePlacement
// ---------------------------------------------------------------------------

describe('scorePlacement', () => {
  it('returns basePoints from placementPoints array', () => {
    const result = scorePlacement(
      { playerId: 'p1', placement: 1, gamePoints: 0, round: 1, totalRounds: 4, attended: true },
      { ...defaultRules, placementPoints: [10, 6, 3, 1] },
    )
    expect(result.basePoints).toBe(10)
    expect(result.total).toBe(10)
    expect(result.bonus).toBe(0)
  })

  it('returns 0 basePoints for placement beyond the array length', () => {
    const result = scorePlacement(
      { playerId: 'p1', placement: 6, gamePoints: 0, round: 1, totalRounds: 4, attended: true },
      { ...defaultRules, placementPoints: [10, 6, 3, 1] },
    )
    expect(result.basePoints).toBe(0)
  })

  it('includes gamePoints in the result but not in total', () => {
    // total = basePoints + bonus (gamePoints tracked separately for tiebreaking)
    const result = scorePlacement(
      { playerId: 'p1', placement: 1, gamePoints: 42, round: 1, totalRounds: 4, attended: true },
      defaultRules,
    )
    expect(result.gamePoints).toBe(42)
    expect(result.total).toBe(10) // basePoints only
  })

  it('stacks multiple modifiers in order', () => {
    const rules: ScoringRules = {
      placementPoints: [10],
      modifiers: [
        mod({ type: 'FLAT_BONUS', value: 5 }),
        mod({ type: 'FLAT_BONUS', value: 3 }),
      ],
      tiebreakers: [],
    }
    const result = scorePlacement(
      { playerId: 'p1', placement: 1, gamePoints: 0, round: 1, totalRounds: 4, attended: true },
      rules,
    )
    // total = 10 + 5 + 3 = 18, bonus = 8
    expect(result.total).toBe(18)
    expect(result.bonus).toBe(8)
  })

  it('applies FINAL_ROUND_MULTIPLIER to the running total at the time', () => {
    const rules: ScoringRules = {
      placementPoints: [10],
      modifiers: [
        mod({ type: 'FLAT_BONUS', value: 5 }),       // total now 15
        mod({ type: 'FINAL_ROUND_MULTIPLIER', value: 2 }), // 15 * 1 = 15 → total 30
      ],
      tiebreakers: [],
    }
    const result = scorePlacement(
      { playerId: 'p1', placement: 1, gamePoints: 0, round: 4, totalRounds: 4, attended: true },
      rules,
    )
    expect(result.total).toBe(30)
    expect(result.bonus).toBe(20) // 5 + 15
  })

  it('respects extraModifiers override (replaces event-level modifiers)', () => {
    const eventMods = [mod({ type: 'FLAT_BONUS', value: 100 })]
    const roundMods = [mod({ type: 'FLAT_BONUS', value: 5 })]
    const rules: ScoringRules = {
      placementPoints: [10],
      modifiers: eventMods,
      tiebreakers: [],
    }
    const result = scorePlacement(
      { playerId: 'p1', placement: 1, gamePoints: 0, round: 1, totalRounds: 4, attended: true },
      rules,
      roundMods,
    )
    // eventMods are ignored, only roundMods apply
    expect(result.total).toBe(15) // 10 + 5
  })
})

// ---------------------------------------------------------------------------
// scoreTable
// ---------------------------------------------------------------------------

describe('scoreTable', () => {
  it('scores every placement in the table', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 30 },
      { playerId: 'b', placement: 2, gamePoints: 20 },
      { playerId: 'c', placement: 3, gamePoints: 10 },
    ]
    const result = scoreTable(placements, 1, 4, defaultRules)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ playerId: 'a', basePoints: 10, total: 10 })
    expect(result[1]).toMatchObject({ playerId: 'b', basePoints: 6, total: 6 })
    expect(result[2]).toMatchObject({ playerId: 'c', basePoints: 3, total: 3 })
  })

  it('passes gamePoints through to each PlacementScore', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 42 },
    ]
    const result = scoreTable(placements, 1, 4, defaultRules)
    expect(result[0].gamePoints).toBe(42)
  })

  it('handles empty input', () => {
    expect(scoreTable([], 1, 4, defaultRules)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// computeTablePointsTotal
// ---------------------------------------------------------------------------

describe('computeTablePointsTotal', () => {
  it('sums gamePoints across all placements', () => {
    const placements: PlacementScore[] = [
      { playerId: 'a', placement: 1, gamePoints: 30, basePoints: 10, bonus: 0, total: 10 },
      { playerId: 'b', placement: 2, gamePoints: 20, basePoints: 6, bonus: 0, total: 6 },
      { playerId: 'c', placement: 3, gamePoints: 10, basePoints: 3, bonus: 0, total: 3 },
    ]
    expect(computeTablePointsTotal(placements)).toBe(60)
  })

  it('returns 0 for empty placements', () => {
    expect(computeTablePointsTotal([])).toBe(0)
  })

  it('treats undefined gamePoints as 0', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: undefined as unknown as number, basePoints: 10, bonus: 0, total: 10 },
    ]
    expect(computeTablePointsTotal(placements)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// mergeModifiers
// ---------------------------------------------------------------------------

describe('mergeModifiers', () => {
  it('returns event-level modifiers when round has no overrides', () => {
    const eventMods = [mod({ id: 'e1', value: 1 })]
    expect(mergeModifiers(eventMods, [])).toBe(eventMods)
  })

  it('replaces event-level modifiers with round overrides when present', () => {
    const eventMods = [mod({ id: 'e1', value: 1 })]
    const roundMods = [mod({ id: 'r1', value: 2 })]
    expect(mergeModifiers(eventMods, roundMods)).toBe(roundMods)
  })
})

// ---------------------------------------------------------------------------
// aggregateStandings
// ---------------------------------------------------------------------------

describe('aggregateStandings', () => {
  // Helper: build a single round's score data for the aggregator
  function tableScore(
    round: number,
    tableNumber: number,
    placements: Array<{ playerId: string; placement: number; gamePoints: number; total: number }>,
    tablePointsTotal: number,
    state: 'LOCKED' | 'DISPUTED' | 'PENDING_CONFIRM' | 'MISSING' = 'LOCKED',
  ) {
    return {
      round,
      tableNumber,
      tablePointsTotal,
      state,
      placements: placements.map((p) => ({
        playerId: p.playerId,
        placement: p.placement,
        gamePoints: p.gamePoints,
        basePoints: 0, // not used by aggregator
        bonus: 0,
        total: p.total,
      })),
    }
  }

  it('sums totals across rounds for each player', () => {
    const scores = [
      tableScore(1, 1, [
        { playerId: 'a', placement: 1, gamePoints: 10, total: 10 },
        { playerId: 'b', placement: 2, gamePoints: 5, total: 6 },
      ], 15),
      tableScore(2, 1, [
        { playerId: 'a', placement: 1, gamePoints: 8, total: 10 },
        { playerId: 'b', placement: 2, gamePoints: 7, total: 6 },
      ], 15),
    ]
    const standings = aggregateStandings(['a', 'b'], scores, defaultRules)
    expect(standings).toHaveLength(2)

    const a = standings.find((s) => s.playerId === 'a')!
    const b = standings.find((s) => s.playerId === 'b')!
    expect(a.total).toBe(20) // 10 + 10
    expect(b.total).toBe(12) // 6 + 6
  })

  it('sorts by total descending', () => {
    const scores = [
      tableScore(1, 1, [
        { playerId: 'a', placement: 1, gamePoints: 10, total: 10 },
        { playerId: 'b', placement: 2, gamePoints: 5, total: 6 },
        { playerId: 'c', placement: 3, gamePoints: 0, total: 3 },
      ], 15),
    ]
    const standings = aggregateStandings(['a', 'b', 'c'], scores, defaultRules)
    expect(standings.map((s) => s.playerId)).toEqual(['a', 'b', 'c'])
  })

  it('skips scores that are not LOCKED or DISPUTED', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 10, total: 10 }], 10, 'LOCKED'),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 99, total: 99 }], 99, 'PENDING_CONFIRM'),
      tableScore(3, 1, [{ playerId: 'a', placement: 1, gamePoints: 50, total: 50 }], 50, 'MISSING'),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    // Only round 1 should count
    expect(standings[0].total).toBe(10)
    expect(standings[0].rounds).toBe(1)
  })

  it('includes DISPUTED scores in the standings', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 10, total: 10 }], 10, 'LOCKED'),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 20, total: 20 }], 20, 'DISPUTED'),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].total).toBe(30)
    expect(standings[0].rounds).toBe(2)
  })

  it('tracks gamePointsTotal across rounds', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 10, total: 10 }], 10),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 25, total: 10 }], 25),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].gamePointsTotal).toBe(35)
  })

  it('tracks accumulatedTablePoints (sum of tablePointsTotal for tables played)', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 10, total: 10 }], 30),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 5, total: 10 }], 20),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].accumulatedTablePoints).toBe(50) // 30 + 20
  })

  it('counts first places', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 2, gamePoints: 0, total: 6 }], 0),
      tableScore(3, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].firstPlaceCount).toBe(2)
  })

  it('tracks bestPlacement (lowest placement number)', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 3, gamePoints: 0, total: 3 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(3, 1, [{ playerId: 'a', placement: 2, gamePoints: 0, total: 6 }], 0),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].bestPlacement).toBe(1)
  })

  it('returns bestPlacement=0 when player has no scores', () => {
    const standings = aggregateStandings(['a'], [], defaultRules)
    expect(standings[0].bestPlacement).toBe(0)
  })

  it('computes dropWorstTotal = total minus lowest single-round total', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 3, gamePoints: 0, total: 3 }], 0), // worst
      tableScore(3, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    expect(standings[0].dropWorstTotal).toBe(20) // 10 + 10, drop the 3
  })

  it('drops only ONE round (the single lowest), not all ties for lowest', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 3, gamePoints: 0, total: 3 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 3, gamePoints: 0, total: 3 }], 0),
      tableScore(3, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    // Two rounds tied at 3 — only ONE is dropped
    expect(standings[0].dropWorstTotal).toBe(13) // 3 + 10
  })

  it('exposes perRound breakdown for each round played', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 10, total: 10 }], 30),
      tableScore(2, 2, [{ playerId: 'a', placement: 2, gamePoints: 5, total: 6 }], 20),
    ]
    const standings = aggregateStandings(['a'], scores, defaultRules)
    const perRound = standings[0].perRound
    expect(perRound[1]).toEqual({ total: 10, gamePoints: 10, placement: 1, table: 1, tablePoints: 30 })
    expect(perRound[2]).toEqual({ total: 6, gamePoints: 5, placement: 2, table: 2, tablePoints: 20 })
  })

  // -----------------------------------------------------------------
  // Tiebreakers
  // -----------------------------------------------------------------

  it('breaks ties with TOTAL_GAME_POINTS (higher wins)', () => {
    // Both players have total=10, but 'a' has more game points
    const scores = [
      tableScore(1, 1, [
        { playerId: 'a', placement: 1, gamePoints: 50, total: 10 },
        { playerId: 'b', placement: 1, gamePoints: 30, total: 10 },
      ], 0),
    ]
    const rules: ScoringRules = { ...defaultRules, tiebreakers: ['TOTAL_GAME_POINTS'] }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    expect(standings[0].playerId).toBe('a')
  })

  it('breaks ties with TABLE_STRENGTH (higher accumulatedTablePoints wins)', () => {
    // Both players have total=10, both have 0 game points (so TOTAL_GAME_POINTS ties).
    // 'a' played at stronger tables.
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 100),
      tableScore(1, 2, [{ playerId: 'b', placement: 1, gamePoints: 0, total: 10 }], 50),
    ]
    const rules: ScoringRules = { ...defaultRules, tiebreakers: ['TABLE_STRENGTH'] }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    expect(standings[0].playerId).toBe('a')
  })

  it('breaks ties with FIRST_PLACES (more 1sts wins)', () => {
    // Both have total=20, but 'a' has two 1sts vs 'b' one 1st
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(1, 2, [{ playerId: 'b', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 2, [{ playerId: 'b', placement: 2, gamePoints: 0, total: 10 }], 0),
    ]
    const rules: ScoringRules = { ...defaultRules, tiebreakers: ['FIRST_PLACES'] }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    expect(standings[0].playerId).toBe('a')
  })

  it('breaks ties with BEST_PLACEMENT (lower placement number wins)', () => {
    // Both have total=10, both have 0 game points and 1 first place.
    // 'a' once placed 1st; 'b' never placed above 2nd.
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(1, 2, [{ playerId: 'b', placement: 2, gamePoints: 0, total: 10 }], 0),
    ]
    const rules: ScoringRules = { ...defaultRules, tiebreakers: ['BEST_PLACEMENT'] }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    expect(standings[0].playerId).toBe('a')
  })

  it('breaks ties with DROP_WORST_ROUND (higher dropWorstTotal wins)', () => {
    // Both have total=13 from 3 rounds.
    // 'a': rounds 10, 3, 0 → dropWorst = 13
    // 'b': rounds 5, 5, 3 → dropWorst = 10
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 3, gamePoints: 0, total: 3 }], 0),
      tableScore(3, 1, [{ playerId: 'a', placement: 4, gamePoints: 0, total: 0 }], 0),
      tableScore(1, 2, [{ playerId: 'b', placement: 2, gamePoints: 0, total: 5 }], 0),
      tableScore(2, 2, [{ playerId: 'b', placement: 2, gamePoints: 0, total: 5 }], 0),
      tableScore(3, 2, [{ playerId: 'b', placement: 3, gamePoints: 0, total: 3 }], 0),
    ]
    const rules: ScoringRules = { ...defaultRules, tiebreakers: ['DROP_WORST_ROUND'] }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    expect(standings[0].playerId).toBe('a')
  })

  it('applies tiebreakers in priority order — first that breaks the tie wins', () => {
    // Two players tied on total. TOTAL_GAME_POINTS will resolve it.
    // Even though FIRST_PLACES would also resolve it the OTHER way,
    // TOTAL_GAME_POINTS wins because it's listed first.
    const scores = [
      // 'a': 1 game point total, but two 1st places
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
      tableScore(2, 1, [{ playerId: 'a', placement: 1, gamePoints: 1, total: 10 }], 0),
      // 'b': 5 game points total, but zero 1st places (always 2nd)
      tableScore(1, 2, [{ playerId: 'b', placement: 2, gamePoints: 5, total: 10 }], 0),
      tableScore(2, 2, [{ playerId: 'b', placement: 2, gamePoints: 0, total: 10 }], 0),
    ]
    const rules: ScoringRules = {
      ...defaultRules,
      tiebreakers: ['TOTAL_GAME_POINTS', 'FIRST_PLACES'],
    }
    const standings = aggregateStandings(['a', 'b'], scores, rules)
    // 'b' has more game points (5 > 1) → wins by TOTAL_GAME_POINTS
    expect(standings[0].playerId).toBe('b')
  })

  it('falls back to player ID alphabetical order if all tiebreakers tie', () => {
    const scores = [
      tableScore(1, 1, [
        { playerId: 'zoe', placement: 1, gamePoints: 0, total: 10 },
        { playerId: 'amy', placement: 1, gamePoints: 0, total: 10 },
      ], 0),
    ]
    const standings = aggregateStandings(['zoe', 'amy'], scores, defaultRules)
    // No tiebreakers configured → fall back to player ID
    expect(standings[0].playerId).toBe('amy')
  })

  it('returns empty array for empty playerIds', () => {
    const standings = aggregateStandings([], [], defaultRules)
    expect(standings).toEqual([])
  })

  it('includes players with no scores at the bottom of the standings', () => {
    const scores = [
      tableScore(1, 1, [{ playerId: 'a', placement: 1, gamePoints: 0, total: 10 }], 0),
    ]
    const standings = aggregateStandings(['a', 'b'], scores, defaultRules)
    expect(standings).toHaveLength(2)
    expect(standings[0].playerId).toBe('a')
    expect(standings[0].total).toBe(10)
    expect(standings[1].playerId).toBe('b')
    expect(standings[1].total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tie scoring (SHARED vs SPLIT mode)
// ---------------------------------------------------------------------------

describe('Tie scoring modes', () => {
  const rules: ScoringRules = {
    placementPoints: [10, 6, 3, 1],
    modifiers: [],
    tiebreakers: [],
  }

  it('SHARED mode: tied players each get full points for their placement', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 5 },
      { playerId: 'b', placement: 1, gamePoints: 5 }, // tied with a
      { playerId: 'c', placement: 3, gamePoints: 0 },
    ]
    const result = scoreTable(placements, 1, 4, { ...rules, tieScoreMode: 'SHARED' })
    expect(result[0].basePoints).toBe(10) // a gets 1st place points
    expect(result[1].basePoints).toBe(10) // b also gets 1st place points
    expect(result[2].basePoints).toBe(3)  // c gets 3rd place points (2nd is skipped)
  })

  it('SPLIT mode: tied players share the average of spanned placements', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 5 },
      { playerId: 'b', placement: 1, gamePoints: 5 }, // tied with a
      { playerId: 'c', placement: 3, gamePoints: 0 },
    ]
    const result = scoreTable(placements, 1, 4, { ...rules, tieScoreMode: 'SPLIT' })
    // a and b span placements 1 and 2 → (10 + 6) / 2 = 8 each
    expect(result[0].basePoints).toBe(8)
    expect(result[1].basePoints).toBe(8)
    expect(result[2].basePoints).toBe(3) // c gets 3rd place points
  })

  it('SPLIT mode: 3-way tie averages 3 placements', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 5 },
      { playerId: 'b', placement: 1, gamePoints: 5 },
      { playerId: 'c', placement: 1, gamePoints: 5 },
      { playerId: 'd', placement: 4, gamePoints: 0 },
    ]
    const result = scoreTable(placements, 1, 4, { ...rules, tieScoreMode: 'SPLIT' })
    // a, b, c span placements 1, 2, 3 → (10 + 6 + 3) / 3 = 6.33 → round to 6
    expect(result[0].basePoints).toBe(6)
    expect(result[1].basePoints).toBe(6)
    expect(result[2].basePoints).toBe(6)
    expect(result[3].basePoints).toBe(1) // d gets 4th place
  })

  it('defaults to SHARED when tieScoreMode is not set (backward compat)', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 5 },
      { playerId: 'b', placement: 1, gamePoints: 5 },
    ]
    const result = scoreTable(placements, 1, 4, rules) // no tieScoreMode
    expect(result[0].basePoints).toBe(10)
    expect(result[1].basePoints).toBe(10)
  })

  it('SPLIT mode: no tie → behaves like SHARED', () => {
    const placements = [
      { playerId: 'a', placement: 1, gamePoints: 5 },
      { playerId: 'b', placement: 2, gamePoints: 3 },
      { playerId: 'c', placement: 3, gamePoints: 0 },
    ]
    const result = scoreTable(placements, 1, 4, { ...rules, tieScoreMode: 'SPLIT' })
    expect(result[0].basePoints).toBe(10)
    expect(result[1].basePoints).toBe(6)
    expect(result[2].basePoints).toBe(3)
  })
})
