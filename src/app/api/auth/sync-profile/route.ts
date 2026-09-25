/**
 * POST /api/auth/sync-profile
 *
 * Called by the AuthProvider on sign-in. Creates the user's Prisma `User`
 * row if it doesn't exist yet (first login after OAuth or email signup).
 * Idempotent — safe to call on every login.
 */
import { NextResponse } from 'next/server'
import { getOrCreateAuthProfile } from '@/lib/supabase/server'

export async function POST() {
  const profile = await getOrCreateAuthProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ user: { id: profile.id, email: profile.email, name: profile.name } })
}
