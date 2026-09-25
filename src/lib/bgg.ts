/**
 * BGG XML2 API client — BoardGameGeek integration.
 *
 * The BGG XML2 API is free, no auth needed, but rate-limited to ~1 request/sec.
 * We use a "Search BGG" button (not live autocomplete) to avoid rate-limiting.
 *
 * Endpoints used:
 *   • https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=catan
 *     Returns a list of games with id + name.
 *   • https://boardgamegeek.com/xmlapi2/thing?id=1234&type=boardgame
 *     Returns full game details (players, playtime, image, description).
 *
 * Response format: XML. We parse it server-side to avoid shipping an XML
 * parser to the client.
 */

export interface BggSearchResult {
  id: string
  name: string
  yearPublished?: number
}

export interface BggGameDetails {
  id: string
  name: string
  yearPublished?: number
  minPlayers?: number
  maxPlayers?: number
  minPlaytime?: number
  maxPlaytime?: number
  thumbnail?: string
  image?: string
  description?: string
}

/**
 * Search BGG for board games by name.
 * Returns up to 20 results.
 */
export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(trimmed)}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/xml' },
    // BGG can be slow (2-5s). Give it 10s.
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`BGG search failed: ${res.status}`)
  }

  const xml = await res.text()
  return parseBggSearchResults(xml)
}

/**
 * Get detailed info about a specific BGG game by its ID.
 */
export async function getBggGameDetails(bggid: string): Promise<BggGameDetails | null> {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggid}&type=boardgame`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`BGG details failed: ${res.status}`)
  }

  const xml = await res.text()
  return parseBggGameDetails(xml, bggid)
}

// ---------------------------------------------------------------------------
// XML parsing — minimal DOM-based parser using DOMParser (available in Node 20+).
// BGG's XML is simple and well-structured, so we don't need a full XML library.
// ---------------------------------------------------------------------------

function parseBggSearchResults(xml: string): BggSearchResult[] {
  if (typeof DOMParser === 'undefined') {
    // Fallback for environments without DOMParser (shouldn't happen in Node 20+)
    return []
  }

  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const items = doc.getElementsByTagName('item')
  const results: BggSearchResult[] = []

  for (let i = 0; i < items.length && i < 20; i++) {
    const item = items[i]
    const id = item.getAttribute('id') || ''
    if (!id) continue

    // The name element is a child of <item>
    const nameEl = item.getElementsByTagName('name')[0]
    const name = nameEl?.getAttribute('value') || 'Unknown'
    const yearEl = item.getElementsByTagName('yearpublished')[0]
    const year = yearEl?.getAttribute('value')

    results.push({
      id,
      name,
      yearPublished: year ? parseInt(year, 10) : undefined,
    })
  }

  return results
}

function parseBggGameDetails(xml: string, bggid: string): BggGameDetails | null {
  if (typeof DOMParser === 'undefined') return null

  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const item = doc.getElementsByTagName('item')[0]
  if (!item) return null

  const getName = (tag: string): string | undefined => {
    const el = item.getElementsByTagName(tag)[0]
    return el?.getAttribute('value') || undefined
  }

  const getInt = (tag: string): number | undefined => {
    const v = getName(tag)
    return v ? parseInt(v, 10) : undefined
  }

  // Primary name (type="primary")
  let name: string | undefined
  const nameEls = item.getElementsByTagName('name')
  for (let i = 0; i < nameEls.length; i++) {
    if (nameEls[i].getAttribute('type') === 'primary') {
      name = nameEls[i].getAttribute('value') || undefined
      break
    }
  }
  if (!name && nameEls.length > 0) {
    name = nameEls[0].getAttribute('value') || undefined
  }

  return {
    id: bggid,
    name: name || 'Unknown',
    yearPublished: getInt('yearpublished'),
    minPlayers: getInt('minplayers'),
    maxPlayers: getInt('maxplayers'),
    minPlaytime: getInt('minplaytime'),
    maxPlaytime: getInt('maxplaytime'),
    thumbnail: getName('thumbnail'),
    image: getName('image'),
    description: getName('description'),
  }
}
