/**
 * Round Config API — per-round overrides for format and table size.
 *
 * GET  /api/events/[eventId]/round-configs       → list all configs (incl. defaults for empty rounds)
 * PUT  /api/events/[eventId]/round-configs       → upsert a single round's config
 *        body: { round, format, minPerTable, maxPerTable, modifiers? }
 * DELETE /api/events/[eventId]/round-configs?round=N → delete a round's override (revert to event defaults)
 */
import { NextResponse } from 'next/server'
import { requireOrganizer, requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { parseBody, roundConfigPutSchema } from '@/lib/validation'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { roundConfigs: { orderBy: { round: 'asc' } } },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Build full list with defaults for missing rounds
  const byRound = new Map(event.roundConfigs.map((rc) => [rc.round, rc]))
  const configs: Array<{
    round: number
    format: string
    minPerTable: number
    maxPerTable: number
    modifiers: any[]
    seatRotation: string
    isOverride: boolean
  }> = []
  for (let r = 1; r <= event.totalRounds; r++) {
    const rc = byRound.get(r)
    configs.push({
      round: r,
      format: rc?.format ?? 'ROUND_ROBIN',
      minPerTable: rc?.minPerTable ?? event.minPlayersPerTable,
      maxPerTable: rc?.maxPerTable ?? event.maxPlayersPerTable,
      modifiers: rc ? JSON.parse(rc.modifiersJson) : [],
      seatRotation: rc?.seatRotation ?? 'NONE',
      isOverride: !!rc,
    })
  }

  return NextResponse.json({ roundConfigs: configs })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    // C2: schema-validated — format was `format || 'ROUND_ROBIN'` before, so
    // arbitrary strings persisted; min/max had no range checks at all.
    const parsed = await parseBody(req, roundConfigPutSchema)
    if (!parsed.ok) return parsed.response
    const { round, format, minPerTable, maxPerTable, modifiers, seatRotation } = parsed.data

    const event = await db.event.findUnique({ where: { id: eventId } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (round > event.totalRounds) {
      return NextResponse.json({ error: 'Round exceeds totalRounds' }, { status: 400 })
    }

    // C8.6 companion: the effective min/max pair must stay sane. One-sided
    // updates fall back to the event defaults (same semantics as before).
    const resolvedMin = minPerTable ?? event.minPlayersPerTable
    const resolvedMax = maxPerTable ?? event.maxPlayersPerTable
    if (resolvedMin > resolvedMax) {
      return NextResponse.json(
        { error: 'minPerTable cannot exceed maxPerTable' },
        { status: 400 }
      )
    }

    // Normalize seatRotation: 'NONE' | 'CLOCKWISE' | 'BALANCED'. null = NONE.
    const validRotations = ['NONE', 'CLOCKWISE', 'BALANCED'] as const
    const normalizedRotation =
      seatRotation !== undefined && validRotations.includes(seatRotation)
        ? seatRotation === 'NONE'
          ? null
          : seatRotation
        : null

    const data = {
      format: format ?? 'ROUND_ROBIN',
      minPerTable: resolvedMin,
      maxPerTable: resolvedMax,
      modifiersJson: JSON.stringify(modifiers ?? []),
      seatRotation: normalizedRotation,
    }

    const rc = await db.roundConfig.upsert({
      where: { eventId_round: { eventId, round } },
      create: { eventId, round, ...data },
      update: data,
    })

    return NextResponse.json({
      roundConfig: {
        round: rc.round,
        format: rc.format,
        minPerTable: rc.minPerTable,
        maxPerTable: rc.maxPerTable,
        modifiers: JSON.parse(rc.modifiersJson),
        seatRotation: rc.seatRotation ?? 'NONE',
        isOverride: true,
      },
    })
  } catch (err: any) {
    // v6: when the prod DB hasn't been migrated yet, the RoundFormat enum
    // still has 'CUSTOM' (and NOT 'ADJACENT_SWISS'). Writing ADJACENT_SWISS
    // fails with P2009/22P03 "invalid input value for enum". Detect that and
    // return a clear error message instead of a generic 500.
    const msg = String(err?.message ?? '')
    if (
      msg.includes('ADJACENT_SWISS') ||
      msg.includes('invalid input value for enum') ||
      msg.includes('invalid enum value')
    ) {
      console.error('Round config PUT — DB enum migration missing:', msg)
      return NextResponse.json(
        {
          error:
            'The "ADJACENT_SWISS" format is not yet available in this database. ' +
            'Run the migration: `node scripts/migrate-round-format.mjs`. ' +
            'See prisma/replace-custom-format-with-adjacent-swiss.sql for details.',
        },
        { status: 503 },
      )
    }
    console.error('Round config PUT error:', err)
    return NextResponse.json({ error: 'Failed to save round config' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const roundStr = url.searchParams.get('round')
  const round = Number(roundStr)
  if (!round) return NextResponse.json({ error: 'Missing round' }, { status: 400 })

  await db.roundConfig.deleteMany({ where: { eventId, round } })
  return NextResponse.json({ success: true })
}
