import { describe, it, expect } from 'vitest'
import { generateEventCode } from '@/lib/event-code'

describe('generateEventCode', () => {
  describe('format', () => {
    it('produces WORD-XXXXXXXX format', () => {
      const code = generateEventCode('Test Event')
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{8}$/)
    })

    it('has exactly one hyphen', () => {
      const code = generateEventCode('Test')
      expect(code.split('-').length).toBe(2)
    })

    it('suffix is 8 characters', () => {
      const code = generateEventCode('Test')
      const suffix = code.split('-')[1]
      expect(suffix.length).toBe(8)
    })
  })

  describe('deterministic adjective', () => {
    it('same event name produces same adjective', () => {
      const code1 = generateEventCode('Summer Showdown')
      const code2 = generateEventCode('Summer Showdown')
      expect(code1.split('-')[0]).toBe(code2.split('-')[0])
    })

    it('different event names may produce different adjectives', () => {
      const adjectives = new Set<string>()
      for (let i = 0; i < 100; i++) {
        adjectives.add(generateEventCode(`Event ${i}`).split('-')[0])
      }
      expect(adjectives.size).toBeGreaterThan(1)
    })
  })

  describe('suffix randomness', () => {
    it('same event name produces different suffixes (CSPRNG)', () => {
      const code1 = generateEventCode('Test Event')
      const code2 = generateEventCode('Test Event')
      expect(code1.split('-')[0]).toBe(code2.split('-')[0])
      expect(code1.split('-')[1]).not.toBe(code2.split('-')[1])
    })

    it('produces many unique codes (high entropy)', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        codes.add(generateEventCode('Entropy Test'))
      }
      // With 8-char suffix from 32-char alphabet (32^8 ≈ 1.1T combinations),
      // 1000 codes should all be unique (birthday paradox threshold ~65K).
      expect(codes.size).toBe(1000)
    })

    it('suffix only uses safe characters (no 0, O, 1, I, L)', () => {
      const code = generateEventCode('Safety Test')
      const suffix = code.split('-')[1]
      const safeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      for (const char of suffix) {
        expect(safeChars).toContain(char)
      }
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      const code = generateEventCode('')
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{8}$/)
    })

    it('handles very long name', () => {
      const code = generateEventCode('A'.repeat(1000))
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{8}$/)
    })

    it('handles unicode', () => {
      const code = generateEventCode('Torneo de Verano')
      expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{8}$/)
    })
  })
})
