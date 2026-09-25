/**
 * POST /api/events/[eventId]/publish — set/generate event code for sharing
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { generateEventCode } from '@/lib/event-code'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (event.eventCode) {
    return NextResponse.json({ eventCode: event.eventCode })
  }

  let code = generateEventCode(event.name)
  let attempts = 0
  while (attempts < 5) {
    const collision = await db.event.findUnique({ where: { eventCode: code } })
    if (!collision) break
    code = generateEventCode(event.name)
    attempts++
  }

  // S9.6: after 5 collision attempts, previously fell through with the
  // colliding code → guaranteed unique-constraint 500. Astronomically
  // unlikely (40-bit CSPRNG suffix), but fail honestly with 503 instead.
  if (attempts >= 5) {
    const lastCollision = await db.event.findUnique({ where: { eventCode: code } })
    if (lastCollision) {
      console.error(`publish: exhausted eventCode collision retries for event ${eventId}`)
      return NextResponse.json(
        { error: 'Could not allocate a unique event code — please retry' },
        { status: 503 }
      )
    }
  }

  await db.event.update({ where: { id: eventId }, data: { eventCode: code } })
  return NextResponse.json({ eventCode: code })
}
