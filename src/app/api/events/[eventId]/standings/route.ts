/**
 * GET /api/events/[eventId]/standings → computed standings with tiebreakers
 */
import { NextResponse } from 'next/server'
import { requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { aggregateStandings } from '@/lib/engine/scoring-engine'
import type { ScoringRules } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  // Fetch event + players + only LOCKED/DISPUTED scores in parallel.
  // (PENDING_CONFIRM and MISSING scores don't contribute to standings.)
  const [event, players, scores] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: { id: true, scoringRulesJson: true },
    }),
    db.player.findMany({
      where: { eventId },
      select: { id: true, name: true, color: true },
    }),
    db.tableScore.findMany({
      where: { eventId, state: { in: ['LOCKED', 'DISPUTED'] } },
      include: {
        placements: {
          select: { playerId: true, placement: true, gamePoints: true, basePoints: true, bonus: true, total: true },
        },
      },
    }),
  ])
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const scoringRules: ScoringRules = JSON.parse(event.scoringRulesJson)
  const playerIds = players.map((p) => p.id)

  const scoresData = scores.map((s) => ({
    placements: s.placements.map((p) => ({
      playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
      basePoints: p.basePoints, bonus: p.bonus, total: p.total,
    })),
    state: s.state, round: s.round, tableNumber: s.tableNumber,
    tablePointsTotal: s.tablePointsTotal,
  }))

  const standings = aggregateStandings(playerIds, scoresData, scoringRules)

  // Enrich with player names
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const enriched = standings.map((row) => ({
    ...row,
    name: playerMap.get(row.playerId)?.name ?? 'Unknown',
    color: playerMap.get(row.playerId)?.color ?? 'bg-rose-500',
  }))

  return NextResponse.json({ standings: enriched })
}
