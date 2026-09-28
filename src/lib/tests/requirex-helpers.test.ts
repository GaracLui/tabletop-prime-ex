/**
 * Unit tests for the requireX() authorization helpers (C4).
 *
 * C4's fix had two halves:
 *   1. Contract change — the helpers return a discriminated union
 *      `AuthResult<T>` ({ ok: true, value } | { ok: false, response })
 *      instead of the old `participant | NextResponse` union whose
 *      instanceof-check was easy to forget (the exact shape of S4).
 *   2. Adoption — every authz-bearing route routes through them.
 *
 * api-authz.test.ts exercises the helpers THROUGH real route handlers;
 * this file pins the helper contract DIRECTLY: status codes, JSON error
 * bodies, and the value carried on the success branch for every tier of
 * the ladder (auth → participant → staff → organizer). The `if (!r.ok)`
 * narrowing used below is itself the compile-time proof that the
 * discriminated union works — under the old union type this file would
 * not typecheck.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

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
  eventParticipant: { findUnique: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ db: mockDb }))

import {
  requireAuth,
  requireParticipant,
  requireStaff,
  requireOrganizer,
} from '@/lib/supabase/server'

const PROFILE = {
  id: 'u1',
  supabaseAuthId: 'sa1',
  email: 'player@example.com',
  name: 'Player One',
  deletionRequestedAt: null,
}

const participantRow = (role: string) => ({
  id: 'ep1',
  userId: 'u1',
  eventId: 'e1',
  role,
})

describe('requireX() helper contract (C4 discriminated union)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.user.findUnique.mockResolvedValue(PROFILE)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'sa1' } } })
    mockDb.eventParticipant.findUnique.mockResolvedValue(null)
  })

  it('requireAuth: anon → ok:false, 401 { error: "Not authenticated" }', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await requireAuth()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(401)
      expect(await r.response.json()).toEqual({ error: 'Not authenticated' })
    } else {
      throw new Error('expected the failure branch, got ok:true')
    }
  })

  it('requireAuth: authenticated → ok:true carrying the profile', async () => {
    const r = await requireAuth()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.profile.id).toBe('u1')
    } else {
      throw new Error('expected the success branch, got ok:false')
    }
  })

  it('requireParticipant: no participant row → ok:false, 403 { error: "Not authorized" }', async () => {
    const r = await requireParticipant('e1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(403)
      expect(await r.response.json()).toEqual({ error: 'Not authorized' })
    } else {
      throw new Error('expected the failure branch, got ok:true')
    }
  })

  it('requireParticipant: participant → ok:true carrying profile + participant', async () => {
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow('PLAYER'))
    const r = await requireParticipant('e1')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.profile.id).toBe('u1')
      expect(r.value.participant.role).toBe('PLAYER')
    } else {
      throw new Error('expected the success branch, got ok:false')
    }
  })

  it('requireStaff: PLAYER → ok:false, 403 { error: "Organizer or judge only" }', async () => {
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow('PLAYER'))
    const r = await requireStaff('e1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(403)
      expect(await r.response.json()).toEqual({ error: 'Organizer or judge only' })
    } else {
      throw new Error('expected the failure branch, got ok:true')
    }
  })

  it('requireStaff: JUDGE → ok:true (staff tier)', async () => {
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow('JUDGE'))
    const r = await requireStaff('e1')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.participant.role).toBe('JUDGE')
    } else {
      throw new Error('expected the success branch, got ok:false')
    }
  })

  it('requireOrganizer: JUDGE → ok:false, 403 { error: "Organizer only" }', async () => {
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow('JUDGE'))
    const r = await requireOrganizer('e1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(403)
      expect(await r.response.json()).toEqual({ error: 'Organizer only' })
    } else {
      throw new Error('expected the failure branch, got ok:true')
    }
  })

  it('requireOrganizer: ORGANIZER → ok:true', async () => {
    mockDb.eventParticipant.findUnique.mockResolvedValue(participantRow('ORGANIZER'))
    const r = await requireOrganizer('e1')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.participant.role).toBe('ORGANIZER')
    } else {
      throw new Error('expected the success branch, got ok:false')
    }
  })

  it('requireStaff: anon → 401 (auth failure propagates down the ladder)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const r = await requireStaff('e1')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(401)
      expect(await r.response.json()).toEqual({ error: 'Not authenticated' })
    } else {
      throw new Error('expected the failure branch, got ok:true')
    }
  })
})
