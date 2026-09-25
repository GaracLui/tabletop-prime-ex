/**
 * Account API — manage the current user's profile.
 *
 * GET   /api/account         → fetch current user's profile
 * PATCH /api/account         → update display name (and email in the future)
 *        body: { name? }
 *
 * Sibling routes:
 *   POST /api/account/password  → change password
 *   POST /api/account/delete    → request GDPR deletion
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      primeTier: true,
      deletionRequestedAt: true,
      createdAt: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const userId = profile.id

  try {
    const body = await req.json()
    const { name } = body

    const data: any = {}
    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (trimmed.length > 80) {
        return NextResponse.json({ error: 'Name must be 80 characters or fewer' }, { status: 400 })
      }
      data.name = trimmed || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Refuse updates if deletion is pending
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { deletionRequestedAt: true },
    })
    if (existing?.deletionRequestedAt) {
      return NextResponse.json(
        { error: 'Account is pending deletion — updates disabled' },
        { status: 403 },
      )
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, primeTier: true },
    })

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('Account update error:', err)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}
