/**
 * Route-level authz-matrix tests (C7).
 *
 * The audit found that all 382 existing tests were pure-function tests
 * while EVERY authz decision lives in the 30 API routes — the layer where
 * S3, S4, and S6 were found. This suite exercises the REAL handlers and
 * the REAL requireX() helpers from src/lib/supabase/server.ts; only the
 * edges (Supabase auth, Prisma, next/headers) are mocked, so the S3/S4/S6
 * regression checks below run the same code paths production does.
 *
 * Matrix per the audit's start list:
 *   - POST   /api/events/[eventId]/scores          (S3 fail-closed authz + C2 payload gates)
 *   - PATCH  /api/events/[eventId]/players/[id]    (S4 organizer-or-self + boolean coercion)
 *   - DELETE /api/events/[eventId]/players/[id]
 *   - PATCH  /api/events/[eventId]/judge-calls/[id] (S6 staff-only + IDOR scoping)
 *   - POST   /api/events/[eventId]/judge-calls      (C8.5 category enum)
 *   - POST   /api/events                            (S9.1 template ownership + validation)
 *
 * Roles × representative outcomes: anon → 401, non-participant → 403,
 * PLAYER → own-table/self only, JUDGE/ORGANIZER → staff powers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeDefaultScoringRules } from '@/lib/pricing'

// ──────────────────────────────────────────────────────────────────────
// Mocks — the only boundaries replaced. server.ts's requireX() chain,
// parseBody() validation, and every route-local check run for real.
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
  user: { findUnique: vi.fn() },
  eventParticipant: { findUnique: vi.fn(), create: vi.fn() },
  event: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  eventTemplate: { findFirst: vi.fn() },
  player: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
  roundPairing: { findFirst: vi.fn() },
  tableScore: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  placementScore: { deleteMany: vi.fn(), create: vi.fn() },
  judgeCall: { create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ db: mockDb }))

// Route handlers under test — imported AFTER the mocks are registered.
import { POST as scoresPost } from '@/app/api/events/[eventId]/scores/route'
import { PATCH as playerPatch, DELETE as playerDelete } from '@/app/api/events/[eventId]/players/[playerId]/route'
import { PATCH as judgeCallPatch } from '@/app/api/events/[eventId]/judge-calls/[callId]/route'
import { POST as judgeCallPost } from '@/app/api/events/[eventId]/judge-calls/route'
import { POST as eventsPost } from '@/app/api/events/route'

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

let ipCounter = 0
function jsonReq(body: unknown): Request {
  ipCounter += 1
  return new Request('http://localhost:3000/api/under-test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Fresh IP per request: the S7 limiter is per-IP and would otherwise
      // couple test cases to each other's request counts.
      'x-forwarded-for': `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  })
}

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

const EVENT_ID = 'ev1'
const ME = profile('u1')
const OTHER_PLAYER = profile('u2')

/** A paired round: I sit at table 2 with p2; table 1 has p3. */
function seatMeAtTable2() {
  mockDb.player.findFirst.mockResolvedValue({ id: 'p-me', eventId: EVENT_ID, userId: ME.id })
  mockDb.roundPairing.findFirst.mockResolvedValue({
    tablesJson: JSON.stringify([
      { tableNumber: 1, playerIds: ['p3'] },
      { tableNumber: 2, playerIds: ['p-me', 'p2'] },
    ]),
  })
}

const validPlacements = [
  { playerId: 'p-me', placement: 1, gamePoints: 12 },
  { playerId: 'p2', placement: 2, gamePoints: 5 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb))
  // Default event row for scores tests (overridden where needed).
  mockDb.event.findUnique.mockResolvedValue({
    id: EVENT_ID,
    totalRounds: 4,
    scoringRulesJson: JSON.stringify(makeDefaultScoringRules()),
    roundConfigs: [],
  })
})

// ──────────────────────────────────────────────────────────────────────
// POST /api/events/[eventId]/scores — the S3 matrix
// ──────────────────────────────────────────────────────────────────────

describe('POST /api/events/[eventId]/scores', () => {
  it('anon → 401', async () => {
    signedIn(null)
    const res = await scoresPost(jsonReq({ tableNumber: 2, round: 1, placements: validPlacements }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Not authenticated')
  })

  it('signed-in non-participant → 403 Not authorized', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(null)
    const res = await scoresPost(jsonReq({ tableNumber: 2, round: 1, placements: validPlacements }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Not authorized')
  })

  it('S3(a): participant with NO Player row → 403 (fail-closed, was the hole)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.player.findFirst.mockResolvedValue(null)
    const res = await scoresPost(jsonReq({ tableNumber: 2, round: 1, placements: validPlacements }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('You are not a player in this event')
    expect(mockDb.tableScore.create).not.toHaveBeenCalled()
  })

  it('S3(b): player scoring a round with NO pairing → 403 (fail-closed)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.player.findFirst.mockResolvedValue({ id: 'p-me', eventId: EVENT_ID, userId: ME.id })
    mockDb.roundPairing.findFirst.mockResolvedValue(null)
    const res = await scoresPost(jsonReq({ tableNumber: 2, round: 1, placements: validPlacements }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('No pairing exists for this round yet')
    expect(mockDb.tableScore.create).not.toHaveBeenCalled()
  })

  it('player scoring a table they are NOT seated at → 403', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    seatMeAtTable2()
    const res = await scoresPost(jsonReq({ tableNumber: 1, round: 1, placements: [{ playerId: 'p3', placement: 1, gamePoints: 8 }] }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('You can only score the table you are seated at')
    expect(mockDb.tableScore.create).not.toHaveBeenCalled()
  })

  it('player submitting placements for players at ANOTHER table → 403', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    seatMeAtTable2()
    const res = await scoresPost(
      jsonReq({ tableNumber: 2, round: 1, placements: [{ playerId: 'p3', placement: 1, gamePoints: 8 }] }),
      params({ eventId: EVENT_ID })
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Placements must reference players seated at your table')
    expect(mockDb.tableScore.create).not.toHaveBeenCalled()
  })

  it('player submits own table → 200, PENDING_CONFIRM with scored placements', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    seatMeAtTable2()
    mockDb.tableScore.findUnique.mockResolvedValue(null)
    const res = await scoresPost(
      jsonReq({ tableNumber: 2, round: 1, placements: validPlacements, action: 'submit' }),
      params({ eventId: EVENT_ID })
    )
    expect(res.status).toBe(200)
    expect(mockDb.tableScore.create).toHaveBeenCalledTimes(1)
    const data = mockDb.tableScore.create.mock.calls[0][0].data
    expect(data.state).toBe('PENDING_CONFIRM')
    expect(data.tableNumber).toBe(2)
    expect(data.submittedBy).toBe(ME.id)
    expect(data.placements.create).toHaveLength(2)
  })

  it('P2 regression: player CONFIRMS with placements: [] → 200 (was 403 after the S3 fix)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    seatMeAtTable2()
    // The score to confirm was submitted by ANOTHER player at the table.
    mockDb.tableScore.findUnique.mockResolvedValue({ id: 'ts1', state: 'PENDING_CONFIRM', submittedBy: OTHER_PLAYER.id })
    const res = await scoresPost(
      jsonReq({ tableNumber: 2, round: 1, placements: [], action: 'confirm' }),
      params({ eventId: EVENT_ID })
    )
    expect(res.status).toBe(200)
    expect(mockDb.tableScore.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'LOCKED', confirmedBy: ME.id }) })
    )
  })

  it('player cannot confirm their OWN submission → 403 (dual-score guard)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    seatMeAtTable2()
    mockDb.tableScore.findUnique.mockResolvedValue({ id: 'ts1', state: 'PENDING_CONFIRM', submittedBy: ME.id })
    const res = await scoresPost(
      jsonReq({ tableNumber: 2, round: 1, placements: [], action: 'confirm' }),
      params({ eventId: EVENT_ID })
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/cannot confirm your own/i)
    expect(mockDb.tableScore.update).not.toHaveBeenCalled()
  })

  it('staff submits any table directly → 200, LOCKED (proxy entry)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.tableScore.findUnique.mockResolvedValue(null)
    // Staff need no seating: targeting table 1 without a Player row works.
    mockDb.player.findFirst.mockResolvedValue(null)
    const res = await scoresPost(
      jsonReq({ tableNumber: 1, round: 1, placements: [{ playerId: 'p3', placement: 1, gamePoints: 8 }], action: 'submit' }),
      params({ eventId: EVENT_ID })
    )
    expect(res.status).toBe(200)
    expect(mockDb.tableScore.create.mock.calls[0][0].data.state).toBe('LOCKED')
  })

  it('C2: malformed payload (missing placements) → 400 before any authz DB work', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    const res = await scoresPost(jsonReq({ tableNumber: 2, round: 1 }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid request body')
    expect(mockDb.event.findUnique).not.toHaveBeenCalled()
  })

  it('C2: garbage values → 400 (tableNumber 0, string gamePoints)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    const res1 = await scoresPost(jsonReq({ tableNumber: 0, round: 1, placements: validPlacements }), params({ eventId: EVENT_ID }))
    expect(res1.status).toBe(400)
    const res2 = await scoresPost(
      jsonReq({ tableNumber: 2, round: 1, placements: [{ playerId: 'p-me', placement: 1, gamePoints: 'twelve' }] }),
      params({ eventId: EVENT_ID })
    )
    expect(res2.status).toBe(400)
    expect(mockDb.tableScore.create).not.toHaveBeenCalled()
  })
})

// ──────────────────────────────────────────────────────────────────────
// PATCH/DELETE /api/events/[eventId]/players/[playerId] — the S4 matrix
// ──────────────────────────────────────────────────────────────────────

describe('PATCH /api/events/[eventId]/players/[playerId]', () => {
  it('anon → 401', async () => {
    signedIn(null)
    const res = await playerPatch(jsonReq({ checkedIn: true }), params({ eventId: EVENT_ID, playerId: 'p-me' }))
    expect(res.status).toBe(401)
  })

  it('non-participant → 403', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(null)
    const res = await playerPatch(jsonReq({ checkedIn: true }), params({ eventId: EVENT_ID, playerId: 'p-me' }))
    expect(res.status).toBe(403)
  })

  it('S4 regression: PLAYER toggling ANOTHER player → 403', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.player.findFirst.mockResolvedValue({ id: 'p-other', eventId: EVENT_ID, userId: OTHER_PLAYER.id })
    const res = await playerPatch(jsonReq({ checkedIn: true }), params({ eventId: EVENT_ID, playerId: 'p-other' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Not authorized')
    expect(mockDb.player.update).not.toHaveBeenCalled()
  })

  it('PLAYER toggling own row → 200, persisted as true', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.player.findFirst.mockResolvedValue({ id: 'p-me', eventId: EVENT_ID, userId: ME.id })
    mockDb.player.update.mockResolvedValue({ id: 'p-me', checkedIn: true })
    const res = await playerPatch(jsonReq({ checkedIn: true }), params({ eventId: EVENT_ID, playerId: 'p-me' }))
    expect(res.status).toBe(200)
    expect(mockDb.player.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { checkedIn: true } })
    )
  })

  it('S4: truthy junk ("yes", 1) coerces to FALSE, never silently true', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.player.findFirst.mockResolvedValue({ id: 'p-me', eventId: EVENT_ID, userId: ME.id })
    mockDb.player.update.mockResolvedValue({ id: 'p-me' })
    await playerPatch(jsonReq({ checkedIn: 'yes' }), params({ eventId: EVENT_ID, playerId: 'p-me' }))
    await playerPatch(jsonReq({ ready: 1 }), params({ eventId: EVENT_ID, playerId: 'p-me' }))
    const calls = mockDb.player.update.mock.calls
    expect(calls[0][0].data).toEqual({ checkedIn: false })
    expect(calls[1][0].data).toEqual({ ready: false })
  })

  it('ORGANIZER toggles any player → 200 (no self-ownership requirement)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.player.update.mockResolvedValue({ id: 'p-other' })
    const res = await playerPatch(jsonReq({ ready: true }), params({ eventId: EVENT_ID, playerId: 'p-other' }))
    expect(res.status).toBe(200)
    expect(mockDb.player.findFirst).not.toHaveBeenCalled()
  })

  it('player not in this event (P2025) → 404, IDOR-scoped', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.player.update.mockRejectedValue({ code: 'P2025' })
    const res = await playerPatch(jsonReq({ ready: true }), params({ eventId: EVENT_ID, playerId: 'p-elsewhere' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Player not found in this event')
  })
})

describe('DELETE /api/events/[eventId]/players/[playerId]', () => {
  it('PLAYER → 403 (organizer only)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    const res = await playerDelete(new Request('http://localhost/x'), params({ eventId: EVENT_ID, playerId: 'p-other' }))
    expect(res.status).toBe(403)
    expect(mockDb.player.delete).not.toHaveBeenCalled()
  })

  it('ORGANIZER → 200', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.player.delete.mockResolvedValue({ id: 'p-other' })
    const res = await playerDelete(new Request('http://localhost/x'), params({ eventId: EVENT_ID, playerId: 'p-other' }))
    expect(res.status).toBe(200)
    expect(mockDb.player.delete).toHaveBeenCalledWith({
      where: { id_eventId: { id: 'p-other', eventId: EVENT_ID } },
    })
  })
})

// ──────────────────────────────────────────────────────────────────────
// judge-calls — the S6 matrix + C8.5 enum
// ──────────────────────────────────────────────────────────────────────

describe('PATCH /api/events/[eventId]/judge-calls/[callId]', () => {
  it('anon → 401', async () => {
    signedIn(null)
    const res = await judgeCallPatch(jsonReq({ action: 'acknowledge' }), params({ eventId: EVENT_ID, callId: 'jc1' }))
    expect(res.status).toBe(401)
  })

  it('S6 regression: PLAYER acknowledging a call → 403', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    const res = await judgeCallPatch(jsonReq({ action: 'acknowledge' }), params({ eventId: EVENT_ID, callId: 'jc1' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Organizer or judge only')
    expect(mockDb.judgeCall.update).not.toHaveBeenCalled()
  })

  it('JUDGE acknowledges → 200, timestamped', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'JUDGE'))
    mockDb.judgeCall.update.mockResolvedValue({ id: 'jc1' })
    const res = await judgeCallPatch(jsonReq({ action: 'acknowledge' }), params({ eventId: EVENT_ID, callId: 'jc1' }))
    expect(res.status).toBe(200)
    expect(mockDb.judgeCall.update).toHaveBeenCalledWith({
      where: { id_eventId: { id: 'jc1', eventId: EVENT_ID } },
      data: expect.objectContaining({ status: 'ACKNOWLEDGED', acknowledgedAt: expect.any(Date) }),
    })
  })

  it('ORGANIZER resolves → 200', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.judgeCall.update.mockResolvedValue({ id: 'jc1' })
    const res = await judgeCallPatch(jsonReq({ action: 'resolve' }), params({ eventId: EVENT_ID, callId: 'jc1' }))
    expect(res.status).toBe(200)
    expect(mockDb.judgeCall.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESOLVED' }) })
    )
  })

  it('C2: unknown action → 400 (previously success:true with no write)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    const res = await judgeCallPatch(jsonReq({ action: 'nuke' }), params({ eventId: EVENT_ID, callId: 'jc1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid request body')
    expect(mockDb.judgeCall.update).not.toHaveBeenCalled()
  })

  it('call in another event (P2025) → 404, IDOR-scoped', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'ORGANIZER'))
    mockDb.judgeCall.update.mockRejectedValue({ code: 'P2025' })
    const res = await judgeCallPatch(jsonReq({ action: 'resolve' }), params({ eventId: EVENT_ID, callId: 'jc-elsewhere' }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/events/[eventId]/judge-calls', () => {
  it('anon → 401', async () => {
    signedIn(null)
    const res = await judgeCallPost(jsonReq({ tableNumber: 2, category: 'SCORE' }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(401)
  })

  it('C8.5: arbitrary category → 400 (was persisted verbatim)', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    const res = await judgeCallPost(jsonReq({ tableNumber: 2, category: 'URGENT!!!' }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(400)
    expect(mockDb.judgeCall.create).not.toHaveBeenCalled()
  })

  it('PLAYER creates a valid call → 200, PENDING with null message', async () => {
    signedIn(ME)
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow(ME.id, EVENT_ID, 'PLAYER'))
    mockDb.judgeCall.create.mockResolvedValue({ id: 'jc-new' })
    const res = await judgeCallPost(jsonReq({ tableNumber: 2, category: 'RULE', message: '' }), params({ eventId: EVENT_ID }))
    expect(res.status).toBe(200)
    expect(mockDb.judgeCall.create).toHaveBeenCalledWith({
      data: {
        eventId: EVENT_ID,
        tableNumber: 2,
        category: 'RULE',
        message: null,
        status: 'PENDING',
      },
    })
  })
})

// ──────────────────────────────────────────────────────────────────────
// POST /api/events — S9.1 template ownership + create flow
// ──────────────────────────────────────────────────────────────────────

describe('POST /api/events', () => {
  it('anon → 401', async () => {
    signedIn(null)
    const res = await eventsPost(jsonReq({ name: 'Friday Night' }))
    expect(res.status).toBe(401)
  })

  it('C2: invalid creation body → 400 (totalRounds 0, empty name)', async () => {
    signedIn(ME)
    const res1 = await eventsPost(jsonReq({ name: 'X', totalRounds: 0 }))
    expect(res1.status).toBe(400)
    const res2 = await eventsPost(jsonReq({ name: '   ' }))
    expect(res2.status).toBe(400)
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('S9.1: templateId owned by ANOTHER user → 404 (was loadable verbatim)', async () => {
    signedIn(ME)
    mockDb.eventTemplate.findFirst.mockResolvedValue(null)
    const res = await eventsPost(jsonReq({ name: 'Clone Attempt', templateId: 'tpl-someone-else' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Template not found')
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('C8.6: minPlayersPerTable > maxPlayersPerTable → 400', async () => {
    signedIn(ME)
    const res = await eventsPost(jsonReq({ name: 'Bad Config', minPlayersPerTable: 5, maxPlayersPerTable: 2 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/minPlayersPerTable/)
  })

  it('happy path → 200, event + ORGANIZER participant in one transaction', async () => {
    signedIn(ME)
    const created = {
      id: 'ev-new',
      name: 'Friday Night',
      gameName: 'Catan',
      gameBggId: null,
      gameMaxPlayers: null,
      minPlayersPerTable: 3,
      maxPlayersPerTable: 4,
      totalRounds: 3,
      status: 'DRAFT',
      currentRound: 0,
      primeTier: 'FREE',
      eventCode: 'FRIDAY-AB12',
      scoringRulesJson: JSON.stringify(makeDefaultScoringRules()),
      description: null,
      scheduleJson: null,
      bannerSeedOffset: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    mockDb.event.create.mockResolvedValue(created)
    const res = await eventsPost(
      jsonReq({ name: 'Friday Night', gameName: 'Catan', minPlayersPerTable: 3, totalRounds: 3 })
    )
    expect(res.status).toBe(200)
    expect(mockDb.eventParticipant.create).toHaveBeenCalledWith({
      data: { userId: ME.id, eventId: 'ev-new', role: 'ORGANIZER' },
    })
    const body = (await res.json()) as { event: { name: string; totalRounds: number; playerIds: string[] } }
    expect(body.event.name).toBe('Friday Night')
    expect(body.event.totalRounds).toBe(3)
  })
})
