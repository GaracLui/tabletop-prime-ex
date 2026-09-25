/**
 * Players API — manage players within an event.
 *
 * GET   /api/events/[eventId]/players          → list players
 * POST  /api/events/[eventId]/players          → add player(s)
 * PATCH /api/events/[eventId]/players/[playerId] → update (checkIn, ready)
 */
import { NextResponse } from 'next/server'
import { requireOrganizer, requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { createPlayersByName, sanitizePlayerName } from '@/lib/player-utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  const players = await db.player.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ players })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()

    // Support both single name and array of names (bulk add)
    const rawNames: string[] = Array.isArray(body.names) ? body.names : [body.name]

    // Sanitize each name: trim, collapse whitespace, cap at MAX_PLAYER_NAME_LENGTH.
    // Track rejections so the client can surface a helpful error.
    const seen = new Set<string>()
    const names: string[] = []
    const rejected: Array<{ name: string; reason: string }> = []
    for (const raw of rawNames) {
      const sanitized = sanitizePlayerName(raw)
      if (!sanitized) {
        // Skip empties silently — bulk paste often has blank lines
        continue
      }
      const key = sanitized.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(sanitized)
      // Note: sanitizePlayerName already caps at MAX_PLAYER_NAME_LENGTH,
      // so we don't need a separate "too long" rejection here — the name
      // is silently truncated. If we wanted to reject instead of truncate,
      // we'd check raw.length > MAX_PLAYER_NAME_LENGTH before sanitizing.
    }
    if (names.length === 0) {
      return NextResponse.json({ players: [], rejected })
    }

    const created = await createPlayersByName(eventId, names)

    return NextResponse.json({ players: created, rejected })
  } catch (err) {
    console.error('Add player error:', err)
    return NextResponse.json({ error: 'Failed to add player' }, { status: 500 })
  }
}
