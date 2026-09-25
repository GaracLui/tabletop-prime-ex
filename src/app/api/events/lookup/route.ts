/**
 * POST /api/events/lookup — find an event by its code.
 * Returns the event's public info so players can preview before joining.
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  // S7: lookup-by-code is the enumeration vector — throttle it.
  const limit = checkRateLimit(req, 'lookup')
  if (!limit.ok) return limit.response

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ error: 'Event code is required' }, { status: 400 })
    }

    const normalizedCode = code.trim().toUpperCase()

    const event = await db.event.findUnique({
      where: { eventCode: normalizedCode },
      include: { players: true, organizer: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({
      event: {
        eventId: event.id,
        name: event.name,
        gameName: event.gameName,
        minPlayersPerTable: event.minPlayersPerTable,
        maxPlayersPerTable: event.maxPlayersPerTable,
        totalRounds: event.totalRounds,
        status: event.status,
        currentRound: event.currentRound,
        organizerName: event.organizer?.name ?? 'Unknown',
        eventCode: event.eventCode,
        playerCount: event.players.length,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
