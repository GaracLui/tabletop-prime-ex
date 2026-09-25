/**
 * DELETE /api/events/[eventId]/bonus-rounds/[round]
 *
 * Deletes a bonus round and all its associated scores.
 * Only organizer can delete. Only bonus rounds (isBonus = true) can be
 * deleted via this route — regular rounds must be managed via the
 * pairings PATCH route (regenerate action).
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string; round: string }> }
) {
  const { eventId, round: roundStr } = await params
  const round = Number(roundStr)
  if (!round) return NextResponse.json({ error: 'Invalid round' }, { status: 400 })

  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    // Find the bonus round — must be isBonus = true to prevent deleting
    // regular rounds via this route.
    const existing = await db.roundPairing.findFirst({
      where: { eventId, round, isBonus: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Bonus round not found' }, { status: 404 })
    }

    // Delete scores for this round first (PlacementScore cascades via FK).
    // TableScore has onDelete: Cascade on the relation, but we need to
    // delete by (eventId, round) since there's no direct FK from TableScore
    // to RoundPairing.
    await db.tableScore.deleteMany({
      where: { eventId, round },
    })

    // Delete the bonus round itself
    await db.roundPairing.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete bonus round error:', err)
    return NextResponse.json({ error: 'Failed to delete bonus round' }, { status: 500 })
  }
}
