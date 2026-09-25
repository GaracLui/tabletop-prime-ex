/**
 * Shared formatting helpers for enum-to-label conversion.
 *
 * Status enums (EventStatus, ScoreState, Role) are stored as uppercase
 * strings in the database (e.g., 'ORGANIZER', 'LOCKED', 'DRAFT'). These
 * helpers map them to localized display labels via the i18n `t()` function.
 *
 * Usage:
 *   const { t } = useI18n()
 *   formatEventStatus(event.status, t)  // → "Active" / "Activo"
 *   formatScoreState(score.state, t)    // → "Locked" / "Bloqueada"
 *   formatRole(participant.role, t)     // → "Organizer" / "Organizador"
 */

/**
 * Map an EventStatus enum value to a localized label.
 *   DRAFT → dashboard.status.draft
 *   CHECK_IN → dashboard.status.checkIn
 *   ACTIVE → dashboard.status.active
 *   FINISHED → dashboard.status.finished
 */
export function formatEventStatus(status: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    DRAFT: 'dashboard.status.draft',
    CHECK_IN: 'dashboard.status.checkIn',
    ACTIVE: 'dashboard.status.active',
    FINISHED: 'dashboard.status.finished',
  }
  return t(keyMap[status] ?? `dashboard.status.${status.toLowerCase()}`)
}

/**
 * Map a ScoreState enum value to a localized label.
 *   MISSING → dashboard.tableStateMissing
 *   PENDING_CONFIRM → dashboard.tableStatePending
 *   LOCKED → dashboard.tableStateLocked
 *   DISPUTED → dashboard.tableStateDisputed
 */
export function formatScoreState(state: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    MISSING: 'dashboard.tableStateMissing',
    PENDING_CONFIRM: 'dashboard.tableStatePending',
    LOCKED: 'dashboard.tableStateLocked',
    DISPUTED: 'dashboard.tableStateDisputed',
  }
  return t(keyMap[state] ?? `dashboard.tableState${state.charAt(0)}${state.slice(1).toLowerCase()}`)
}

/**
 * Map a Role enum value to a localized label.
 *   ORGANIZER → common.roleOrganizer
 *   JUDGE → common.roleJudge
 *   PLAYER → common.rolePlayer
 */
export function formatRole(role: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    ORGANIZER: 'common.roleOrganizer',
    JUDGE: 'common.roleJudge',
    PLAYER: 'common.rolePlayer',
  }
  return t(keyMap[role] ?? role)
}

/**
 * Map a RoundFormat enum value to a localized label.
 *   ROUND_ROBIN → dashboard.formatRoundRobin
 *   SWISS → dashboard.formatSwiss
 *   SINGLE_ELIM → dashboard.formatSingleElim
 *   ADJACENT_SWISS → dashboard.formatAdjSwiss
 *   CUSTOM (legacy) → dashboard.formatRoundRobin (removed in v6; behaves as RR)
 */
export function formatRoundFormat(format: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    ROUND_ROBIN: 'dashboard.formatRoundRobin',
    SWISS: 'dashboard.formatSwiss',
    SINGLE_ELIM: 'dashboard.formatSingleElim',
    ADJACENT_SWISS: 'dashboard.formatAdjSwiss',
  }
  // Legacy 'CUSTOM' rows (pre-v6 databases) render as Round Robin.
  return t(keyMap[format] ?? (format === 'CUSTOM' ? 'dashboard.formatRoundRobin' : format))
}

/**
 * Map a RoundFormat enum value to its localized long description.
 * Used by the Round Config tab so organizers understand what each format does
 * without having to test them one by one.
 *   ROUND_ROBIN → dashboard.formatDescRoundRobin
 *   SWISS → dashboard.formatDescSwiss
 *   SINGLE_ELIM → dashboard.formatDescSingleElim
 *   ADJACENT_SWISS → dashboard.formatDescAdjSwiss
 */
export function formatRoundFormatDescription(format: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    ROUND_ROBIN: 'dashboard.formatDescRoundRobin',
    SWISS: 'dashboard.formatDescSwiss',
    SINGLE_ELIM: 'dashboard.formatDescSingleElim',
    ADJACENT_SWISS: 'dashboard.formatDescAdjSwiss',
  }
  return t(keyMap[format] ?? '')
}
