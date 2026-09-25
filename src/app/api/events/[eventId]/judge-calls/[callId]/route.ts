/**
 * PATCH /api/events/[eventId]/judge-calls/[callId]
 * Body: { action: 'acknowledge' | 'resolve' }
 *
 * Security:
 *   - Scopes the update by (id, eventId) to prevent cross-event IDOR.
 *   - STAFF ONLY (S6): acknowledging/resolving is restricted to ORGANIZER
 *     and JUDGE, matching the JudgeCall UPDATE policy in rls-policies.sql.
 *     Previously any participant (any role) could resolve other tables'
 *     calls — the API contradicted its own RLS policy, and the API is the
 *     layer that actually runs (Prisma bypasses RLS as table owner).
 */
import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { parseBody, judgeCallPatchSchema } from '@/lib/validation'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string; callId: string }> }
) {
  const { eventId, callId } = await params

  const auth = await requireStaff(eventId)
  if (!auth.ok) return auth.response

  try {
    // C2: unknown actions used to fall through both branches and return
    // success:true without writing anything — now an honest 400.
    const parsed = await parseBody(req, judgeCallPatchSchema)
    if (!parsed.ok) return parsed.response
    const { action } = parsed.data

    // Scope by BOTH id AND eventId — prevents cross-event IDOR.
    // If the call doesn't belong to this event, the update affects 0 rows
    // and Prisma throws P2025 (record not found).
    if (action === 'acknowledge') {
      await db.judgeCall.update({
        where: { id_eventId: { id: callId, eventId } },
        data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
      })
    } else if (action === 'resolve') {
      await db.judgeCall.update({
        where: { id_eventId: { id: callId, eventId } },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Judge call not found in this event' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 })
  }
}
