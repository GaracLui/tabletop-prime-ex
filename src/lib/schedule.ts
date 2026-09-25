/**
 * Schedule formatting helpers — shared by dashboard, my-events, and share page.
 *
 * All schedule entries are stored as ISO 8601 strings WITH timezone offset
 * (e.g. "2026-08-15T14:00:00-03:00"). We format for display using the viewer's
 * locale via Intl.DateTimeFormat — that way "2 PM Buenos Aires" renders as
 * "14:00" for an Argentine viewer and "2:00 PM" for a US viewer, but the
 * underlying stored value never changes.
 */
import type { EventSession } from '@/lib/types'

/**
 * Format a single ISO 8601 date string for display.
 *
 * @param isoDate  e.g. "2026-08-15T14:00:00-03:00"
 * @param opts     Intl.DateTimeFormatOptions override
 * @returns        e.g. "Fri, Aug 15, 2026 · 14:00" (en-US) or
 *                 "vie, 15 ago 2026 · 14:00" (es-AR)
 */
export function formatDateTime(isoDate: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  }).format(d)
}

/** Date-only format, e.g. "Aug 15, 2026". */
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/** Time-only format, e.g. "14:00" or "2:00 PM". */
export function formatTime(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Format a single session for compact display.
 *
 * - Same day:   "Fri, Aug 15 · 14:00 – 20:00"
 * - No end:     "Fri, Aug 15 · 14:00"
 */
export function formatSession(session: EventSession): string {
  const startStr = formatDateTime(session.start)
  if (!session.end) return startStr
  const start = new Date(session.start)
  const end = new Date(session.end)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return startStr
  // If same calendar day, only show the end time after the dash.
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  return sameDay
    ? `${formatDateTime(session.start)} – ${formatTime(session.end)}`
    : `${formatDateTime(session.start)} – ${formatDateTime(session.end)}`
}

/**
 * Find the next upcoming session (start >= now).
 * Returns null when all sessions are in the past or schedule is empty.
 */
export function nextSession(sessions: EventSession[] | null | undefined): EventSession | null {
  if (!sessions || sessions.length === 0) return null
  const now = Date.now()
  // Schedule is normally already sorted ascending by parseSchedule, but
  // sort again defensively in case this is fed raw input.
  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start)
  )
  return sorted.find((s) => Date.parse(s.start) >= now) ?? null
}

/**
 * Find the most recent past session (start < now).
 * Returns null when no sessions have started yet or schedule is empty.
 *
 * Useful for finished events — shows the last session that occurred.
 */
export function lastSession(sessions: EventSession[] | null | undefined): EventSession | null {
  if (!sessions || sessions.length === 0) return null
  const now = Date.now()
  const sorted = [...sessions].sort(
    (a, b) => Date.parse(b.start) - Date.parse(a.start)
  )
  return sorted.find((s) => Date.parse(s.start) < now) ?? null
}

/**
 * A short one-line label for the schedule on event cards.
 * Returns null when there's nothing to show.
 *
 * Examples:
 *   - No schedule:                          null
 *   - All future, next is in 3 days:        "Starts Fri, Aug 15"
 *   - Currently in progress:                "Now · ends 20:00"
 *   - All past:                             "Ended Aug 12"
 */
export function scheduleCardLabel(sessions: EventSession[] | null | undefined): string | null {
  if (!sessions || sessions.length === 0) return null
  const now = Date.now()
  const upcoming = nextSession(sessions)
  if (upcoming) {
    const startMs = Date.parse(upcoming.start)
    const diffHours = (startMs - now) / 3_600_000
    if (diffHours < 24) {
      // Within 24h — show time only.
      return `Starts ${formatTime(upcoming.start)}`
    }
    return `Starts ${formatDate(upcoming.start)}`
  }
  // No upcoming → all in the past. Show the last one.
  const last = lastSession(sessions)
  return last ? `Ended ${formatDate(last.start)}` : null
}
