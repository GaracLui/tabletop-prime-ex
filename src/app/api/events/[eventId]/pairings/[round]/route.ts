/**
 * PATCH /api/events/[eventId]/pairings/[round]
 *
 * Body: { action: 'drop' | 'reintroduce' | 'reassign', playerId: string, toTableNumber?: number }
 *
 *   drop         — remove the player from this round's tables (they stay in the event)
 *   reintroduce  — re-seat a previously-dropped player at the table with the most room
 *   reassign     — move a player from their current table to toTableNumber
 *
 * All three persist the updated tablesJson / droppedPlayerIdsJson on the round pairing.
 * Reassign / drop will also clear any score for the affected table (state goes back to MISSING).
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import {
  reassignPlayer,
  dropPlayerFromRound,
  reintroducePlayer,
  normalizeLegacyFormat,
} from '@/lib/engine/pairing-engine'
import type { RoundPairing, RoundFormat } from '@/lib/types'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string; round: string }> }
) {
  const { eventId, round: roundStr } = await params
  const round = Number(roundStr)
  if (!round) return NextResponse.json({ error: 'Invalid round' }, { status: 400 })

  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { action, playerId, toTableNumber } = body
    if (!action || !playerId) {
      return NextResponse.json({ error: 'Missing action or playerId' }, { status: 400 })
    }

    // C8.2: this used to `include: { pairings: true, scores: true }` but
    // `scores` was never read below — every call shipped every TableScore
    // (with all its PlacementScore rows) over the wire for nothing. Only
    // the pairings are needed to mutate the round.
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { pairings: true },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const existing = event.pairings.find((p) => p.round === round)
    if (!existing) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const pairing: RoundPairing = {
      round: existing.round,
      format: normalizeLegacyFormat(existing.format),
      tables: JSON.parse(existing.tablesJson),
      droppedPlayerIds: JSON.parse(existing.droppedPlayerIdsJson),
    }

    let next: RoundPairing
    const affectedTables: number[] = []

    if (action === 'drop') {
      next = dropPlayerFromRound(pairing, playerId)
      // Find the table the player was at (for score clearing)
      const wasAt = pairing.tables.find((t) => t.playerIds.includes(playerId))
      if (wasAt) affectedTables.push(wasAt.tableNumber)
    } else if (action === 'reintroduce') {
      next = reintroducePlayer(pairing, playerId, event.maxPlayersPerTable)
      // Find the table they were placed at
      const nowAt = next.tables.find((t) => t.playerIds.includes(playerId))
      if (nowAt) affectedTables.push(nowAt.tableNumber)
    } else if (action === 'reassign') {
      if (!toTableNumber) return NextResponse.json({ error: 'Missing toTableNumber' }, { status: 400 })
      next = reassignPlayer(pairing, playerId, Number(toTableNumber))
      // Clear scores for both source and target tables
      const source = pairing.tables.find((t) => t.playerIds.includes(playerId))
      if (source) affectedTables.push(source.tableNumber)
      affectedTables.push(Number(toTableNumber))
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Persist
    await db.roundPairing.update({
      where: { id: existing.id },
      data: {
        tablesJson: JSON.stringify(next.tables),
        droppedPlayerIdsJson: JSON.stringify(next.droppedPlayerIds),
      },
    })

    // Clear scores for affected tables (round was modified)
    if (affectedTables.length > 0) {
      const unique = Array.from(new Set(affectedTables))
      await db.tableScore.deleteMany({
        where: { eventId, round, tableNumber: { in: unique } },
      })
    }

    return NextResponse.json({ pairing: next })
  } catch (err) {
    console.error('Pairing PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update pairing' }, { status: 500 })
  }
}
