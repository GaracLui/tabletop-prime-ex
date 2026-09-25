/**
 * GET /api/participants/:eventId — get the current user's role in a specific event.
 *
 * NOTE: PATCH was removed — it allowed self-escalation to ORGANIZER.
 * Role changes must go through PATCH /api/events/[eventId]/participants,
 * which verifies the caller is an existing ORGANIZER of that event.
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const userId = auth.value.profile.id
  const { eventId } = await params

  const participant = await db.eventParticipant.findUnique({
    where: { userId_eventId: { userId, eventId } },
  })

  if (!participant) {
    return NextResponse.json({ role: null })
  }

  return NextResponse.json({ role: participant.role })
}
