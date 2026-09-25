import { describe, it, expect } from 'vitest'
import {
  formatEventStatus,
  formatScoreState,
  formatRole,
  formatRoundFormat,
  formatRoundFormatDescription,
} from '@/lib/format'

// Mock translator — returns the key itself (like the i18n fallback).
const t = (key: string) => key

describe('format helpers', () => {
  describe('formatEventStatus', () => {
    it('maps DRAFT correctly', () => {
      expect(formatEventStatus('DRAFT', t)).toBe('dashboard.status.draft')
    })

    it('maps CHECK_IN correctly', () => {
      expect(formatEventStatus('CHECK_IN', t)).toBe('dashboard.status.checkIn')
    })

    it('maps ACTIVE correctly', () => {
      expect(formatEventStatus('ACTIVE', t)).toBe('dashboard.status.active')
    })

    it('maps FINISHED correctly', () => {
      expect(formatEventStatus('FINISHED', t)).toBe('dashboard.status.finished')
    })

    it('falls back for unknown status', () => {
      expect(formatEventStatus('UNKNOWN', t)).toBe('dashboard.status.unknown')
    })
  })

  describe('formatScoreState', () => {
    it('maps MISSING correctly', () => {
      expect(formatScoreState('MISSING', t)).toBe('dashboard.tableStateMissing')
    })

    it('maps PENDING_CONFIRM correctly', () => {
      expect(formatScoreState('PENDING_CONFIRM', t)).toBe('dashboard.tableStatePending')
    })

    it('maps LOCKED correctly', () => {
      expect(formatScoreState('LOCKED', t)).toBe('dashboard.tableStateLocked')
    })

    it('maps DISPUTED correctly', () => {
      expect(formatScoreState('DISPUTED', t)).toBe('dashboard.tableStateDisputed')
    })

    it('falls back for unknown state', () => {
      // This is important: the old bug mapped to dashboard.tableLocked (wrong key).
      // The fix maps to dashboard.tableStateLocked. Verify the fallback also uses tableState.
      expect(formatScoreState('UNKNOWN', t)).toBe('dashboard.tableStateUnknown')
    })
  })

  describe('formatRole', () => {
    it('maps ORGANIZER correctly', () => {
      expect(formatRole('ORGANIZER', t)).toBe('common.roleOrganizer')
    })

    it('maps JUDGE correctly', () => {
      expect(formatRole('JUDGE', t)).toBe('common.roleJudge')
    })

    it('maps PLAYER correctly', () => {
      expect(formatRole('PLAYER', t)).toBe('common.rolePlayer')
    })

    it('falls back for unknown role', () => {
      expect(formatRole('ADMIN', t)).toBe('ADMIN')
    })
  })

  describe('formatRoundFormat', () => {
    it('maps ROUND_ROBIN correctly', () => {
      expect(formatRoundFormat('ROUND_ROBIN', t)).toBe('dashboard.formatRoundRobin')
    })

    it('maps SWISS correctly', () => {
      expect(formatRoundFormat('SWISS', t)).toBe('dashboard.formatSwiss')
    })

    it('maps SINGLE_ELIM correctly', () => {
      expect(formatRoundFormat('SINGLE_ELIM', t)).toBe('dashboard.formatSingleElim')
    })

    it('maps ADJACENT_SWISS correctly (v6)', () => {
      expect(formatRoundFormat('ADJACENT_SWISS', t)).toBe('dashboard.formatAdjSwiss')
    })

    it('maps legacy CUSTOM to Round Robin (removed in v6)', () => {
      expect(formatRoundFormat('CUSTOM', t)).toBe('dashboard.formatRoundRobin')
    })

    it('falls back for unknown format', () => {
      expect(formatRoundFormat('UNKNOWN', t)).toBe('UNKNOWN')
    })
  })

  describe('formatRoundFormatDescription (v6)', () => {
    it('maps ROUND_ROBIN correctly', () => {
      expect(formatRoundFormatDescription('ROUND_ROBIN', t)).toBe('dashboard.formatDescRoundRobin')
    })

    it('maps SWISS correctly', () => {
      expect(formatRoundFormatDescription('SWISS', t)).toBe('dashboard.formatDescSwiss')
    })

    it('maps SINGLE_ELIM correctly', () => {
      expect(formatRoundFormatDescription('SINGLE_ELIM', t)).toBe('dashboard.formatDescSingleElim')
    })

    it('maps ADJACENT_SWISS correctly', () => {
      expect(formatRoundFormatDescription('ADJACENT_SWISS', t)).toBe('dashboard.formatDescAdjSwiss')
    })

    it('returns empty string for unknown/legacy formats', () => {
      expect(formatRoundFormatDescription('UNKNOWN', t)).toBe('')
      expect(formatRoundFormatDescription('CUSTOM', t)).toBe('')
    })
  })

  describe('regression: the i18n key name bug', () => {
    // This test specifically guards against the bug where formatScoreState
    // mapped to dashboard.tableLocked instead of dashboard.tableStateLocked.
    // If someone accidentally reverts the fix, this test will fail.
    it('formatScoreState uses tableState prefix (not table)', () => {
      expect(formatScoreState('LOCKED', t)).toBe('dashboard.tableStateLocked')
      expect(formatScoreState('LOCKED', t)).not.toBe('dashboard.tableLocked')
    })
  })
})
