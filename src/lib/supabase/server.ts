/**
 * Supabase SERVER client — for API routes and server components only.
 *
 * This file imports next/headers and next/server — DO NOT import from
 * client components. API routes import getAuthProfile, the requireX()
 * authorization helpers (requireAuth / requireParticipant / requireStaff /
 * requireOrganizer), and createServerClient from here.
 *
 * Client components should import from '@/lib/supabase/browser' instead.
 */

import { createServerClient as createServerClientSupabase } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EventParticipant, User } from '@/generated/prisma/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function createServerClient() {
  const cookieStore = await cookies()
  return createServerClientSupabase(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore (proxy handles refresh)
        }
      },
    },
  })
}

/**
 * Get the user's Prisma profile. Returns null if not authenticated.
 */
export async function getAuthProfile() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { db } = await import('@/lib/db')
  return db.user.findUnique({
    where: { supabaseAuthId: user.id },
  })
}

/**
 * Get or create the user's Prisma profile. Called on first login
 * (POST /api/auth/sync-profile, invoked by the AuthProvider).
 *
 * S9.2: this used to be findUnique → create. Two concurrent first-login
 * calls (e.g. the client double-firing sync-profile, or two tabs) both
 * missed the findUnique, both ran create, and the second died on the
 * supabaseAuthId unique constraint → a 500 on someone's very first login.
 *
 * The fix is the DB-atomic form: a fast-path read for the common case
 * (every login after the first — stays read-only), then an UPSERT whose
 * conflict branch is a no-op update that just returns the row the
 * concurrent request created. `user.email!` is also gone: an auth user
 * without an email (anonymous/phone sign-in — not supported by this app)
 * now gets a clean 401 from the caller instead of a Prisma null-constraint
 * 500.
 */
export async function getOrCreateAuthProfile() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { db } = await import('@/lib/db')

  // Fast path: profile already exists (99.9% of calls after first login).
  const existing = await db.user.findUnique({
    where: { supabaseAuthId: user.id },
  })
  if (existing) return existing

  // First login — create the profile row. No email → nothing to key a
  // User row on (email is NOT NULL + unique); fail auth cleanly.
  if (!user.email) {
    console.warn(`sync-profile: auth user ${user.id} has no email — refusing to create profile`)
    return null
  }

  return db.user.upsert({
    where: { supabaseAuthId: user.id },
    // Deliberately empty: if we land here, a concurrent first-login
    // request just created the row — it is already correct. Touching
    // nothing avoids clobbering it (and avoids a unique violation if the
    // user changed their Supabase email to one another profile owns).
    update: {},
    create: {
      supabaseAuthId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    },
  })
}

// ──────────────────────────────────────────────────────────────────────
// Route-handler authorization (C4)
// ──────────────────────────────────────────────────────────────────────
//
// Every helper returns a DISCRIMINATED UNION instead of the old
// `participant | NextResponse`:
//
//   const auth = await requireParticipant(eventId)
//   if (!auth.ok) return auth.response
//   const { profile, participant } = auth.value
//
// The old union compiled silently even when the caller forgot the
// `instanceof NextResponse` check — the exact shape of bug S4. With the
// discriminated union, accessing `.value` without narrowing `ok` first
// is a TYPE ERROR, so the failure branch can no longer be skipped.
//
// Contract (identical status codes and JSON shape as the hand-rolled
// preambles this replaces):
//   - unauthenticated        → 401 { error: 'Not authenticated' }
//   - not a participant      → 403 { error: 'Not authorized' }
//   - not ORGANIZER/JUDGE    → 403 { error: 'Organizer or judge only' }
//   - not ORGANIZER          → 403 { error: 'Organizer only' }

export type AuthResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; response: NextResponse }

/** Everything an event-scoped handler needs after authorization. */
export interface EventAuth {
  profile: User
  participant: EventParticipant
}

/**
 * Require authentication. Returns the user's Prisma profile or a 401.
 */
export async function requireAuth(): Promise<AuthResult<{ profile: User }>> {
  const profile = await getAuthProfile()
  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }
  return { ok: true, value: { profile } }
}

/**
 * Require the user to be a participant in the event (any role).
 */
export async function requireParticipant(eventId: string): Promise<AuthResult<EventAuth>> {
  const auth = await requireAuth()
  if (!auth.ok) return auth

  const { db } = await import('@/lib/db')
  const participant = await db.eventParticipant.findUnique({
    where: { userId_eventId: { userId: auth.value.profile.id, eventId } },
  })
  if (!participant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }
  return { ok: true, value: { profile: auth.value.profile, participant } }
}

/**
 * Require the user to be event staff (ORGANIZER or JUDGE).
 */
export async function requireStaff(eventId: string): Promise<AuthResult<EventAuth>> {
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth

  if (auth.value.participant.role !== 'ORGANIZER' && auth.value.participant.role !== 'JUDGE') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Organizer or judge only' }, { status: 403 }),
    }
  }
  return auth
}

/**
 * Require the user to be an ORGANIZER of the event.
 */
export async function requireOrganizer(eventId: string): Promise<AuthResult<EventAuth>> {
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth

  if (auth.value.participant.role !== 'ORGANIZER') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Organizer only' }, { status: 403 }),
    }
  }
  return auth
}

// ──────────────────────────────────────────────────────────────────────
// Deletion-pending enforcement (S9.3)
// ──────────────────────────────────────────────────────────────────────
//
// POST /api/account/delete sets `deletionRequestedAt`; a pg_cron job wipes
// the account after 30 days (privacy policy promise). During that window
// the account stays readable (data export), but NEW writes must be
// refused — previously only /api/account PATCH and /api/account/password
// checked the flag while the docs claimed "write operations are blocked
// across all routes". These helpers centralize the check; apply it on
// state-changing endpoints (event creation, event join, score submission).

/** True if the account has a pending deletion request (30-day window). */
export function isDeletionPending(profile: Pick<User, 'deletionRequestedAt'>): boolean {
  return profile.deletionRequestedAt !== null
}

/** The canonical 403 response for deletion-pending accounts. */
export function deletionPendingResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Account is pending deletion — write operations are disabled' },
    { status: 403 }
  )
}
