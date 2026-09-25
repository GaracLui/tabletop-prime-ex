/**
 * BoardGameGeek (BGG) Integration — mock implementation
 *
 * The PRD specifies fetching official game name, box art, and max player
 * count from BGG to validate table sizes. The real BGG XML API is rate-
 * limited and requires server-side caching. This mock returns realistic
 * data for the demo and exposes the same interface the real client will.
 */

export interface BggGame {
  bggId: string
  name: string
  maxPlayers: number
  thumbnail: string
  yearPublished: number
}

const MOCK_CATALOG: BggGame[] = [
  {
    bggId: '13',
    name: 'Catan',
    maxPlayers: 4,
    thumbnail: '',
    yearPublished: 1995,
  },
  {
    bggId: '174430',
    name: 'Terraforming Mars',
    maxPlayers: 5,
    thumbnail: '',
    yearPublished: 2016,
  },
  {
    bggId: '167791',
    name: 'Terraforming Mars: Ares Expedition',
    maxPlayers: 4,
    thumbnail: '',
    yearPublished: 2021,
  },
  {
    bggId: '224517',
    name: 'Brass: Birmingham',
    maxPlayers: 4,
    thumbnail: '',
    yearPublished: 2018,
  },
  {
    bggId: '161970',
    name: 'Scythe',
    maxPlayers: 5,
    thumbnail: '',
    yearPublished: 2016,
  },
  {
    bggId: '256040',
    name: 'Wingspan',
    maxPlayers: 5,
    thumbnail: '',
    yearPublished: 2019,
  },
  {
    bggId: '220308',
    name: 'Gaia Project',
    maxPlayers: 4,
    thumbnail: '',
    yearPublished: 2017,
  },
  {
    bggId: '198953',
    name: 'Agricola',
    maxPlayers: 4,
    thumbnail: '',
    yearPublished: 2007,
  },
]

/**
 * Mock search — real impl would call
 *   https://api.geekdo.com/xmlapi2/search?type=boardgame&query=...
 */
export async function searchBggGames(query: string): Promise<BggGame[]> {
  const q = query.trim().toLowerCase()
  if (!q) return MOCK_CATALOG.slice(0, 4)
  const matches = MOCK_CATALOG.filter((g) => g.name.toLowerCase().includes(q))
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 250))
  return matches.length > 0 ? matches : MOCK_CATALOG.slice(0, 3)
}

/** Validate that the table size fits the game's max. */
export function validateTableSize(
  game: BggGame | undefined,
  maxPerTable: number
): { ok: boolean; reason?: string } {
  if (!game) return { ok: true }
  if (maxPerTable > game.maxPlayers) {
    return {
      ok: false,
      reason: `${game.name} supports max ${game.maxPlayers} players, but tables are configured for ${maxPerTable}.`,
    }
  }
  return { ok: true }
}
