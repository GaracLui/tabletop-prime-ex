/**
 * Share utilities — DRY helpers for generating shareable text and
 * invoking the native Web Share API.
 *
 * Used by:
 *   - Dashboard "Share" button (event link + standings + pairings)
 *   - Companion "Share my result" button
 *   - Public share page
 */

interface ShareableEvent {
  name: string
  gameName: string
  status: string
  currentRound: number
  totalRounds: number
}

interface ShareableStanding {
  name: string
  color: string
  total: number
  gamePointsTotal: number
  rounds: number
}

interface ShareablePairing {
  round: number
  label: string | null
  isBonus: boolean
  tables: Array<{
    tableNumber: number
    players: Array<{ name: string; color: string }>
  }>
}

/**
 * Generate a formatted text summary of standings for clipboard/messaging.
 *
 * Example output:
 *   🎲 Summer Showdown — Catan
 *   Round 3 of 4 · Active
 *
 *   1. Ava      28 pts
 *   2. Liam     24 pts
 *   3. Mia      21 pts
 *   ...
 *
 *   See full standings: https://your-url/share/SUMMER-7K3
 */
export function formatStandingsText(
  event: ShareableEvent,
  standings: ShareableStanding[],
  shareUrl: string,
): string {
  const lines: string[] = [
    `🎲 ${event.name} — ${event.gameName}`,
    `Round ${event.currentRound} of ${event.totalRounds} · ${event.status}`,
    '',
  ]

  const maxNameLen = Math.max(...standings.map((s) => s.name.length), 4)
  for (const [i, s] of standings.entries()) {
    const rank = String(i + 1).padStart(2)
    const name = s.name.padEnd(maxNameLen + 2)
    lines.push(`${rank}. ${name}${s.total} pts`)
  }

  lines.push('', `See full standings: ${shareUrl}`)
  return lines.join('\n')
}

/**
 * Generate a formatted text summary of a round's pairings for clipboard/messaging.
 *
 * Example output:
 *   🎲 Summer Showdown — Round 3
 *
 *   Table 1: Ava, Liam, Mia, Noah
 *   Table 2: Zoe, Kai, Emma, Leo
 *
 *   Join: https://your-url/share/SUMMER-7K3
 */
export function formatPairingsText(
  event: ShareableEvent,
  pairing: ShareablePairing,
  shareUrl: string,
): string {
  const label = pairing.label || `Round ${pairing.round}`
  const lines: string[] = [
    `🎲 ${event.name} — ${label}`,
    '',
  ]

  for (const table of pairing.tables) {
    const names = table.players.map((p) => p.name).join(', ')
    lines.push(`Table ${table.tableNumber}: ${names}`)
  }

  lines.push('', `Join: ${shareUrl}`)
  return lines.join('\n')
}

/**
 * Generate a short event invitation text for messaging apps.
 *
 * Example:
 *   🎲 Join "Summer Showdown" on TableTop Prime!
 *   Use code: SUMMER-7K3
 *   Or visit: https://your-url/share/SUMMER-7K3
 */
export function formatEventInvite(
  eventName: string,
  eventCode: string,
  shareUrl: string,
): string {
  return [
    `🎲 Join "${eventName}" on TableTop Prime!`,
    `Use code: ${eventCode}`,
    `Or visit: ${shareUrl}`,
  ].join('\n')
}

/**
 * Invoke the native Web Share API if available (mobile browsers, some desktop).
 * Falls back to copying text to clipboard.
 *
 * Returns true if shared/copied successfully, false if it failed.
 */
export async function webShare(
  title: string,
  text: string,
  url?: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const shareData: ShareData = { title, text }
  if (url) shareData.url = url

  // Try native Web Share API first
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch {
      // User cancelled — not a failure, just don't copy
      return 'shared'
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  return false
}

/**
 * Build the public share URL for an event.
 */
export function buildShareUrl(eventCode: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/share/${eventCode}`
  }
  return `/share/${eventCode}`
}
