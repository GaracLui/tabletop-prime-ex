/**
 * Prime tier pricing & feature matrix — straight from the PRD §4.
 * v2: default scoring rules now ship a clean modifier list.
 */
import type { PrimePlan, ScoringRules } from '@/lib/types'

export const PRIME_PLANS: PrimePlan[] = [
  {
    tier: 'FREE',
    name: 'Free',
    maxPlayers: 11,
    pricePerMonth: 0,
    target: 'Small groups',
    features: [
      'Multiplayer Pairing',
      'Basic Scoring',
      'Player QR Check-In',
      'Dual-Score Verification',
    ],
  },
  {
    tier: 'TIER_1',
    name: 'Tier 1',
    maxPlayers: 37,
    pricePerMonth: 1,
    target: 'Medium assoc.',
    features: [
      'BGG Integration',
      'Drops / Late Arrivals',
      'Custom Scoring',
      'League Modifiers',
      'CSV Export',
      'Event Templates',
    ],
  },
  {
    tier: 'TIER_2',
    name: 'Tier 2',
    maxPlayers: 61,
    pricePerMonth: 3,
    target: 'Large assoc.',
    highlight: true,
    features: [
      'Judge Role Access',
      '"Call Judge" Comms',
      'Drag-and-Drop Tables',
      '"Ready" Toggle',
      'Phased Events',
      'PDF Export',
    ],
  },
  {
    tier: 'TIER_3',
    name: 'Tier 3',
    maxPlayers: 97,
    pricePerMonth: 5,
    target: 'Conventions',
    features: ['PWA Offline Mode', 'Custom Branding', 'Priority Support'],
  },
]

export const PLAYER_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-pink-500',
]

export function makeDefaultScoringRules(): ScoringRules {
  return {
    placementPoints: [10, 6, 3, 1],
    // No modifiers by default — organizers add their own through the
    // Scoring Rules tab (FLAT_BONUS, MULTIPLIER, ATTENDANCE_BONUS, etc.).
    modifiers: [],
    tiebreakers: [
      'TOTAL_GAME_POINTS',
      'FIRST_PLACES',
      'BEST_PLACEMENT',
    ],
  }
}
