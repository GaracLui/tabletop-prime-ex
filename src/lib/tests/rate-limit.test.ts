/**
 * Unit tests for the S7 rate limiter (src/lib/rate-limit.ts).
 *
 * The core `rateLimit()` takes an injectable clock so every window,
 * boundary, and isolation behavior is deterministic. The `checkRateLimit()`
 * wrapper is exercised over real Requests to pin the 429 + Retry-After
 * response shape.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  rateLimit,
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_BUCKETS,
  __internals,
} from '@/lib/rate-limit'

const CFG = { windowMs: 60_000, max: 3 }

describe('rateLimit core', () => {
  beforeEach(() => __internals.reset())

  it('allows requests up to the limit, then blocks', () => {
    const t0 = 1_000_000
    expect(rateLimit('k1', CFG, t0).allowed).toBe(true)
    expect(rateLimit('k1', CFG, t0 + 1).allowed).toBe(true)
    expect(rateLimit('k1', CFG, t0 + 2).allowed).toBe(true)
    const blocked = rateLimit('k1', CFG, t0 + 3)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets after the window elapses', () => {
    const t0 = 1_000_000
    rateLimit('k1', CFG, t0)
    rateLimit('k1', CFG, t0 + 1)
    rateLimit('k1', CFG, t0 + 2)
    expect(rateLimit('k1', CFG, t0 + 3).allowed).toBe(false)
    // New window starts at t0 + windowMs.
    const fresh = rateLimit('k1', CFG, t0 + CFG.windowMs)
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(CFG.max - 1)
  })

  it('reports retryAfterSec as the ceil of the remaining window', () => {
    const t0 = 1_000_000
    rateLimit('k1', CFG, t0)
    rateLimit('k1', CFG, t0 + 1)
    rateLimit('k1', CFG, t0 + 2)
    // 500ms into a 60s window from t0 → ~59.5s left → ceil 60.
    const blocked = rateLimit('k1', CFG, t0 + 500)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBe(60)
  })

  it('isolates keys (and therefore IPs/buckets)', () => {
    const t0 = 1_000_000
    for (let i = 0; i < CFG.max; i++) rateLimit('kA', CFG, t0 + i)
    expect(rateLimit('kA', CFG, t0 + 10).allowed).toBe(false)
    expect(rateLimit('kB', CFG, t0 + 11).allowed).toBe(true)
  })

  it('does not count requests from a previous window twice', () => {
    const t0 = 1_000_000
    rateLimit('k1', CFG, t0)
    rateLimit('k1', CFG, t0 + CFG.windowMs + 1)
    rateLimit('k1', CFG, t0 + CFG.windowMs + 2)
    const third = rateLimit('k1', CFG, t0 + CFG.windowMs + 3)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
  })
})

describe('getClientIp', () => {
  it('prefers the first x-forwarded-for hop', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(getClientIp(new Request('http://localhost/', { headers: { 'x-real-ip': '198.51.100.2' } }))).toBe('198.51.100.2')
    expect(getClientIp(new Request('http://localhost/'))).toBe('unknown')
  })
})

describe('checkRateLimit response shape', () => {
  beforeEach(() => __internals.reset())

  it('returns a 429 with Retry-After once the bucket is exhausted', async () => {
    const mk = () =>
      new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.1' },
      })

    const joinMax = RATE_LIMIT_BUCKETS.join.max
    for (let i = 0; i < joinMax; i++) {
      expect(checkRateLimit(mk(), 'join').ok).toBe(true)
    }
    const blocked = checkRateLimit(mk(), 'join')
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      expect(Number(blocked.response.headers.get('Retry-After'))).toBeGreaterThan(0)
      const body = (await blocked.response.json()) as { error: string }
      expect(body.error).toMatch(/Too many requests/i)
    }
  })

  it('keys by client IP, so a different IP is unaffected', () => {
    const mk = (ip: string) =>
      new Request('http://localhost/api/bgg', { headers: { 'x-forwarded-for': ip } })
    const bggMax = RATE_LIMIT_BUCKETS.bgg.max
    for (let i = 0; i < bggMax; i++) {
      expect(checkRateLimit(mk('203.0.113.99'), 'bgg').ok).toBe(true)
    }
    expect(checkRateLimit(mk('203.0.113.99'), 'bgg').ok).toBe(false)
    expect(checkRateLimit(mk('203.0.113.100'), 'bgg').ok).toBe(true)
  })
})
