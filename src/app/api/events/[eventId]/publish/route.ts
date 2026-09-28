/**
 * POST   /api/events/[eventId]/publish — publish the event (share visibility)
 * DELETE /api/events/[eventId]/publish — unpublish it (S8)
 *
 * S8: every event used to be publicly shareable from creation — the code
 * alone made /share/[code] + /api/public/[code] serve the roster and
 * standings forever, with no organizer-facing "unshare" control. The
 * Event.visibility column turns share into a real state transition:
 *
 *   POST   → generates the code if missing (it doubles as the join code,
 *            so it exists from creation on NEW events and stays stable
 *            across cycles) and sets visibility = PUBLIC. Idempotent.
 *   DELETE → sets visibility = PRIVATE. The code is deliberately KEPT so
 *            printed QR codes / posters keep working after a re-publish;
 *            only the public surface goes dark (404).
 *
 * Join-by-code (/api/events/lookup) is unaffected by visibility in both
 * directions — participants join with the code regardless.
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { generateEventCode } from '@/lib/event-code'

/** How many code collisions we tolerate before giving up (S9.6). */
const MAX_CODE_ATTEMPTS = 5

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // S9.6: the collision loop used to fall through with the colliding code
  // after 5 attempts → guaranteed unique-constraint 500. Astronomically
  // unlikely (40-bit CSPRNG suffix), but fail honestly with 503 instead.
  let code = event.eventCode
  if (!code) {
    code = generateEventCode(event.name)
    let attempts = 0
    while ((await db.event.findUnique({ where: { eventCode: code } })) && attempts < MAX_CODE_ATTEMPTS) {
      code = generateEventCode(event.name)
      attempts++
    }
    if (attempts >= MAX_CODE_ATTEMPTS && (await db.event.findUnique({ where: { eventCode: code } }))) {
      console.error(`publish: exhausted eventCode collision retries for event ${eventId}`)
      return NextResponse.json(
        { error: 'Could not allocate a unique event code — please retry' },
        { status: 503 }
      )
    }
  }

  // Idempotent: re-publishing an already-public event just flips the flag
  // back on (e.g. after an unpublish) and returns the current code.
  await db.event.update({
    where: { id: eventId },
    data: { eventCode: code, visibility: 'PUBLIC' },
  })
  return NextResponse.json({ eventCode: code, visibility: 'PUBLIC' })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Keep eventCode: join-by-code survives, printed QR codes recover after
  // a re-publish. Only the PUBLIC share surface (share page + public API)
  // goes dark.
  await db.event.update({
    where: { id: eventId },
    data: { visibility: 'PRIVATE' },
  })
  return NextResponse.json({ eventCode: event.eventCode, visibility: 'PRIVATE' })
}
