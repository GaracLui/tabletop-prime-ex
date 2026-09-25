/**
 * POST /api/events/[eventId]/players/check-in-all
 *
 * Marks all unchecked-in players as checked-in for an event, in a single
 * UPDATE. Replaces the previous pattern of N PATCH requests from the client.
 *
 * Optional body: { playerIds?: string[] }
 *   - If `playerIds` is provided, only those players are checked in
 *     (still skips players already checked in).
 *   - If omitted, ALL unchecked-in players in the event are checked in.
 *
 * Returns: { updated: number }
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const playerIds: string[] | undefined = Array.isArray(body?.playerIds) ? body.playerIds : undefined

    // Single UPDATE — much faster than N PATCH requests.
    const result = await db.player.updateMany({
      where: {
        eventId,
        checkedIn: false,
        ...(playerIds ? { id: { in: playerIds } } : {}),
      },
      data: { checkedIn: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (err) {
    console.error('Bulk check-in error:', err)
    return NextResponse.json({ error: 'Failed to check in players' }, { status: 500 })
  }
}
