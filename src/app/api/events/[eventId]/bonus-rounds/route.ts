/**
 * POST /api/events/[eventId]/bonus-rounds
 *
 * Creates a bonus round with a custom subset of players and a label.
 * Bonus rounds do NOT change Event.currentRound — they are independent
 * of the regular round flow.
 *
 * Bonus rounds use round numbers starting at 1001 to avoid collision with
 * regular rounds (1-50). This prevents the unique constraint violation
 * that occurred when bonus rounds occupied round 1, 2, 3... and the
 * organizer tried to generate regular round 1.
 *
 * Body: {
 *   label: string,           // e.g., "Top 5 Playoff"
 *   playerIds: string[],     // subset of event players to include
 *   format?: RoundFormat,    // defaults to ROUND_ROBIN
 *   minPerTable?: number,    // defaults to event's min
 *   maxPerTable?: number,    // defaults to event's max
 *   parentRound?: number,    // 0 = extra, 1+ = associated with that regular round
 * }
 */
import { NextResponse } from 'next/server'
import { requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import {
  getStrategy,
  normalizeLegacyFormat,
  collectPreviousPairings,
} from '@/lib/engine/pairing-engine'
import { aggregateStandings } from '@/lib/engine/scoring-engine'
import type { Player, RoundPairing, RoundFormat, ScoringRules } from '@/lib/types'

/** Bonus rounds use round numbers starting at 1001 to avoid collision with regular rounds. */
const BONUS_ROUND_BASE = 1000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { label, playerIds, format, minPerTable, maxPerTable, parentRound } = body

    if (!label || typeof label !== 'string' || !label.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }
    if (!Array.isArray(playerIds) || playerIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 players required' }, { status: 400 })
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        minPlayersPerTable: true,
        maxPlayersPerTable: true,
        scoringRulesJson: true,
      },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    // Fetch all event players (we need to filter to the selected subset)
    const allPlayers = await db.player.findMany({
      where: { eventId },
      select: { id: true, name: true, checkedIn: true, ready: true, color: true },
    })

    // Filter to only the requested player IDs
    const selectedPlayers: Player[] = allPlayers
      .filter((p) => playerIds.includes(p.id))
      .map((p) => ({
        id: p.id, name: p.name, checkedIn: p.checkedIn, ready: p.ready, color: p.color,
      }))

    if (selectedPlayers.length < 2) {
      return NextResponse.json({ error: 'Selected players not found in event' }, { status: 400 })
    }

    const minT = minPerTable || event.minPlayersPerTable
    const maxT = maxPerTable || event.maxPlayersPerTable
    const fmt: RoundFormat = normalizeLegacyFormat(format || 'ROUND_ROBIN')

    // Determine the next available BONUS round number (1001+).
    // Only count existing bonus rounds — regular rounds use the 1-50 range.
    const existingBonusPairings = await db.roundPairing.findMany({
      where: { eventId, isBonus: true },
      orderBy: { round: 'desc' },
      take: 1,
    })
    const nextBonusRound =
      existingBonusPairings.length > 0
        ? existingBonusPairings[0].round + 1
        : BONUS_ROUND_BASE + 1

    // Build previous pairings for rematch avoidance
    const allPairings = await db.roundPairing.findMany({
      where: { eventId },
      orderBy: { round: 'asc' },
    })
    const prevPairings: RoundPairing[] = allPairings.map((r) => ({
      round: r.round, format: normalizeLegacyFormat(r.format),
      tables: JSON.parse(r.tablesJson), droppedPlayerIds: JSON.parse(r.droppedPlayerIdsJson),
    }))
    const previous = collectPreviousPairings(prevPairings)

    // Build standings from previous scores (for Swiss, if used)
    const scoringRules: ScoringRules = JSON.parse(event.scoringRulesJson)
    const prevScores = await db.tableScore.findMany({
      where: { eventId, state: { in: ['LOCKED', 'DISPUTED'] } },
      include: {
        placements: {
          select: { playerId: true, placement: true, gamePoints: true, basePoints: true, bonus: true, total: true },
        },
      },
    })
    const scoresData = prevScores.map((s) => ({
      placements: s.placements.map((p) => ({
        playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
        basePoints: p.basePoints, bonus: p.bonus, total: p.total,
      })),
      state: s.state, round: s.round, tableNumber: s.tableNumber,
      tablePointsTotal: s.tablePointsTotal,
    }))
    const standingsMap = new Map<string, number>()
    const standings = aggregateStandings(allPlayers.map((p) => p.id), scoresData, scoringRules)
    for (const row of standings) standingsMap.set(row.playerId, row.total)

    // Generate pairings using the selected strategy
    const strategy = getStrategy(fmt)
    const pairing = strategy.generate({
      players: selectedPlayers,
      round: nextBonusRound,
      minPerTable: minT,
      maxPerTable: maxT,
      previousPairings: previous,
      standings: standingsMap,
    })

    // Normalize parentRound: 0 = extra, 1+ = associated with that round, undefined → 0
    const parent = typeof parentRound === 'number' ? Math.max(0, Math.floor(parentRound)) : 0

    // Save the bonus round
    const created = await db.roundPairing.create({
      data: {
        eventId,
        round: nextBonusRound,
        format: fmt,
        tablesJson: JSON.stringify(pairing.tables),
        droppedPlayerIdsJson: JSON.stringify(pairing.droppedPlayerIds),
        label: label.trim(),
        isBonus: true,
        parentRound: parent,
      },
    })

    return NextResponse.json({
      pairing: {
        round: created.round,
        format: created.format,
        tables: JSON.parse(created.tablesJson),
        droppedPlayerIds: JSON.parse(created.droppedPlayerIdsJson),
        label: created.label,
        isBonus: created.isBonus,
        parentRound: created.parentRound,
      },
    })
  } catch (err) {
    console.error('Bonus round error:', err)
    return NextResponse.json({ error: 'Failed to create bonus round' }, { status: 500 })
  }
}
