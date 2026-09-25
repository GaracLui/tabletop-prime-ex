/**
 * App-level rate limiting (S7).
 *
 * The audit found no rate limiter anywhere: /api/account/password runs an
 * online `signInWithPassword` verification loop, /api/participants +
 * /api/events/lookup allow join-code guessing, /api/bgg proxies a 48k-row
 * scan, and score/judge-call submission is spammable.
 *
 * Design:
 *   - Fixed-window counters in an in-memory Map, keyed by `<bucket>:<ip>`.
 *   - Dependency-free and clock-injectable (`now` param) so the logic is
 *     deterministically unit-testable.
 *   - `checkRateLimit()` returns a discriminated union in the same style as
 *     the C4 authz helpers / C2 parseBody — skipping the failure branch is
 *     a type error.
 *
 * Scope caveat (documented, deliberate):
 *   This is PER-INSTANCE memory. On a single standalone deployment that is
 *   exactly right. On multi-instance/serverless deployments each instance
 *   counts separately, so limits are multiplied by instance count — still
 *   a meaningful brake. If distributed limits are ever needed, swap the
 *   `rateLimit()` core for @upstash/rate-limit (or put Vercel WAF rules in
 *   front); `checkRateLimit()`'s interface is the only thing routes touch.
 *
 * Cost note: a Map.get + occasional sweep is O(1) per request — no I/O,
 * no locks, safe for the hot path.
 */
import { NextResponse } from 'next/server'

export interface RateLimitConfig {
  /** Window length in milliseconds. */
  windowMs: number
  /** Max requests allowed per window. */
  max: number
}

/** Bucket configs per route family. Values are generous for real users, hostile to scripts. */
export const RATE_LIMIT_BUCKETS: Record<string, RateLimitConfig> = {
  /** Password change / account deletion — online credential-verification loop. */
  account: { windowMs: 15 * 60_000, max: 10 },
  /** Join-by-code — blunts event-code brute forcing. */
  join: { windowMs: 60_000, max: 10 },
  /** Event lookup by code — same brute-force vector as join. */
  lookup: { windowMs: 60_000, max: 20 },
  /** BGG search proxy — 48k-row substring scan per request. */
  bgg: { windowMs: 60_000, max: 60 },
  /** Score submissions / judge calls — write-spam brake. */
  write: { windowMs: 60_000, max: 30 },
}

/** In-memory counters: key -> { count, windowStart }. Survives for the process lifetime. */
const counters = new Map<string, { count: number; windowStart: number }>()

/** Sweep bookkeeping — prune expired entries so the Map cannot grow unbounded. */
const SWEEP_INTERVAL_MS = 60_000
/** Retention upper bound = the longest bucket window (account: 15 min). */
const MAX_WINDOW_MS = Math.max(...Object.values(RATE_LIMIT_BUCKETS).map((b) => b.windowMs))
let lastSweepAt = 0

function sweepExpired(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return
  lastSweepAt = now
  for (const [key, entry] of counters) {
    // Entries older than the longest window can no longer affect any
    // bucket's decision — they are pure memory garbage at this point.
    if (now - entry.windowStart >= MAX_WINDOW_MS) counters.delete(key)
  }
}

export interface RateLimitResult {
  /** Whether the request is under the limit. */
  allowed: boolean
  /** Seconds until the current window resets (for Retry-After). */
  retryAfterSec: number
  /** Remaining requests in the current window. */
  remaining: number
}

/**
 * Core fixed-window limiter. Pure apart from the shared Map; `now` is
 * injectable for tests.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now()
): RateLimitResult {
  sweepExpired(now)

  const entry = counters.get(key)
  if (!entry || now - entry.windowStart >= config.windowMs) {
    counters.set(key, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSec: 0, remaining: config.max - 1 }
  }

  entry.count += 1
  const windowRemainingMs = config.windowMs - (now - entry.windowStart)
  const retryAfterSec = Math.max(1, Math.ceil(windowRemainingMs / 1000))

  if (entry.count > config.max) {
    return { allowed: false, retryAfterSec, remaining: 0 }
  }
  return { allowed: true, retryAfterSec, remaining: Math.max(0, config.max - entry.count) }
}

/**
 * Best-effort client IP for rate-limit keying.
 *
 * Behind Vercel / a standard reverse proxy, x-forwarded-for's FIRST entry is
 * the real client (the proxy appends, so later entries are proxy-controlled).
 * Fall back to x-real-ip, then a shared bucket — the limiter still works,
 * just globally keyed instead of per-client.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export type RateLimitCheck =
  | { ok: true; remaining: number }
  | { ok: false; response: NextResponse }

/**
 * Check a request against its bucket. Call at the TOP of the handler —
 * before auth — so unauthenticated floods are braked too.
 */
export function checkRateLimit(req: Request, bucket: keyof typeof RATE_LIMIT_BUCKETS): RateLimitCheck {
  const config = RATE_LIMIT_BUCKETS[bucket]
  const result = rateLimit(`${bucket}:${getClientIp(req)}`, config)
  if (result.allowed) return { ok: true, remaining: result.remaining }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Too many requests — please slow down and try again shortly' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSec),
          ...(config.windowMs >= 60_000 ? { 'Rate-Limit-Window': `${config.windowMs / 1000}s` } : {}),
        },
      }
    ),
  }
}

/** Test hook — same convention as the pairing engine's __internals export. */
export const __internals = {
  reset(): void {
    counters.clear()
    lastSweepAt = 0
  },
}
