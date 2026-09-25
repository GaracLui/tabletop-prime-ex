/**
 * Shared schedule normalization — used by both:
 *   - POST /api/events (create event with schedule)
 *   - PATCH /api/events/[eventId] (update event schedule)
 *
 * Extracted from the two route files to avoid duplication.
 */
import type { EventSession } from '@/lib/types'

/** Maximum schedule entries per event — defends against pathological input. */
export const MAX_SCHEDULE_ENTRIES = 50

/**
 * Normalize an incoming schedule array into a JSON string ready for storage.
 *
 * - Accepts [{start, end?}] where start/end are ISO 8601 strings.
 * - Validates each entry's `start` parses to a real date; drops bad rows.
 * - Sorts by start time ascending.
 * - Returns null when the array is empty/invalid → column becomes NULL.
 */
export function normalizeSchedule(input: unknown): string | null {
  if (!Array.isArray(input)) return null
  const sessions: EventSession[] = []
  for (const item of input.slice(0, MAX_SCHEDULE_ENTRIES)) {
    if (!item || typeof item !== 'object') continue
    const start = (item as any).start
    if (typeof start !== 'string' || isNaN(Date.parse(start))) continue
    const end = (item as any).end
    sessions.push({
      start,
      ...(typeof end === 'string' && !isNaN(Date.parse(end)) ? { end } : {}),
    })
  }
  if (sessions.length === 0) return null
  sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return JSON.stringify(sessions)
}
