/**
 * Events API — CRUD for tournament events.
 *
 * GET  /api/events          → list events the current user participates in
 * POST /api/events          → create a new event (user becomes ORGANIZER)
 */
import { NextResponse } from 'next/server'
import { requireAuth, isDeletionPending, deletionPendingResponse } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { makeDefaultScoringRules } from '@/lib/pricing'
import { generateEventCode } from '@/lib/event-code'
import { serializeEvent } from '@/lib/serialize'
import { normalizeSchedule } from '@/lib/schedule-utils'
import { parseBody, eventCreateSchema } from '@/lib/validation'

/** Max length for the description field — enforced server-side. */
const MAX_DESCRIPTION_LENGTH = 2000

/** GET /api/events — list all events the current user participates in. */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const userId = auth.value.profile.id

  // List events the user participates in.
  // The My Events page only needs: id, name, gameName, status, currentRound,
  // totalRounds, eventCode, schedule (for next-date display), playerIds
  // (just for .length), role.
  // We do NOT load pairings, scores, roundConfigs, organizer — those are
  // fetched on-demand when the user opens an event (see /api/events/[eventId]).
  const participants = await db.eventParticipant.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          gameName: true,
          status: true,
          currentRound: true,
          totalRounds: true,
          eventCode: true,
          description: true,
          scheduleJson: true,
          bannerSeedOffset: true,
          // Just count players without loading their full rows.
          // Prisma 6 supports `_count` on relations.
          _count: { select: { players: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    events: participants.map((p) => ({
      id: p.event.id,
      name: p.event.name,
      gameName: p.event.gameName,
      status: p.event.status,
      currentRound: p.event.currentRound,
      totalRounds: p.event.totalRounds,
      eventCode: p.event.eventCode,
      description: p.event.description ?? null,
      scheduleJson: p.event.scheduleJson,
      bannerSeedOffset: p.event.bannerSeedOffset ?? 0,
      playerIds: Array.from({ length: p.event._count.players }, () => ''),
      role: p.role,
    })),
  })
}

/** POST /api/events — create a new event. */
export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  // S9.3: refuse writes for accounts with a pending deletion request
  // (30-day GDPR window) — matches the documented enforcement.
  if (isDeletionPending(profile)) return deletionPendingResponse()

  try {
    // C2: previously the raw body was destructured with zero validation —
    // `minPlayersPerTable: -3` or `totalRounds: -5` persisted happily.
    const parsed = await parseBody(req, eventCreateSchema)
    if (!parsed.ok) return parsed.response
    const { name, gameName, gameBggId, gameMaxPlayers, minPlayersPerTable, maxPlayersPerTable, totalRounds, primeTier, templateId, description, schedule } = parsed.data

    // If a templateId is provided, clone its settings (overrides any explicit
    // fields). S9.1: the load now carries the SAME ownership filter the
    // templates API enforces (own templates + legacy createdById=NULL rows).
    // Previously any templateId was loadable here, so a crafted request could
    // clone another user's PRIVATE template (its scoring rules, table sizes,
    // and round count) into a new event — an inconsistency with the rest of
    // the template surface. Not found under this filter → 404, same as the
    // templates API would report it.
    let template: any = null
    if (templateId) {
      template = await db.eventTemplate.findFirst({
        where: {
          id: templateId,
          OR: [{ createdById: userId }, { createdById: null }],
        },
      })
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const rules = template ? JSON.parse(template.scoringRulesJson) : makeDefaultScoringRules()

    // Resolve the effective table-size bounds (explicit fields override template
    // defaults override hardcoded fallbacks), then enforce min ≤ max — C8.6.
    const resolvedMin = minPlayersPerTable ?? template?.minPlayersPerTable ?? 2
    const resolvedMax = maxPlayersPerTable ?? template?.maxPlayersPerTable ?? 4
    if (resolvedMin > resolvedMax) {
      return NextResponse.json(
        { error: 'minPlayersPerTable cannot exceed maxPlayersPerTable' },
        { status: 400 }
      )
    }

    // Normalize optional Phase 1 fields. Empty/whitespace description → null.
    const descNormalized =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
        : null
    const scheduleJson = normalizeSchedule(schedule)

    // Single transaction: create event + organizer participant atomically.
    // If either fails, both are rolled back — no orphaned events or participants.
    const event = await db.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          name,
          gameName: gameName || template?.gameName || 'Custom',
          gameBggId: gameBggId || null,
          gameMaxPlayers: gameMaxPlayers ?? null,
          minPlayersPerTable: resolvedMin,
          maxPlayersPerTable: resolvedMax,
          totalRounds: totalRounds ?? template?.totalRounds ?? 4,
          primeTier: primeTier || 'FREE',
          scoringRulesJson: JSON.stringify(rules),
          eventCode: generateEventCode(name),
          organizerId: userId,
          description: descNormalized,
          scheduleJson,
        },
      })

      // Create EventParticipant as ORGANIZER
      await tx.eventParticipant.create({
        data: { userId, eventId: created.id, role: 'ORGANIZER' },
      })

      return created
    })

    return NextResponse.json({ event: serializeEvent(event) })
  } catch (err) {
    console.error('Create event error:', err)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
