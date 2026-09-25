/**
 * Event Templates API — save and reuse event settings.
 *
 * GET   /api/templates       → list current user's templates
 * POST  /api/templates       → save a new template (from event or manual body)
 *        body: { name, sourceEventId? } OR { name, gameName, minPlayersPerTable, maxPlayersPerTable, totalRounds, scoringRules }
 * GET   /api/templates/[id]  → get one template (not implemented as separate route; GET list includes them all)
 * DELETE /api/templates/[id] → delete a template
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { makeDefaultScoringRules } from '@/lib/pricing'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile

  // Templates are globally readable (SELECT policy is permissive), but we
  // filter the API response to the caller's own templates plus legacy
  // templates (createdById IS NULL) so the UI doesn't surface other users'
  // private templates.
  // NOTE: RLS does NOT enforce this for the app — Prisma connects as the
  // table-owner role, which bypasses RLS entirely (see rls-policies.sql
  // header, S1). This filter is the only enforcement that exists.
  const templates = await db.eventTemplate.findMany({
    where: {
      OR: [
        { createdById: profile.id },
        { createdById: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      gameName: t.gameName,
      minPlayersPerTable: t.minPlayersPerTable,
      maxPlayersPerTable: t.maxPlayersPerTable,
      totalRounds: t.totalRounds,
      scoringRules: JSON.parse(t.scoringRulesJson),
      sourceEventId: t.sourceEventId,
      createdAt: t.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  try {
    const body = await req.json()

    // Source from an existing event
    if (body.sourceEventId) {
      // Verify user is organizer of the source event
      const p = await db.eventParticipant.findUnique({
        where: { userId_eventId: { userId, eventId: body.sourceEventId } },
      })
      if (p?.role !== 'ORGANIZER') {
        return NextResponse.json({ error: 'Only the organizer can template this event' }, { status: 403 })
      }
      const event = await db.event.findUnique({ where: { id: body.sourceEventId } })
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

      const tpl = await db.eventTemplate.create({
        data: {
          name: body.name || `${event.name} template`,
          gameName: event.gameName,
          minPlayersPerTable: event.minPlayersPerTable,
          maxPlayersPerTable: event.maxPlayersPerTable,
          totalRounds: event.totalRounds,
          scoringRulesJson: event.scoringRulesJson,
          sourceEventId: event.id,
          createdById: userId,
        },
      })
      return NextResponse.json({ template: serializeTemplate(tpl) }, { status: 201 })
    }

    // Manual creation
    if (!body.name) return NextResponse.json({ error: 'Missing template name' }, { status: 400 })
    const tpl = await db.eventTemplate.create({
      data: {
        name: body.name,
        gameName: body.gameName || 'Custom',
        minPlayersPerTable: Number(body.minPlayersPerTable) || 2,
        maxPlayersPerTable: Number(body.maxPlayersPerTable) || 4,
        totalRounds: Number(body.totalRounds) || 4,
        scoringRulesJson: JSON.stringify(body.scoringRules || makeDefaultScoringRules()),
        createdById: userId,
      },
    })
    return NextResponse.json({ template: serializeTemplate(tpl) }, { status: 201 })
  } catch (err) {
    console.error('Template POST error:', err)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

function serializeTemplate(t: any) {
  return {
    id: t.id,
    name: t.name,
    gameName: t.gameName,
    minPlayersPerTable: t.minPlayersPerTable,
    maxPlayersPerTable: t.maxPlayersPerTable,
    totalRounds: t.totalRounds,
    scoringRules: JSON.parse(t.scoringRulesJson),
    sourceEventId: t.sourceEventId,
    createdAt: t.createdAt.toISOString(),
  }
}
