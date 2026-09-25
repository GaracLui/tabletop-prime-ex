/**
 * Generate a short, human-readable event code.
 * Format: WORD-XXXXXXXX (e.g., "SUMMER-7K3M9X2P")
 *
 * The code is derived from the event name + a random 8-char suffix using
 * crypto.getRandomValues (cryptographically secure, not Math.random).
 * The suffix has ~40 bits of entropy (32^8 ≈ 1 trillion) which makes
 * brute-force enumeration infeasible.
 *
 * The code is stored on the Event row and used by players to join + as
 * the URL for the public share page.
 */
const ADJECTIVES = [
  'SUMMER', 'WINTER', 'SPRING', 'AUTUMN', 'NIGHT', 'GOLDEN',
  'CRIMSON', 'AZURE', 'RAPID', 'GRAND', 'EPIC', 'ROYAL',
]

// No confusing chars: no 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateEventCode(eventName: string): string {
  // Pick an adjective based on the event name hash (deterministic, not secret)
  let hash = 0
  for (let i = 0; i < eventName.length; i++) {
    hash = (hash * 31 + eventName.charCodeAt(i)) | 0
  }
  const adjective = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length]

  // Generate an 8-char suffix using crypto.getRandomValues (CSPRNG).
  // ~40 bits of entropy (32^8 ≈ 1.1 trillion combinations) — far harder
  // to enumerate than the old 3-char Math.random() suffix (~20 bits).
  const suffixLength = 8
  const randomValues = new Uint32Array(suffixLength)
  crypto.getRandomValues(randomValues)

  let suffix = ''
  for (let i = 0; i < suffixLength; i++) {
    suffix += CHARS[randomValues[i] % CHARS.length]
  }

  return `${adjective}-${suffix}`
}
