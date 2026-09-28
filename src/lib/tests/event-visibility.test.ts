/**
 * S8 + S9.2 regression tests.
 *
 * S8 — event visibility: every event used to be publicly watchable on
 * /share/[code] and /api/public/[code] from creation, with no unshare
 * control. This suite pins the new state machine:
 *
 *   - POST /api/events/[eventId]/publish  → visibility PUBLIC (organizer
 *     only, idempotent, keeps/creates the code)
 *   - DELETE /api/events/[eventId]/publish → visibility PRIVATE (code kept
 *     so printed QR codes recover on re-publish)
 *   - GET /api/public/[eventCode] → 404 for PRIVATE (indistinguishable
 *     from an unknown code — no existence leak), 200 for PUBLIC
 *
 * S9.2 — sync-profile first-login race: findUnique → create let two
 * concurrent first logins collide on the supabaseAuthId unique constraint
 * (one got a 500). The fix is an upsert with a no-op conflict branch; the
 * tests pin the call shape and the null-email behavior (clean null → 401,
 * not a Prisma 500).
 *
 * Style mirrors api-authz.test.ts (C7): real handlers + real requireX()
 * chain; only Supabase auth, next/headers, and Prisma are mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeDefaultScoringRules } from '@/lib/pricing'

// ──────────────────────────────────────────────────────────────────────
// Mocks — the only boundaries replaced.
// ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [] as Array<{ name: string; value: string }>,
    set: vi.fn(),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

const mockDb = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), upsert: vi.fn() },
  eventParticipant: { findUnique: vi.fn() },
  event: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ db: mockDb }))

// Route handlers under test — imported AFTER the mocks are registered.
import { POST as publishPost, DELETE as publishDelete } from '@/app/api/events/[eventId]/publish/route'
import { GET as publicGet } from '@/app/api/public/[eventCode]/route'
import { getOrCreateAuthProfile } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────────────
// Fixtures + helpers
// ──────────────────────────────────────────────────────────────────────

type Role = 'ORGANIZER' | 'JUDGE' | 'PLAYER'

function profile(id: string) {
  return { id, supabaseAuthId: `sb-${id}`, email: `${id}@test.dev`, name: id, deletionRequestedAt: null }
}

function participantRow(userId: string, eventId: string, role: Role) {
  return { id: `part-${userId}-${eventId}`, userId, eventId, role }
}

/** Sign a user in (or null for anon) and wire getAuthProfile's findUnique. */
function signedIn(u: ReturnType<typeof profile> | null) {
  mockGetUser.mockResolvedValue(
    u ? { data: { user: { id: u.supabaseAuthId } } } : { data: { user: null } }
  )
  mockDb.user.findUnique.mockResolvedValue(u)
}

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

const EVENT_ID = 'ev1'
const CODE = 'DEMO-7K3X'
const ORGANIZER = profile('org1')

/** Bare event row as the publish route reads it. */
function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    name: 'Spring Open',
    eventCode: null,
    visibility: 'PRIVATE',
    ...overrides,
  }
}

const okResponse = (res: Response, status: number) => {
  expect(res.status).toBe(status)
  return res.json()
}

beforeEach(() => {
  vi.clearAllMocks()
  signedIn(null)
})

// ──────────────────────────────────────────────────────────────────────
// POST /api/events/[eventId]/publish — publish = visibility PUBLIC
// ──────────────────────────────────────────────────────────────────────

describe('POST /api/events/[eventId]/publish (S8)', () => {
  it('401 for anonymous callers', async () => {
    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 401)
    expect(mockDb.event.update).not.toHaveBeenCalled()
  })

  it('403 for a non-participant', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(null)
    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 403)
    expect(mockDb.event.update).not.toHaveBeenCalled()
  })

  it('403 for a PLAYER (organizer powers only)', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'PLAYER')
    )
    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 403)
    expect(mockDb.event.update).not.toHaveBeenCalled()
  })

  it('organizer publish generates a code and sets PUBLIC', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'ORGANIZER')
    )
    // First findUnique → the event (no code yet); every later call →
    // collision probes, all empty (no code collision).
    mockDb.event.findUnique.mockResolvedValueOnce(eventRow())
    mockDb.event.findUnique.mockResolvedValue(null)
    mockDb.event.update.mockResolvedValue({})

    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    const body = await okResponse(res, 200)
    expect(body.visibility).toBe('PUBLIC')
    expect(typeof body.eventCode).toBe('string')
    expect(body.eventCode.length).toBeGreaterThan(0)
    // The transition must hit the DB — visibility alone is not enough.
    expect(mockDb.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_ID },
        data: expect.objectContaining({ visibility: 'PUBLIC' }),
      })
    )
  })

  it('re-publishing keeps the existing code (idempotent, QR-safe)', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'ORGANIZER')
    )
    mockDb.event.findUnique.mockResolvedValue(eventRow({ eventCode: CODE }))
    mockDb.event.update.mockResolvedValue({})

    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    const body = await okResponse(res, 200)
    expect(body).toEqual({ eventCode: CODE, visibility: 'PUBLIC' })
    // No code regeneration — the stored code is reused verbatim.
    expect(mockDb.event.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventCode: CODE, visibility: 'PUBLIC' }) })
    )
  })

  it('404 when the event does not exist', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'ORGANIZER')
    )
    mockDb.event.findUnique.mockResolvedValue(null)
    const res = await publishPost(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 404)
  })
})

// ──────────────────────────────────────────────────────────────────────
// DELETE /api/events/[eventId]/publish — unpublish = visibility PRIVATE
// ──────────────────────────────────────────────────────────────────────

describe('DELETE /api/events/[eventId]/publish (S8 unshare control)', () => {
  it('401 for anonymous callers', async () => {
    const res = await publishDelete(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 401)
    expect(mockDb.event.update).not.toHaveBeenCalled()
  })

  it('403 for a PLAYER', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'PLAYER')
    )
    const res = await publishDelete(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    await okResponse(res, 403)
    expect(mockDb.event.update).not.toHaveBeenCalled()
  })

  it('organizer unpublish flips to PRIVATE but KEEPS the code', async () => {
    signedIn(ORGANIZER)
    mockDb.eventParticipant.findUnique.mockResolvedValue(
      participantRow(ORGANIZER.id, EVENT_ID, 'ORGANIZER')
    )
    mockDb.event.findUnique.mockResolvedValue(eventRow({ eventCode: CODE, visibility: 'PUBLIC' }))
    mockDb.event.update.mockResolvedValue({})

    const res = await publishDelete(new Request('http://localhost/x'), params({ eventId: EVENT_ID }))
    const body = await okResponse(res, 200)
    expect(body.visibility).toBe('PRIVATE')
    expect(body.eventCode).toBe(CODE)
    expect(mockDb.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_ID },
        data: { visibility: 'PRIVATE' },
      })
    )
  })
})

// ──────────────────────────────────────────────────────────────────────
// GET /api/public/[eventCode] — the gated public surface
// ──────────────────────────────────────────────────────────────────────

/** Full event as the public route's select reads it. */
function publicEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    name: 'Spring Open',
    gameName: 'Catan',
    status: 'ACTIVE',
    currentRound: 1,
    totalRounds: 3,
    scoringRulesJson: JSON.stringify(makeDefaultScoringRules()),
    description: null,
    scheduleJson: null,
    bannerSeedOffset: 0,
    players: [{ id: 'p1', name: 'Ana', color: 'bg-rose-500' }],
    pairings: [
      {
        round: 1,
        format: 'ROUND_ROBIN',
        tablesJson: JSON.stringify([{ tableNumber: 1, playerIds: ['p1'] }]),
        droppedPlayerIdsJson: '[]',
        label: null,
        isBonus: false,
      },
    ],
    scores: [],
    ...overrides,
  }
}

describe('GET /api/public/[eventCode] (S8 gate)', () => {
  it('404 for a PRIVATE event — same shape as an unknown code', async () => {
    mockDb.event.findUnique.mockResolvedValue(null)
    const res = await publicGet(new Request('http://localhost/x'), params({ eventCode: CODE }))
    await okResponse(res, 404)
  })

  it('serves standings and pairings for a PUBLIC event', async () => {
    mockDb.event.findUnique.mockResolvedValue(publicEventRow())
    const res = await publicGet(new Request('http://localhost/x'), params({ eventCode: CODE }))
    const body = await okResponse(res, 200)
    expect(body.event.name).toBe('Spring Open')
    expect(body.event.id).toBe(EVENT_ID)
    expect(body.pairings[0].tables[0].players[0].name).toBe('Ana')
    expect(body.standings).toHaveLength(1)
  })

  it('filters on visibility IN the query (no post-fetch leak)', async () => {
    mockDb.event.findUnique.mockResolvedValue(null)
    await publicGet(new Request('http://localhost/x'), params({ eventCode: CODE }))
    expect(mockDb.event.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventCode: CODE, visibility: 'PUBLIC' },
      })
    )
  })
})

// ──────────────────────────────────────────────────────────────────────
// S9.2 — getOrCreateAuthProfile: upsert closes the first-login race
// ──────────────────────────────────────────────────────────────────────

describe('getOrCreateAuthProfile (S9.2)', () => {
  it('returns the existing profile on the fast path without an upsert', async () => {
    const existing = profile('u9')
    signedIn(existing)
    const result = await getOrCreateAuthProfile()
    expect(result).toEqual(existing)
    expect(mockDb.user.upsert).not.toHaveBeenCalled()
  })

  it('creates via upsert with a no-op update branch (race-safe shape)', async () => {
    const authUser = { id: 'sb-new', email: 'new@test.dev', user_metadata: { full_name: 'New User' } }
    mockGetUser.mockResolvedValue({ data: { user: authUser } })
    mockDb.user.findUnique.mockResolvedValue(null)
    const created = { id: 'u-new', supabaseAuthId: 'sb-new', email: 'new@test.dev', name: 'New User' }
    mockDb.user.upsert.mockResolvedValue(created)

    const result = await getOrCreateAuthProfile()
    expect(result).toEqual(created)
    expect(mockDb.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supabaseAuthId: 'sb-new' },
        // The no-op update is the whole point: the row was created by the
        // concurrent request we lost the race against.
        update: {},
        create: expect.objectContaining({ email: 'new@test.dev', name: 'New User' }),
      })
    )
  })

  it('returns null (→ clean 401) for an auth user with no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'sb-noemail', email: null, user_metadata: {} } } })
    mockDb.user.findUnique.mockResolvedValue(null)
    const result = await getOrCreateAuthProfile()
    expect(result).toBeNull()
    // No write attempt — the old `user.email!` would have 500'd here.
    expect(mockDb.user.upsert).not.toHaveBeenCalled()
  })
})
