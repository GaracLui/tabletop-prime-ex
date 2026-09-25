/**
 * Shared UI utility helpers used across tournament components.
 */

/**
 * Format a number as an ordinal string: 1 → "1st", 2 → "2nd", 11 → "11th".
 */
export function ordinal(n: number): string {
  const suffix =
    n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

/**
 * Tailwind classes for each score state badge.
 * Used by: round-status-dashboard, pairing-board, judge-view, advance-prompt.
 */
export function getScoreStateBadgeClass(state: string): string {
  switch (state) {
    case 'LOCKED':
      return 'bg-emerald-500 text-white'
    case 'PENDING_CONFIRM':
      return 'bg-amber-500 text-white'
    case 'DISPUTED':
      return 'bg-rose-500 text-white'
    case 'MISSING':
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Tailwind classes for each score state's border/background tint.
 * Used by: round-status-dashboard table cards.
 */
export function getScoreStateCardClass(state: string): string {
  switch (state) {
    case 'LOCKED':
      return 'border-emerald-500/30 bg-emerald-500/5'
    case 'PENDING_CONFIRM':
      return 'border-amber-500/30 bg-amber-500/5'
    case 'DISPUTED':
      return 'border-rose-500/30 bg-rose-500/5'
    case 'MISSING':
    default:
      return 'border-border/60 bg-muted/20'
  }
}
