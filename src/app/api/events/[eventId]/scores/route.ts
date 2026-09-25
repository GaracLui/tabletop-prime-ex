/**
 * Scores API — submit, confirm, and update table scores.
 *
 * GET  /api/events/[eventId]/scores       → list all scores
 * POST /api/events/[eventId]/scores       → submit or update a table's score
 *
 * Body for POST: { tableNumber, round, placements: [{playerId, placement, gamePoints}], note?, action: 'submit' | 'confirm' | 'update' }
 *
 * Permission model:
 *   - ORGANIZER/JUDGE: can score any table (proxy entry, dispute resolution)
 *   - PLAYER: can only score the table they're seated at in the current round
 *   - Confirm: the confirmer must be a DIFFERENT user than the submitter
 *     (dual-score verification). Organizers can override/confirm anything.
 */
import { NextResponse } from 'next/server'
import {
  requireParticipant,
  isDeletionPending,
  deletionPendingResponse,
} from '@/lib/supabase/server'
import { db } from '@/lib/db'
import {
  scoreTable,
  computeTablePointsTotal,
  mergeModifiers,
} from '@/lib/engine/scoring-engine'
import { parseBody, scorePostSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ScoringRules } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response
  const userId = auth.value.profile.id

  const scores = await db.tableScore.findMany({
    where: { eventId },
    include: { placements: true },
    orderBy: [{ round: 'asc' }, { tableNumber: 'asc' }],
  })

  return NextResponse.json({ scores: scores.map((s) => ({
    tableNumber: s.tableNumber, round: s.round, state: s.state,
    submittedBy: s.submittedBy, confirmedBy: s.confirmedBy, note: s.note,
    tablePointsTotal: s.tablePointsTotal,
    placements: s.placements.map((p) => ({
      playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
      basePoints: p.basePoints, bonus: p.bonus, total: p.total,
    })),
  }))})
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  // S7: brake score-submission spam before touching auth or the DB.
  const limit = checkRateLimit(req, 'write')
  if (!limit.ok) return limit.response

  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response
  const { profile, participant } = auth.value
  const userId = profile.id

  // S9.3: refuse writes for accounts with a pending deletion request
  // (30-day GDPR window) — matches the documented enforcement.
  if (isDeletionPending(profile)) return deletionPendingResponse()

  const isStaff = participant.role === 'ORGANIZER' || participant.role === 'JUDGE'

  // C2: shape + range validation happens before any DB access. Note this
  // replaces the old try/`await req.json()` preamble — malformed JSON now
  // returns a proper 400 instead of a misleading 500.
  const parsed = await parseBody(req, scorePostSchema)
  if (!parsed.ok) return parsed.response
  const { tableNumber, round, placements, note, action } = parsed.data

  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { roundConfigs: true },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    // ────────────────────────────────────────────────────────────────
    // Permission check: players can only score their OWN table.
    // Organizers and judges can score any table (proxy entry, disputes).
    //
    // FAIL CLOSED (S3): both conditions below must positively hold for a
    // non-staff submission — (a) the caller has a Player row in this event,
    // and (b) the requested round has a pairing that seats them. Previously
    // each check was nested inside `if (row exists)`, so a participant with
    // no Player row — or targeting a round with no pairing yet (bonus or
    // future rounds) — skipped the table check entirely and could write
    // scores for ANY table, including flipping LOCKED scores to DISPUTED
    // with attacker-controlled placements (a standings-integrity attack).
    // ────────────────────────────────────────────────────────────────
    if (!isStaff) {
      // (a) The caller must be seated in this event as a Player.
      const playerRow = await db.player.findFirst({
        where: { eventId, userId },
        select: { id: true },
      })
      if (!playerRow) {
        return NextResponse.json(
          { error: 'You are not a player in this event' },
          { status: 403 }
        )
      }

      // (b) The requested round must already have a pairing…
      const currentPairing = await db.roundPairing.findFirst({
        where: { eventId, round },
        select: { tablesJson: true },
      })
      if (!currentPairing) {
        return NextResponse.json(
          { error: 'No pairing exists for this round yet' },
          { status: 403 }
        )
      }

      // …and the caller must be seated at the table being scored.
      const tables = JSON.parse(currentPairing.tablesJson) as Array<{
        tableNumber: number
        playerIds: string[]
      }>
      const myTable = tables.find((t) => t.playerIds.includes(playerRow.id))
      if (!myTable || myTable.tableNumber !== tableNumber) {
        return NextResponse.json(
          { error: 'You can only score the table you are seated at' },
          { status: 403 }
        )
      }

      // Payload validation (S3 secondary): the placements submitted by a
      // non-staff caller may only reference players actually seated at
      // their table. Previously only tableNumber was checked — the payload
      // itself was never validated against the seating.
      //
      // P2 fix: this check now applies to submit/update ONLY. A confirm
      // writes no placement data (it just flips the state + confirmedBy),
      // and the companion legitimately sends `placements: []` when
      // confirming — the previous blanket check 403'd every player-side
      // confirmation, breaking the dual-score flow since the S3 fix.
      if (action !== 'confirm') {
        const seatIds = new Set(myTable.playerIds)
        const placementsValid =
          !!placements &&
          placements.length > 0 &&
          placements.every((p) => seatIds.has(p.playerId))
        if (!placementsValid) {
          return NextResponse.json(
            { error: 'Placements must reference players seated at your table' },
            { status: 403 }
          )
        }
      }
    }

    const scoringRules: ScoringRules = JSON.parse(event.scoringRulesJson)

    if (action === 'confirm') {
      // ──────────────────────────────────────────────────────────────
      // Self-confirm guard: the confirmer must be a DIFFERENT user
      // than the submitter. Organizers can override (confirm anything).
      // ──────────────────────────────────────────────────────────────
      const existing = await db.tableScore.findUnique({
        where: { eventId_round_tableNumber: { eventId, round, tableNumber } },
        select: { id: true, state: true, submittedBy: true },
      })

      if (!existing || existing.state !== 'PENDING_CONFIRM') {
        return NextResponse.json(
          { error: 'No pending score to confirm' },
          { status: 400 }
        )
      }

      if (!isStaff && existing.submittedBy === userId) {
        return NextResponse.json(
          { error: 'You cannot confirm your own submission — another player must confirm it' },
          { status: 403 }
        )
      }

      await db.tableScore.update({
        where: { id: existing.id },
        data: { state: 'LOCKED', confirmedBy: userId },
      })
      return NextResponse.json({ success: true })
    }

    // action === 'submit' or 'update' here (confirm returned above) — the
    // schema's superRefine guarantees placements is a non-empty array.
    const rc = event.roundConfigs.find((r) => r.round === round)
    const extraMods = mergeModifiers(scoringRules.modifiers, rc ? JSON.parse(rc.modifiersJson) : [])
    const scored = scoreTable(placements ?? [], round, event.totalRounds, scoringRules, extraMods)
    const tablePointsTotal = computeTablePointsTotal(scored)

    // Only fetch the row itself (no `include: placements`) — we delete + recreate them.
    const existing = await db.tableScore.findUnique({
      where: { eventId_round_tableNumber: { eventId, round, tableNumber } },
      select: { id: true, state: true, submittedBy: true, confirmedBy: true, note: true },
    })

    const wasLocked = existing?.state === 'LOCKED'
    // Staff (organizers/judges) can lock scores directly — they bypass
    // dual-score verification. This handles the case where a player submits
    // a score via the companion but no other player at the table is using
    // the companion to confirm it. The organizer's Quick Score should lock it.
    const newState = wasLocked
      ? 'DISPUTED'
      : isStaff
        ? 'LOCKED'
        : action === 'update'
          ? (existing?.state || 'LOCKED')
          : 'PENDING_CONFIRM'

    const placementsData = scored.map((p) => ({
      playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
      basePoints: p.basePoints, bonus: p.bonus, total: p.total,
    }))

    // Single transaction: delete old placements + upsert table score + create new placements.
    // 1 round-trip in the common case (existing score) instead of 3.
    await db.$transaction(async (tx) => {
      if (existing) {
        await tx.placementScore.deleteMany({ where: { tableScoreId: existing.id } })
        await tx.tableScore.update({
          where: { id: existing.id },
          data: {
            state: newState,
            submittedBy: existing.submittedBy || userId,
            confirmedBy: existing.confirmedBy || (action === 'update' ? userId : undefined),
            note: note || existing.note,
            tablePointsTotal,
            lastEditedAt: new Date(),
            placements: { create: placementsData },
          },
        })
      } else {
        await tx.tableScore.create({
          data: {
            eventId, tableNumber, round,
            state: newState,
            submittedBy: userId,
            note: note || null,
            tablePointsTotal,
            placements: { create: placementsData },
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Score error:', err)
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
