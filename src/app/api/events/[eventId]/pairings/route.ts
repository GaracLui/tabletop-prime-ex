/**
 * Pairings API — generate and manage round pairings.
 *
 * GET  /api/events/[eventId]/pairings       → list all pairings
 * POST /api/events/[eventId]/pairings       → generate next round or regenerate
 *
 * Body for POST: { action: 'generate' | 'regenerate', format?: RoundFormat, round?: number }
 */
import { NextResponse } from 'next/server'
import { requireParticipant, requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import {
  getStrategy,
  collectPreviousPairings,
  normalizeLegacyFormat,
} from '@/lib/engine/pairing-engine'
import type {
  PairingDiagnostics,
  PairingOptions,
  PairingStrategy,
  SeatRotationStrategy,
} from '@/lib/engine/pairing-engine'
import {
  aggregateStandings,
} from '@/lib/engine/scoring-engine'
import type { Player, RoundPairing, RoundFormat, ScoringRules } from '@/lib/types'

// ──────────────────────────────────────────────────────────────────────
// Shared strategy invocation (C8.1 / C8.4)
// ──────────────────────────────────────────────────────────────────────

/**
 * C8.4: RoundConfig.seatRotation is a plain TEXT column (see schema) while
 * the engine expects the SeatRotationStrategy union. Route the stored value
 * through this narrowing check instead of `as any` so a hand-edited row
 * ('CLOCKWISE ') degrades to 'undefined' (engine default) rather than
 * reaching the engine as a bogus strategy.
 */
function normalizeSeatRotation(
  value: string | null | undefined
): SeatRotationStrategy | undefined {
  if (value === 'NONE' || value === 'CLOCKWISE' || value === 'BALANCED') return value
  return undefined
}

/**
 * C8.1: the generate and regenerate branches used to inline two ~20-line
 * near-duplicates of this block. Run the strategy's
 * generateWithDiagnostics when the strategy provides one (v6 engines —
 * feasibility info for the UI), else fall back to plain generate with a
 * null diagnostics payload.
 */
function runPairingStrategy(
  strategy: PairingStrategy,
  opts: PairingOptions
): { pairing: RoundPairing; diagnostics: PairingDiagnostics | null } {
  if (strategy.generateWithDiagnostics) {
    return strategy.generateWithDiagnostics(opts)
  }
  return { pairing: strategy.generate(opts), diagnostics: null }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  const pairings = await db.roundPairing.findMany({
    where: { eventId },
    orderBy: { round: 'asc' },
  })

  return NextResponse.json({
    pairings: pairings.map((r) => ({
      round: r.round,
      format: r.format,
      tables: JSON.parse(r.tablesJson),
      droppedPlayerIds: JSON.parse(r.droppedPlayerIdsJson),
    })),
  })
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
    const { action, format, round: targetRound } = body

    // We need PAST rounds' scores for standings. For `generate`, past = currentRound
    // (everything before nextRound = currentRound + 1). For `regenerate`, past = round - 1.
    // We'll do a two-phase fetch: first get the event to know currentRound, then
    // fetch scoped scores. To avoid that, we use a known upper bound:
    //   generate:    scores.round <= event.currentRound (which is nextRound - 1)
    //   regenerate:  scores.round < targetRound
    // But we don't know event.currentRound yet here. So we fetch the event row first
    // (1 cheap query), then fetch scoped scores.
    const eventRow = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        gameName: true,
        minPlayersPerTable: true,
        maxPlayersPerTable: true,
        totalRounds: true,
        currentRound: true,
        status: true,
        scoringRulesJson: true,
      },
    })
    if (!eventRow) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const scoresBeforeRound =
      action === 'regenerate'
        ? (targetRound || eventRow.currentRound)
        : eventRow.currentRound + 1

    // Single parallel fetch of everything we need.
    const [players, pairings, roundConfigs, scores] = await Promise.all([
      db.player.findMany({
        where: { eventId },
        select: { id: true, name: true, checkedIn: true, ready: true, color: true },
      }),
      db.roundPairing.findMany({
        where: { eventId },
        orderBy: { round: 'asc' },
      }),
      db.roundConfig.findMany({ where: { eventId } }),
      db.tableScore.findMany({
        // Only LOCKED/DISPUTED scores contribute to standings. Only load rounds BEFORE the round we're generating.
        where: { eventId, round: { lt: scoresBeforeRound }, state: { in: ['LOCKED', 'DISPUTED'] } },
        include: {
          placements: {
            select: { playerId: true, placement: true, gamePoints: true, basePoints: true, bonus: true, total: true },
          },
        },
      }),
    ])

    const scoringRules: ScoringRules = JSON.parse(eventRow.scoringRulesJson)
    const playersTyped: Player[] = players.map((p) => ({
      id: p.id, name: p.name, checkedIn: p.checkedIn, ready: p.ready, color: p.color,
    }))

    if (action === 'generate') {
      const nextRound = eventRow.currentRound + 1
      if (nextRound > eventRow.totalRounds) {
        return NextResponse.json({ error: 'Max rounds reached' }, { status: 400 })
      }

      // Defensive: check if round already exists (e.g., a bonus round that
      // wasn't renumbered by the migration). This should not happen with the
      // 1001+ bonus round numbering, but we catch it here to give a clear
      // error instead of a 500 from the unique constraint violation.
      const existingAtRound = pairings.find((p) => p.round === nextRound)
      if (existingAtRound) {
        return NextResponse.json({
          error: `Round ${nextRound} already exists (possibly a bonus round). Try regenerating instead.`,
        }, { status: 409 })
      }

      const rc = roundConfigs.find((r) => r.round === nextRound)
      const fmt: RoundFormat = normalizeLegacyFormat(format || rc?.format || 'ROUND_ROBIN')
      const strategy = getStrategy(fmt)
      const active = playersTyped.filter((p) => p.checkedIn)
      if (active.length < (rc?.minPerTable || eventRow.minPlayersPerTable)) {
        return NextResponse.json({ error: 'Not enough checked-in players' }, { status: 400 })
      }

      // Build standings from previous rounds' scores only.
      const prevScores = scores.map((s) => ({
        placements: s.placements.map((p) => ({
          playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
          basePoints: p.basePoints, bonus: p.bonus, total: p.total,
        })),
        state: s.state, round: s.round, tableNumber: s.tableNumber,
        tablePointsTotal: s.tablePointsTotal,
      }))
      const standingsMap = new Map<string, number>()
      const standings = aggregateStandings(playersTyped.map((p) => p.id), prevScores, scoringRules)
      for (const row of standings) standingsMap.set(row.playerId, row.total)

      // Previously dropped: only check the LATEST regular round's droppedPlayerIds.
      //
      // We must NOT union across all rounds — a player dropped in Round 1 and
      // re-added in Round 2 will still appear in Round 1's droppedPlayerIds.
      // Unioning all rounds would re-drop them in Round 3 (bug).
      //
      // The latest round's droppedPlayerIds already reflects the "net" dropped
      // state: reintroducePlayer() removes the player from the current round's
      // list when they're re-added. So checking only the latest round gives the
      // correct set of players who are currently dropped.
      //
      // Bonus rounds (isBonus=true, round 1001+) are independent side rounds
      // and should NOT affect regular round drops.
      const previouslyDropped = new Set<string>()
      const latestRegularPairing = pairings
        .filter((r) => !r.isBonus)
        .sort((a, b) => b.round - a.round)[0]
      if (latestRegularPairing) {
        const dropped = JSON.parse(latestRegularPairing.droppedPlayerIdsJson) as string[]
        dropped.forEach((d) => previouslyDropped.add(d))
      }

      const prevPairings: RoundPairing[] = pairings.map((r) => ({
        round: r.round, format: normalizeLegacyFormat(r.format),
        tables: JSON.parse(r.tablesJson), droppedPlayerIds: JSON.parse(r.droppedPlayerIdsJson),
      }))

      const previous = collectPreviousPairings(prevPairings)
      // v6: prefer generateWithDiagnostics to capture feasibility info
      // (conflict count, iterations, time budget) for the UI. (C8.1)
      const { pairing, diagnostics } = runPairingStrategy(strategy, {
        players: active, round: nextRound,
        minPerTable: rc?.minPerTable || eventRow.minPlayersPerTable,
        maxPerTable: rc?.maxPerTable || eventRow.maxPlayersPerTable,
        previousPairings: previous,
        droppedPlayerIds: Array.from(previouslyDropped),
        standings: standingsMap,
        seatRotation: normalizeSeatRotation(rc?.seatRotation),
      })

      // Single transaction: create pairing + update event status atomically.
      await db.$transaction(async (tx) => {
        await tx.roundPairing.create({
          data: {
            eventId, round: nextRound, format: fmt,
            tablesJson: JSON.stringify(pairing.tables),
            droppedPlayerIdsJson: JSON.stringify(pairing.droppedPlayerIds),
          },
        })

        await tx.event.update({
          where: { id: eventId },
          data: { currentRound: nextRound, status: nextRound === 1 ? 'ACTIVE' : eventRow.status },
        })
      })

      return NextResponse.json({ pairing, diagnostics })
    }

    if (action === 'regenerate') {
      const round = targetRound || eventRow.currentRound
      const existing = pairings.find((r) => r.round === round)
      if (!existing) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      const rc = roundConfigs.find((r) => r.round === round)
      const fmt: RoundFormat = normalizeLegacyFormat(format || rc?.format || existing.format)
      const strategy = getStrategy(fmt)
      const active = playersTyped.filter((p) => p.checkedIn)
      if (active.length < (rc?.minPerTable || eventRow.minPlayersPerTable)) {
        return NextResponse.json({ error: 'Not enough checked-in players' }, { status: 400 })
      }

      // `pairings` and `scores` are already scoped to this event.
      // Filter in JS for the "before this round" subset (cheap, already in memory).
      const priorPairings = pairings.filter((r) => r.round < round).map((r) => ({
        round: r.round, format: normalizeLegacyFormat(r.format),
        tables: JSON.parse(r.tablesJson), droppedPlayerIds: JSON.parse(r.droppedPlayerIdsJson),
      }))
      // `scores` was already fetched with `round < scoresBeforeRound` and state LOCKED/DISPUTED.
      // For regenerate, scoresBeforeRound = targetRound || currentRound, so we may include
      // the current round's own scores. Filter those out:
      const priorScores = scores.filter((s) => s.round < round).map((s) => ({
        placements: s.placements.map((p) => ({
          playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
          basePoints: p.basePoints, bonus: p.bonus, total: p.total,
        })),
        state: s.state, round: s.round, tableNumber: s.tableNumber,
        tablePointsTotal: s.tablePointsTotal,
      }))

      const standingsMap = new Map<string, number>()
      const standings = aggregateStandings(playersTyped.map((p) => p.id), priorScores, scoringRules)
      for (const row of standings) standingsMap.set(row.playerId, row.total)

      // Previously dropped: use the CURRENT round's droppedPlayerIds (the round
      // being regenerated).
      //
      // This already reflects the "net" dropped state — if a player was dropped
      // in a prior round but re-added in THIS round (via reintroducePlayer),
      // they're NOT in this round's droppedPlayerIds. Unioning prior rounds
      // would re-drop them (bug).
      //
      // The existing round's droppedPlayerIds is the source of truth for
      // "who is currently dropped from this round."
      const previouslyDropped = new Set<string>(
        JSON.parse(existing.droppedPlayerIdsJson) as string[]
      )

      const previous = collectPreviousPairings(priorPairings)
      // v6: prefer generateWithDiagnostics to capture feasibility info. (C8.1)
      const { pairing, diagnostics } = runPairingStrategy(strategy, {
        players: active, round,
        minPerTable: rc?.minPerTable || eventRow.minPlayersPerTable,
        maxPerTable: rc?.maxPerTable || eventRow.maxPlayersPerTable,
        previousPairings: previous,
        droppedPlayerIds: Array.from(previouslyDropped),
        standings: standingsMap,
        seatRotation: normalizeSeatRotation(rc?.seatRotation),
      })

      await db.roundPairing.update({
        where: { id: existing.id },
        data: {
          format: fmt,
          tablesJson: JSON.stringify(pairing.tables),
          droppedPlayerIdsJson: JSON.stringify(pairing.droppedPlayerIds),
        },
      })
      // Clear scores for this round
      await db.tableScore.deleteMany({ where: { eventId, round } })

      return NextResponse.json({ pairing, diagnostics })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Pairing error:', err)
    return NextResponse.json({ error: 'Failed to generate pairings' }, { status: 500 })
  }
}
