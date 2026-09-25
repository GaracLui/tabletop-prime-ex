/**
 * Tests for schedule-utils.ts — the normalizeSchedule function.
 *
 * This is the server-side schedule normalization used by both
 * POST /api/events and PATCH /api/events/[eventId].
 */
import { describe, it, expect } from 'vitest'
import { normalizeSchedule, MAX_SCHEDULE_ENTRIES } from '@/lib/schedule-utils'

describe('normalizeSchedule', () => {
  it('returns null for null input', () => {
    expect(normalizeSchedule(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(normalizeSchedule(undefined)).toBeNull()
  })

  it('returns null for non-array input', () => {
    expect(normalizeSchedule('not an array')).toBeNull()
    expect(normalizeSchedule({})).toBeNull()
    expect(normalizeSchedule(42)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(normalizeSchedule([])).toBeNull()
  })

  it('returns null for array with only invalid entries', () => {
    expect(normalizeSchedule([{ end: '2026-08-15T20:00:00-03:00' }])).toBeNull()
    expect(normalizeSchedule([{ start: 'invalid-date' }])).toBeNull()
    expect(normalizeSchedule([{ foo: 'bar' }])).toBeNull()
    expect(normalizeSchedule([null, undefined, 'string'])).toBeNull()
  })

  it('normalizes a single valid entry', () => {
    const input = [{ start: '2026-08-15T14:00:00-03:00' }]
    const result = normalizeSchedule(input)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].start).toBe('2026-08-15T14:00:00-03:00')
    expect(parsed[0].end).toBeUndefined()
  })

  it('normalizes an entry with start + end', () => {
    const input = [{
      start: '2026-08-15T14:00:00-03:00',
      end: '2026-08-15T20:00:00-03:00',
    }]
    const result = normalizeSchedule(input)
    const parsed = JSON.parse(result!)
    expect(parsed[0].start).toBe('2026-08-15T14:00:00-03:00')
    expect(parsed[0].end).toBe('2026-08-15T20:00:00-03:00')
  })

  it('drops entries with invalid end date but keeps valid start', () => {
    const input = [
      { start: '2026-08-15T14:00:00-03:00', end: 'invalid' },
    ]
    const result = normalizeSchedule(input)
    const parsed = JSON.parse(result!)
    expect(parsed[0].start).toBe('2026-08-15T14:00:00-03:00')
    expect(parsed[0].end).toBeUndefined()
  })

  it('sorts entries by start time ascending', () => {
    const input = [
      { start: '2026-08-16T14:00:00-03:00' },
      { start: '2026-08-15T14:00:00-03:00' },
      { start: '2026-08-17T14:00:00-03:00' },
    ]
    const result = normalizeSchedule(input)
    const parsed = JSON.parse(result!)
    expect(parsed[0].start).toBe('2026-08-15T14:00:00-03:00')
    expect(parsed[1].start).toBe('2026-08-16T14:00:00-03:00')
    expect(parsed[2].start).toBe('2026-08-17T14:00:00-03:00')
  })

  it('filters out invalid entries and keeps valid ones', () => {
    const input = [
      { start: '2026-08-15T14:00:00-03:00' },
      { start: 'invalid' },
      { foo: 'bar' },
      null,
      { start: '2026-08-16T14:00:00-03:00' },
    ]
    const result = normalizeSchedule(input)
    const parsed = JSON.parse(result!)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].start).toBe('2026-08-15T14:00:00-03:00')
    expect(parsed[1].start).toBe('2026-08-16T14:00:00-03:00')
  })

  it('limits to MAX_SCHEDULE_ENTRIES', () => {
    const input = Array.from({ length: 100 }, (_, i) => ({
      start: `2026-08-${String(i + 1).padStart(2, '0')}T14:00:00-03:00`,
    }))
    const result = normalizeSchedule(input)
    const parsed = JSON.parse(result!)
    expect(parsed.length).toBeLessThanOrEqual(MAX_SCHEDULE_ENTRIES)
  })
})
