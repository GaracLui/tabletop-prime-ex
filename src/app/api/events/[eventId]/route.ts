/**
 * GET    /api/events/[eventId] → get full event data
 * PATCH  /api/events/[eventId] → update event (status, currentRound, scoringRules,
 *                                 description, schedule, name, etc.)
 * DELETE /api/events/[eventId] → delete event
 */
import { NextResponse } from 'next/server'
import { requireParticipant, requireOrganizer } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { serializeEvent } from '@/lib/serialize'
import { normalizeSchedule } from '@/lib/schedule-utils'
import { parseBody, eventPatchSchema } from '@/lib/validation'

/** Max length for the description field — enforced server-side. */
const MAX_DESCRIPTION_LENGTH = 2000

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response
  const { participant } = auth.value

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      players: {
        // Only the columns the frontend actually uses; skips email/userId/createdAt.
        select: { id: true, name: true, checkedIn: true, ready: true, color: true },
      },
      pairings: true,
      scores: { include: { placements: true } },
      roundConfigs: true,
      // Note: `organizer` and `participants` are intentionally NOT loaded —
      // the serializer doesn't use them and they each add a separate query.
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json({ event: serializeEvent(event), role: participant.role })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  // Verify ORGANIZER role
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    // C2: schema-validated. Status whitelist, round ranges, and the C8.6
    // min/maxPlayersPerTable ranges (1-50) are enforced by the schema; the
    // previous hand-rolled checks expressed the same rules.
    const parsed = await parseBody(req, eventPatchSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const updateData: any = {}

    // These five need no per-field checks anymore — the schema guarantees
    // the enum/range/trim invariants the old hand-rolled code expressed.
    if (body.name !== undefined) updateData.name = body.name
    if (body.gameName !== undefined) updateData.gameName = body.gameName || 'Custom'
    if (body.status !== undefined) updateData.status = body.status
    if (body.currentRound !== undefined) updateData.currentRound = body.currentRound
    if (body.totalRounds !== undefined) updateData.totalRounds = body.totalRounds

    if (body.scoringRules) {
      // Sanitize scoring rules before storing — guard against NaN values
      // that could silently corrupt all scores. This is the server-side
      // defense-in-depth; the client also guards via isNaN() in the input
      // onChange handler, but we can't trust the client.
      // (zod gates this as a loose Record on purpose — a strict object
      // schema would strip tiebreakers/tieScoreMode and corrupt the blob.)
      const rules = body.scoringRules
      if (Array.isArray(rules.placementPoints)) {
        rules.placementPoints = rules.placementPoints.map(
          (p) => (typeof p === 'number' && !isNaN(p) ? p : 0)
        )
      }
      if (Array.isArray(rules.modifiers)) {
        rules.modifiers = rules.modifiers.map((m) => ({
          ...(typeof m === 'object' && m !== null ? m : {}),
          value:
            typeof m === 'object' && m !== null &&
            typeof (m as Record<string, unknown>).value === 'number' &&
            !isNaN((m as Record<string, unknown>).value as number)
              ? (m as Record<string, unknown>).value
              : 0,
        }))
      }
      updateData.scoringRulesJson = JSON.stringify(rules)
    }
    if (body.minPlayersPerTable !== undefined) updateData.minPlayersPerTable = body.minPlayersPerTable
    if (body.maxPlayersPerTable !== undefined) updateData.maxPlayersPerTable = body.maxPlayersPerTable

    // C8.6: enforce min ≤ max against the EVENT'S EFFECTIVE pair. If only one
    // side is being updated, compare it with the stored value of the other.
    if (
      updateData.minPlayersPerTable !== undefined ||
      updateData.maxPlayersPerTable !== undefined
    ) {
      const current = await db.event.findUnique({
        where: { id: eventId },
        select: { minPlayersPerTable: true, maxPlayersPerTable: true },
      })
      const effMin = updateData.minPlayersPerTable ?? current?.minPlayersPerTable ?? 2
      const effMax = updateData.maxPlayersPerTable ?? current?.maxPlayersPerTable ?? 4
      if (effMin > effMax) {
        return NextResponse.json(
          { error: 'minPlayersPerTable cannot exceed maxPlayersPerTable' },
          { status: 400 }
        )
      }
    }

    // Phase 1 metadata — explicitly check `!== undefined` so callers can clear
    // a field by passing null (description=null clears, schedule=null clears).
    if (body.description !== undefined) {
      const trimmed =
        typeof body.description === 'string' ? body.description.trim() : ''
      updateData.description = trimmed.length > 0 ? trimmed.slice(0, MAX_DESCRIPTION_LENGTH) : null
    }
    if (body.schedule !== undefined) {
      // null or [] → null column (no schedule). Otherwise normalize + JSON-encode.
      updateData.scheduleJson =
        body.schedule === null ? null : normalizeSchedule(body.schedule)
    }

    // Phase 2 procedural banner — reroll by incrementing the offset.
    // We accept an explicit value OR the magic string 'reroll' which
    // increments the current value by 1 (so the client doesn't need to
    // know the current offset).
    if (body.bannerSeedOffset !== undefined) {
      if (body.bannerSeedOffset === 'reroll') {
        // Fetch current offset and increment. Defaults to 0 if NULL.
        const current = await db.event.findUnique({
          where: { id: eventId },
          select: { bannerSeedOffset: true },
        })
        updateData.bannerSeedOffset = (current?.bannerSeedOffset ?? 0) + 1
      } else {
        // Schema guarantees a non-negative integer here.
        updateData.bannerSeedOffset = body.bannerSeedOffset
      }
    }

    // Delete keys whose value is undefined so we don't accidentally null them out.
    // (null is kept — it's the explicit "clear this field" signal.)
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k])

    const event = await db.event.update({
      where: { id: eventId },
      data: updateData,
    })

    return NextResponse.json({ event: serializeEvent(event) })
  } catch (err) {
    console.error('Update event error:', err)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  // Verify ORGANIZER role
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  await db.event.delete({ where: { id: eventId } })
  return NextResponse.json({ success: true })
}
