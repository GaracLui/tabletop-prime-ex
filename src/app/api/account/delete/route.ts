/**
 * POST /api/account/delete — request GDPR account deletion.
 *
 * Sets `deletionRequestedAt = now()` on the User row. The account stays
 * accessible (readable, for data export) during the 30-day window, but
 * NEW writes are refused on the mutating endpoints that check the flag:
 *   - PATCH /api/account                     (profile updates)
 *   - POST  /api/account/password            (password changes)
 *   - POST  /api/events                      (event creation)
 *   - POST  /api/participants                (joining events)
 *   - POST  /api/events/[eventId]/scores     (score submission)
 * The check is centralized in `isDeletionPending()` /
 * `deletionPendingResponse()` (src/lib/supabase/server.ts, S9.3).
 *
 * A scheduled job or admin script should perform the actual wipe within
 * 30 days. For now, this endpoint just records the request.
 *
 * The wipe itself (when implemented) should:
 *   1. Anonymize the User row (email → `deleted+<id>@local`, name → null,
 *      passwordHash → random) so foreign keys don't break.
 *   2. Cascade-delete EventParticipant rows (already onDelete: Cascade
 *      from User → EventParticipant).
 *   3. Leave Player rows intact (they hold historical scores) but null
 *      out `userId` (already onDelete: SetNull from User → Player).
 *   4. Leave organized Events intact unless explicitly requested otherwise
 *      (event data is owned by the organizer role, not the user account).
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  // S7: account-mutation endpoints share the 'account' bucket.
  const limit = checkRateLimit(req, 'account')
  if (!limit.ok) return limit.response

  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { deletionRequestedAt: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (existing.deletionRequestedAt) {
      return NextResponse.json(
        { error: 'Deletion already requested', deletionRequestedAt: existing.deletionRequestedAt },
        { status: 409 },
      )
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: new Date() },
      select: { deletionRequestedAt: true },
    })

    return NextResponse.json({
      success: true,
      deletionRequestedAt: updated.deletionRequestedAt,
    })
  } catch (err) {
    console.error('Deletion request error:', err)
    return NextResponse.json({ error: 'Failed to request deletion' }, { status: 500 })
  }
}
