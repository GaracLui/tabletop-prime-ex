/**
 * Event Participants API — organizer manages who participates in an event.
 *
 * GET   /api/events/[eventId]/participants           → list all participants
 * POST  /api/events/[eventId]/participants           → add a user as participant by email
 *        body: { email, role: 'JUDGE' | 'PLAYER' }
 * PATCH /api/events/[eventId]/participants           → change a participant's role
 *        body: { userId, role: 'ORGANIZER' | 'JUDGE' | 'PLAYER' }
 * DELETE /api/events/[eventId]/participants?userId=X → remove a participant
 */
import { NextResponse } from 'next/server'
import { requireOrganizer, requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { createPlayerRow } from '@/lib/player-utils'

/** GET — list all participants for this event with their user info. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  const participants = await db.eventParticipant.findMany({
    where: { eventId },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    participants: participants.map((p) => ({
      userId: p.userId,
      role: p.role,
      email: p.user.email,
      name: p.user.name,
      createdAt: p.createdAt.toISOString(),
    })),
  })
}

/** POST — add a user as a participant by email. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const { email, role } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const validRole = role === 'JUDGE' || role === 'PLAYER' || role === 'ORGANIZER'
      ? role
      : 'PLAYER'

    // Find the user by email
    const targetUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'No user found with that email. Ask them to create an account first.' }, { status: 404 })
    }

    // Check if already a participant
    const existing = await db.eventParticipant.findUnique({
      where: { userId_eventId: { userId: targetUser.id, eventId } },
    })
    if (existing) {
      // Update role if different
      if (existing.role !== validRole) {
        await db.eventParticipant.update({
          where: { id: existing.id },
          data: { role: validRole },
        })
        return NextResponse.json({ participant: { userId: targetUser.id, role: validRole, email: targetUser.email, name: targetUser.name, updated: true } })
      }
      return NextResponse.json({ participant: { userId: targetUser.id, role: existing.role, email: targetUser.email, name: targetUser.name, alreadyExists: true } })
    }

    const participant = await db.eventParticipant.create({
      data: { userId: targetUser.id, eventId, role: validRole },
    })

    // If adding as PLAYER, also create a Player row so they appear in pairings
    if (validRole === 'PLAYER') {
      await createPlayerRow(eventId, targetUser.id, targetUser.name || targetUser.email.split('@')[0])
    }

    return NextResponse.json({
      participant: {
        userId: targetUser.id,
        role: participant.role,
        email: targetUser.email,
        name: targetUser.name,
      },
    })
  } catch (err) {
    console.error('Add participant error:', err)
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}

/** PATCH — change a participant's role. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  try {
    const { userId, role } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const validRole = role === 'ORGANIZER' || role === 'JUDGE' || role === 'PLAYER'
      ? role
      : 'PLAYER'

    // Don't allow removing the last organizer
    if (validRole !== 'ORGANIZER') {
      const organizers = await db.eventParticipant.findMany({
        where: { eventId, role: 'ORGANIZER' },
      })
      const targetIsOrganizer = organizers.find((o) => o.userId === userId)
      if (targetIsOrganizer && organizers.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last organizer' }, { status: 400 })
      }
    }

    // If changing TO PLAYER and they don't have a Player row, create one
    if (validRole === 'PLAYER') {
      await createPlayerRow(eventId, userId)
    }

    const updated = await db.eventParticipant.update({
      where: { userId_eventId: { userId, eventId } },
      data: { role: validRole },
    })

    return NextResponse.json({ participant: { userId, role: updated.role } })
  } catch (err) {
    console.error('Update participant error:', err)
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 })
  }
}

/** DELETE — remove a participant. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireOrganizer(eventId)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  // Don't allow removing the last organizer
  const target = await db.eventParticipant.findUnique({
    where: { userId_eventId: { userId, eventId } },
  })
  if (target?.role === 'ORGANIZER') {
    const organizerCount = await db.eventParticipant.count({
      where: { eventId, role: 'ORGANIZER' },
    })
    if (organizerCount <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last organizer' }, { status: 400 })
    }
  }

  await db.eventParticipant.delete({
    where: { userId_eventId: { userId, eventId } },
  })

  return NextResponse.json({ success: true })
}
