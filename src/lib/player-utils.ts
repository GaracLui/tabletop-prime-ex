/**
 * Shared player creation helper — used by:
 *   - POST /api/events/[eventId]/players (bulk add)
 *   - POST /api/participants (join via code)
 *   - POST /api/events/[eventId]/participants (add by email)
 *   - PATCH /api/events/[eventId]/participants (change role to PLAYER)
 *
 * All these routes need to create a Player row with the correct color
 * (cycling through PLAYER_COLORS by existing count) and handle the case
 * where the user already has a Player row in the event.
 */
import { db } from '@/lib/db'
import { PLAYER_COLORS } from '@/lib/pricing'

/**
 * Maximum allowed player name length.
 *
 * Defends against UI overflow caused by absurdly long names like
 * "ANameInASingleLineThatIsReallyLongAndDifficultToUnderstand" — even with
 * truncation, a 500-char name is absurd and should be rejected at the API
 * layer. 60 chars comfortably fits " Maximiliano Alejandro González-Rodríguez"
 * while blocking garbage.
 */
export const MAX_PLAYER_NAME_LENGTH = 60

/**
 * Sanitize a player name: trim whitespace, collapse runs of internal
 * whitespace to single spaces, and cap at MAX_PLAYER_NAME_LENGTH.
 *
 * Returns null if the name is empty or only whitespace after trimming.
 *
 * This does NOT reject names with unusual character sequences (like
 * "e h j rj rj") — those are valid, just unusual. The UI handles display
 * truncation; the API only enforces length.
 */
export function sanitizePlayerName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // Collapse runs of any whitespace (spaces, tabs, newlines) to single spaces
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  if (collapsed.length === 0) return null
  return collapsed.slice(0, MAX_PLAYER_NAME_LENGTH)
}

/**
 * Create a Player row linked to a user, if one doesn't already exist.
 * Returns the Player row (existing or newly created), or null if the
 * user doesn't exist.
 *
 * @param eventId  The event to add the player to
 * @param userId   The Prisma User.id (NOT the Supabase auth ID)
 * @param name     Override name; if not provided, uses the user's name or email prefix
 */
export async function createPlayerRow(
  eventId: string,
  userId: string,
  name?: string,
) {
  // Check if player already exists for this user+event
  const existing = await db.player.findFirst({
    where: { eventId, userId },
  })
  if (existing) return existing

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const playerCount = await db.player.count({ where: { eventId } })
  // Sanitize the override name if provided; fall back to user name/email.
  const finalName = sanitizePlayerName(name) ?? user.name ?? user.email.split('@')[0]
  return db.player.create({
    data: {
      name: finalName,
      userId: user.id,
      eventId,
      color: PLAYER_COLORS[playerCount % PLAYER_COLORS.length],
    },
  })
}

/**
 * Create multiple Player rows by name (not linked to a user account).
 * Used by the bulk-add-players feature where names are pasted as text.
 *
 * @param eventId  The event to add players to
 * @param names    Array of player names (should already be sanitized)
 * @returns Array of created Player rows
 */
export async function createPlayersByName(
  eventId: string,
  names: string[],
) {
  const baselineCount = await db.player.count({ where: { eventId } })
  const data = names.map((name, i) => ({
    name,
    eventId,
    color: PLAYER_COLORS[(baselineCount + i) % PLAYER_COLORS.length],
  }))

  await db.player.createMany({ data, skipDuplicates: true })

  // Fetch back the created rows (createMany doesn't return them)
  return db.player.findMany({
    where: { eventId, name: { in: names } },
    orderBy: { createdAt: 'desc' },
  })
}
