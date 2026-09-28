/**
 * GET /api/public/[eventCode]
 *
 * Public, read-only endpoint — NO AUTH REQUIRED.
 * Returns event name, status, standings, and current round pairings.
 * Used by the /share/[eventCode] public page.
 *
 * S8: only serves events whose organizer has PUBLISHED them
 * (visibility = PUBLIC). Private events 404 here — indistinguishable from
 * a wrong code, so the endpoint neither leaks a draft roster/standings nor
 * even reveals that the code exists. Join-by-code (/api/events/lookup) is
 * a separate, authenticated surface and is unaffected.
 *
 * Does NOT return: emails, user IDs, participant lists, or edit capabilities.
 * Only returns: player names, colors, placements, scores, table assignments,
 * description (organizer-provided plain text), and schedule (ISO 8601 strings).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aggregateStandings } from '@/lib/engine/scoring-engine'
import { parseSchedule } from '@/lib/serialize'
import type { ScoringRules } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventCode: string }> }
) {
  const { eventCode } = await params

  // S8: visibility gate — PRIVATE events must not leak roster/standings.
  // Filtering in the WHERE clause (not after the fetch) keeps the 404
  // identical to "unknown code", so the endpoint never confirms that a
  // private event's code is real.
  const event = await db.event.findUnique({
    where: { eventCode, visibility: 'PUBLIC' },
    select: {
      id: true,
      name: true,
      gameName: true,
      status: true,
      currentRound: true,
      totalRounds: true,
      scoringRulesJson: true,
      description: true,
      scheduleJson: true,
      bannerSeedOffset: true,
      players: {
        select: { id: true, name: true, color: true },
      },
      pairings: {
        orderBy: { round: 'asc' },
        select: {
          round: true,
          format: true,
          tablesJson: true,
          droppedPlayerIdsJson: true,
          label: true,
          isBonus: true,
        },
      },
      scores: {
        where: { state: { in: ['LOCKED', 'DISPUTED'] } },
        include: {
          placements: {
            select: {
              playerId: true, placement: true, gamePoints: true,
              basePoints: true, bonus: true, total: true,
            },
          },
        },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Compute standings
  const scoringRules: ScoringRules = JSON.parse(event.scoringRulesJson)
  const playerIds = event.players.map((p) => p.id)
  const scoresData = event.scores.map((s) => ({
    placements: s.placements.map((p) => ({
      playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
      basePoints: p.basePoints, bonus: p.bonus, total: p.total,
    })),
    state: s.state, round: s.round, tableNumber: s.tableNumber,
    tablePointsTotal: s.tablePointsTotal,
  }))
  const standings = aggregateStandings(playerIds, scoresData, scoringRules)

  const playerMap = new Map(event.players.map((p) => [p.id, p]))
  const enrichedStandings = standings.map((row) => ({
    name: playerMap.get(row.playerId)?.name ?? 'Unknown',
    color: playerMap.get(row.playerId)?.color ?? 'bg-rose-500',
    total: row.total,
    gamePointsTotal: row.gamePointsTotal,
    rounds: row.rounds,
  }))

  // Build a lookup map for table scores: (round, tableNumber) → { state, placementsByPlayerId }
  // This lets the share page show a green background + placement numbers
  // for tables whose score is LOCKED or DISPUTED.
  const scoreLookup = new Map<
    string,
    { state: string; placements: Record<string, number> }
  >()
  for (const s of event.scores) {
    const key = `${s.round}:${s.tableNumber}`
    const placements: Record<string, number> = {}
    for (const p of s.placements) {
      placements[p.playerId] = p.placement
    }
    scoreLookup.set(key, { state: s.state, placements })
  }

  // Serialize pairings (parse JSON, enrich with player names + score data)
  const pairings = event.pairings.map((r) => ({
    round: r.round,
    format: r.format,
    label: r.label,
    isBonus: r.isBonus,
    tables: (JSON.parse(r.tablesJson) as any[]).map((t) => {
      const scoreKey = `${r.round}:${t.tableNumber}`
      const score = scoreLookup.get(scoreKey)
      return {
        tableNumber: t.tableNumber,
        players: t.playerIds.map((id: string) => ({
          id,
          name: playerMap.get(id)?.name ?? 'Unknown',
          color: playerMap.get(id)?.color ?? 'bg-rose-500',
          // Placement number (1, 2, 3...) when the table's score is locked.
          // null when score is not yet locked or player has no placement.
          placement: score && (score.state === 'LOCKED' || score.state === 'DISPUTED')
            ? score.placements[id] ?? null
            : null,
        })),
        // Score state for this table: 'LOCKED', 'DISPUTED', 'PENDING_CONFIRM', 'MISSING', or null
        scoreState: score?.state ?? null,
      }
    }),
  }))

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      gameName: event.gameName,
      status: event.status,
      currentRound: event.currentRound,
      totalRounds: event.totalRounds,
      description: event.description ?? null,
      schedule: parseSchedule(event.scheduleJson),
      bannerSeedOffset: event.bannerSeedOffset ?? 0,
    },
    standings: enrichedStandings,
    pairings,
  })
}
