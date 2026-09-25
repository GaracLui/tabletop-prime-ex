/**
 * Additional tests for the scoring engine — edge cases that were
 * introduced by bug fixes (NaN guards, isStaff lock, etc.).
 *
 * These tests guard against regressions of specific bugs we've fixed.
 */
import { describe, it, expect } from 'vitest'
import {
  applyModifier,
  scorePlacement,
} from '../scoring-engine'
import type {
  ScoringRules,
  ScoreModifierConfig,
} from '@/lib/types'

const baseRules: ScoringRules = {
  placementPoints: [10, 6, 3, 1],
  modifiers: [],
  tiebreakers: [],
}

const ctx = {
  playerId: 'p1',
  placement: 1,
  gamePoints: 5,
  round: 1,
  totalRounds: 4,
  attended: true,
}

describe('scoring engine — NaN guard (regression)', () => {
  it('treats NaN modifier value as 0 (ATTENDANCE_BONUS)', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'ATTENDANCE_BONUS',
      label: 'Attendance',
      value: NaN,
      appliesTo: 'ALL',
    }
    // Without the guard, this would return NaN (NaN * anything = NaN)
    const result = applyModifier(mod, 10, ctx)
    expect(result).toBe(0)
    expect(isNaN(result)).toBe(false)
  })

  it('treats NaN modifier value as 0 (FLAT_BONUS)', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'FLAT_BONUS',
      label: 'Flat',
      value: NaN,
      appliesTo: 'ALL',
    }
    const result = applyModifier(mod, 10, ctx)
    expect(result).toBe(0)
    expect(isNaN(result)).toBe(false)
  })

  it('treats NaN modifier value as 0 (MULTIPLIER)', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'MULTIPLIER',
      label: 'Multiplier',
      value: NaN,
      appliesTo: 'ALL',
    }
    // value=NaN → guarded to 0 → delta = 10 * (0-1) = -10
    // This is correct: the NaN guard makes value=0, and multiplier(0)
    // means "multiply by 0" which is a total wipe → delta = -(currentTotal)
    const result = applyModifier(mod, 10, ctx)
    expect(isNaN(result)).toBe(false)
    // value=0 → delta = 10 * (0-1) = -10
    expect(result).toBe(-10)
  })

  it('treats NaN modifier value as 0 (FINAL_ROUND_MULTIPLIER)', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'FINAL_ROUND_MULTIPLIER',
      label: 'Final',
      value: NaN,
      appliesTo: 'ALL',
    }
    const finalCtx = { ...ctx, round: 4, totalRounds: 4 }
    const result = applyModifier(mod, 10, finalCtx)
    expect(isNaN(result)).toBe(false)
    // value=0 → delta = 10 * (0-1) = -10
    expect(result).toBe(-10)
  })

  it('does not return NaN total when a modifier has NaN value', () => {
    const rules: ScoringRules = {
      ...baseRules,
      modifiers: [
        {
          id: 'm1',
          type: 'MULTIPLIER',
          label: 'Bad Multiplier',
          value: NaN,
          appliesTo: 'ALL',
        },
      ],
    }
    const result = scorePlacement(ctx, rules, undefined, [1])
    // basePoints for 1st place = 10
    // multiplier with NaN→0: delta = 10 * (0-1) = -10
    // total = 10 + (-10) = 0
    // The important thing: total is NOT NaN
    expect(isNaN(result.total)).toBe(false)
    expect(isNaN(result.bonus)).toBe(false)
    // With value=0 multiplier: total = basePoints + (basePoints * -1) = 0
    expect(result.total).toBe(0)
  })
})

describe('scoring engine — NaN guard with NaN currentTotal (defense-in-depth)', () => {
  it('does not propagate NaN from currentTotal through MULTIPLIER', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'MULTIPLIER',
      label: 'Multiplier',
      value: 2,
      appliesTo: 'ALL',
    }
    const result = applyModifier(mod, NaN, ctx)
    // Should treat NaN currentTotal as 0, so result = 0 * (2-1) = 0
    expect(result).toBe(0)
    expect(isNaN(result)).toBe(false)
  })
})

describe('scoring engine — normal values still work correctly', () => {
  it('MULTIPLIER with value 2 doubles the total', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'MULTIPLIER',
      label: 'Double',
      value: 2,
      appliesTo: 'ALL',
    }
    const result = applyModifier(mod, 10, ctx)
    // delta = 10 * (2-1) = 10
    expect(result).toBe(10)
  })

  it('FLAT_BONUS adds a flat amount', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'FLAT_BONUS',
      label: 'Bonus',
      value: 5,
      appliesTo: 'ALL',
    }
    const result = applyModifier(mod, 10, ctx)
    expect(result).toBe(5)
  })

  it('ATTENDANCE_BONUS only applies when attended=true', () => {
    const mod: ScoreModifierConfig = {
      id: 'm1',
      type: 'ATTENDANCE_BONUS',
      label: 'Attendance',
      value: 3,
      appliesTo: 'ALL',
    }
    expect(applyModifier(mod, 10, ctx)).toBe(3)
    expect(applyModifier(mod, 10, { ...ctx, attended: false })).toBe(0)
  })
})
