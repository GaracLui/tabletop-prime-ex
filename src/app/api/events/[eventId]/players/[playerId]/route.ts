/**
 * PATCH /api/events/[eventId]/players/[playerId] — update player (checkIn, ready)
 * DELETE /api/events/[eventId]/players/[playerId] — remove player
 *
 * Security: both handlers scope the query by (id, eventId) to prevent
 * cross-event IDOR — a participant of event A cannot modify/delete a
 * player in event B by guessing the playerId.
 *
 * PATCH permission model (S4):
 *   - ORGANIZER: may update any player in their event (dashboard toggles).
 *   - Anyone else: may only update their OWN player row — the companion
 *     check-in / ready toggle. Ownership = the Player row's userId matches
 *     the authenticated user. Previously ANY participant could toggle ANY
 *     player's flags (e.g. un-check-in a rival moments before pairing
 *     generation, silently excluding them from the round).
 *   - Booleans are coerced with `=== true` so truthy junk ("yes", 1, {})
 *     can't be persisted.
 * DELETE: ORGANIZER only.
 */
import { NextResponse } from 'next/server'
import { requireParticipant, requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string; playerId: string }> }
) {
  const { eventId, playerId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response
  const { profile, participant } = auth.value
  const userId = profile.id

  try {
    const body = await req.json()

    // Strict boolean coercion (S4): only a literal `true` sets the flag.
    const updateData: { checkedIn?: boolean; ready?: boolean } = {}
    if (body.checkedIn !== undefined) updateData.checkedIn = body.checkedIn === true
    if (body.ready !== undefined) updateData.ready = body.ready === true

    const isOrganizer = participant.role === 'ORGANIZER'

    if (!isOrganizer) {
      // Self-service only (S4): load the target player and verify it belongs
      // to the caller. Manual players (userId = null) are organizer-managed.
      const target = await db.player.findFirst({
        where: { id: playerId, eventId },
        select: { userId: true },
      })
      if (!target || target.userId !== userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    // Scope by BOTH id AND eventId — prevents cross-event IDOR.
    // If the player doesn't belong to this event, the update affects 0 rows
    // and Prisma throws P2025 (record not found).
    const player = await db.player.update({
      where: { id_eventId: { id: playerId, eventId } },
      data: updateData,
    })
    return NextResponse.json({ player })
  } catch (err: any) {
    // P2025 = record not found (player doesn't exist in this event)
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Player not found in this event' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; playerId: string }> }
) {
  const { eventId, playerId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    // Scope by BOTH id AND eventId — prevents cross-event IDOR.
    await db.player.delete({
      where: { id_eventId: { id: playerId, eventId } },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Player not found in this event' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}
