/**
 * POST /api/account/password — change the current user's password.
 *
 * Body: { currentPassword, newPassword }
 *
 * Uses Supabase Auth's updateUser API to change the password. This works
 * for both email/password users and OAuth users who have set a password.
 */
import { NextResponse } from 'next/server'
import { requireAuth, isDeletionPending, createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // S7: brake the online password-verification loop (signInWithPassword
  // below). Checked before auth so unauthenticated floods are braked too.
  const limit = checkRateLimit(req, 'account')
  if (!limit.ok) return limit.response

  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile

  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from the current one' }, { status: 400 })
    }

    if (isDeletionPending(profile)) {
      return NextResponse.json(
        { error: 'Account is pending deletion — password changes disabled' },
        { status: 403 },
      )
    }

    // Verify the current password by re-signing in
    const supabase = await createServerClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })
    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
    }

    // Update the password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Password change error:', err)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
