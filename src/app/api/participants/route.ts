/**
 * Participants API — manage event participation.
 *
 * GET  /api/participants          → list current user's participations
 * POST /api/participants          → join an event (always as PLAYER)
 *
 * Security: this route ALWAYS creates participants as PLAYER. Only an
 * existing ORGANIZER can promote someone to JUDGE or ORGANIZER (via
 * PATCH /api/events/[eventId]/participants, which checks the caller's role).
 */
import { NextResponse } from 'next/server'
import { requireAuth, isDeletionPending, deletionPendingResponse } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { createPlayerRow } from '@/lib/player-utils'

/** GET /api/participants — list all events the current user participates in. */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const userId = auth.value.profile.id

  const participants = await db.eventParticipant.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ participants })
}

/** POST /api/participants — join an event. Always as PLAYER. */
export async function POST(req: Request) {
  // S7: join is the brute-force vector for event membership — throttle it.
  const limit = checkRateLimit(req, 'join')
  if (!limit.ok) return limit.response

  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  // S9.3: refuse writes for accounts with a pending deletion request
  // (30-day GDPR window) — matches the documented enforcement.
  if (isDeletionPending(profile)) return deletionPendingResponse()

  try {
    const { eventId } = await req.json()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // ALWAYS join as PLAYER. Role escalation (PLAYER → JUDGE → ORGANIZER)
    // must go through PATCH /api/events/[eventId]/participants, which
    // verifies the caller is an existing ORGANIZER.
    const participant = await db.eventParticipant.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, role: 'PLAYER' },
      update: {}, // no-op if already a participant — don't change their role
    })

    // Create a Player row linked to this user
    await createPlayerRow(eventId, userId)

    return NextResponse.json({ participant })
  } catch {
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 })
  }
}
