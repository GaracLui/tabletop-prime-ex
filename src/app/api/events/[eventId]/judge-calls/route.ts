/**
 * Judge Calls API — manage the call queue.
 *
 * GET  /api/events/[eventId]/judge-calls  → list calls
 * POST /api/events/[eventId]/judge-calls  → create a call (player pings judge)
 */
import { NextResponse } from 'next/server'
import { requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { parseBody, judgeCallPostSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  // Query params:
  //   ?activeOnly=true   → only PENDING + ACKNOWLEDGED (skip RESOLVED). Default: false.
  //   ?since=<iso-date>  → only calls created after this timestamp (for polling).
  const url = new URL(req.url)
  const activeOnly = url.searchParams.get('activeOnly') === 'true'
  const since = url.searchParams.get('since')

  const where: any = { eventId }
  if (activeOnly) {
    where.status = { in: ['PENDING', 'ACKNOWLEDGED'] }
  }
  if (since) {
    const sinceDate = new Date(since)
    if (!isNaN(sinceDate.getTime())) {
      where.createdAt = { gt: sinceDate }
    }
  }

  const calls = await db.judgeCall.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    // Cap at 200 to avoid unbounded result sets on old events.
    take: 200,
  })

  return NextResponse.json({ calls })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  // S7: judge-call creation is a pings-a-human endpoint — spam brake.
  const limit = checkRateLimit(req, 'write')
  if (!limit.ok) return limit.response

  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  try {
    // C2/C8.5: `category` was an arbitrary string — any value the client
    // sent persisted. The schema pins it to the JudgeCallCategory enum the
    // UI actually uses, and message is capped at 1000 chars.
    const parsed = await parseBody(req, judgeCallPostSchema)
    if (!parsed.ok) return parsed.response
    const { tableNumber, category, message } = parsed.data

    const call = await db.judgeCall.create({
      data: {
        eventId,
        tableNumber,
        category,
        message: message || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ call })
  } catch {
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }
}
