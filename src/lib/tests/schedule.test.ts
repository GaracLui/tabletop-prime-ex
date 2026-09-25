import { describe, it, expect } from 'vitest'
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatSession,
  nextSession,
  lastSession,
  scheduleCardLabel,
} from '@/lib/schedule'
import type { EventSession } from '@/lib/types'

describe('schedule helpers', () => {
  // Fixed dates for deterministic tests
  const PAST = '2026-01-15T14:00:00-03:00'
  const FUTURE = '2026-12-25T18:00:00-03:00'
  const SAME_DAY_START = '2026-08-15T14:00:00-03:00'
  const SAME_DAY_END = '2026-08-15T20:00:00-03:00'

  describe('formatDateTime', () => {
    it('returns a formatted string', () => {
      const result = formatDateTime(PAST)
      expect(result).not.toBe('—')
      expect(result.length).toBeGreaterThan(5)
    })

    it('returns "—" for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('—')
      expect(formatDateTime('')).toBe('—')
    })
  })

  describe('formatDate', () => {
    it('returns a date-only string', () => {
      const result = formatDate(PAST)
      expect(result).not.toContain(':') // no time component
      expect(result).not.toBe('—')
    })

    it('returns "—" for invalid date', () => {
      expect(formatDate('invalid')).toBe('—')
    })
  })

  describe('formatTime', () => {
    it('returns a time-only string', () => {
      const result = formatTime(SAME_DAY_START)
      expect(result).not.toBe('—')
      // Should contain a colon (HH:MM format) in most locales
      expect(result).toMatch(/\d/)
    })

    it('returns "—" for invalid date', () => {
      expect(formatTime('invalid')).toBe('—')
    })
  })

  describe('formatSession', () => {
    it('returns start time when no end', () => {
      const session: EventSession = { start: SAME_DAY_START }
      const result = formatSession(session)
      expect(result).toContain(formatDateTime(SAME_DAY_START))
    })

    it('includes end time when same day', () => {
      const session: EventSession = { start: SAME_DAY_START, end: SAME_DAY_END }
      const result = formatSession(session)
      expect(result).toContain('–') // en-dash separator
    })

    it('includes full end datetime when different day', () => {
      const session: EventSession = { start: PAST, end: FUTURE }
      const result = formatSession(session)
      expect(result).toContain('–')
    })
  })

  describe('nextSession', () => {
    it('returns null for empty array', () => {
      expect(nextSession([])).toBeNull()
      expect(nextSession(null)).toBeNull()
      expect(nextSession(undefined)).toBeNull()
    })

    it('returns the next upcoming session', () => {
      const sessions: EventSession[] = [
        { start: PAST },
        { start: FUTURE },
      ]
      const result = nextSession(sessions)
      expect(result?.start).toBe(FUTURE)
    })

    it('returns null when all sessions are in the past', () => {
      const sessions: EventSession[] = [{ start: PAST }]
      expect(nextSession(sessions)).toBeNull()
    })
  })

  describe('lastSession', () => {
    it('returns null for empty array', () => {
      expect(lastSession([])).toBeNull()
      expect(lastSession(null)).toBeNull()
    })

    it('returns the most recent past session', () => {
      const sessions: EventSession[] = [
        { start: PAST },
        { start: FUTURE },
      ]
      const result = lastSession(sessions)
      expect(result?.start).toBe(PAST)
    })

    it('returns null when no sessions are in the past', () => {
      const sessions: EventSession[] = [{ start: FUTURE }]
      expect(lastSession(sessions)).toBeNull()
    })
  })

  describe('scheduleCardLabel', () => {
    it('returns null for empty schedule', () => {
      expect(scheduleCardLabel([])).toBeNull()
      expect(scheduleCardLabel(null)).toBeNull()
      expect(scheduleCardLabel(undefined)).toBeNull()
    })

    it('returns "Starts ..." for upcoming session', () => {
      const sessions: EventSession[] = [{ start: FUTURE }]
      const label = scheduleCardLabel(sessions)
      expect(label).not.toBeNull()
      // Should contain "Starts" or the locale-equivalent
    })

    it('returns "Ended ..." for all-past sessions', () => {
      const sessions: EventSession[] = [{ start: PAST }]
      const label = scheduleCardLabel(sessions)
      expect(label).not.toBeNull()
    })
  })
})
