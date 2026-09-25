/**
 * GET /api/bgg?q=catan   → search local BGG dataset
 * GET /api/bgg?id=1234   → get game from local dataset
 *
 * Uses a local JSON file (public/bgg-games.json) instead of the live BGG API.
 * This avoids BGG's rate-limiting/blocking of serverless IPs (502 errors).
 *
 * The dataset is a static export from BGG (~48K games, ~2.8 MB). Update it
 * periodically by re-downloading from BGG and re-running the conversion script.
 */
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { checkRateLimit } from '@/lib/rate-limit'

interface BggGame {
  i: number  // game_id
  n: string  // name
  y: number  // year
  mn: number // min players
  mx: number // max players
}

// Load the dataset once (module-level cache — survives across serverless invocations).
let games: BggGame[] | null = null

function getGames(): BggGame[] {
  if (games) return games
  const filePath = join(process.cwd(), 'public', 'bgg-games.json')
  const raw = readFileSync(filePath, 'utf-8')
  games = JSON.parse(raw) as BggGame[]
  return games
}

export async function GET(req: Request) {
  // S7: the search mode scans a 48k-row dataset per request — brake scripts.
  const limit = checkRateLimit(req, 'bgg')
  if (!limit.ok) return limit.response

  const url = new URL(req.url)
  const query = url.searchParams.get('q')
  const id = url.searchParams.get('id')

  try {
    const allGames = getGames()

    if (query !== null) {
      // Search mode — case-insensitive substring match, sorted by relevance:
      //   1. Exact match first
      //   2. Starts-with matches
      //   3. Contains matches, sorted by year (newest first)
      const q = query.toLowerCase().trim()
      if (!q) return NextResponse.json({ results: [] })

      const matches = allGames
        .filter((g) => g.n.toLowerCase().includes(q))
        .map((g) => ({
          id: String(g.i),
          name: g.n,
          yearPublished: g.y || undefined,
          // Relevance score: exact match = 0, starts-with = 1, contains = 2
          relevance: g.n.toLowerCase() === q ? 0
            : g.n.toLowerCase().startsWith(q) ? 1
            : 2,
          year: g.y || 0,
        }))

      // Sort: relevance first, then year (newest first)
      matches.sort((a, b) => {
        if (a.relevance !== b.relevance) return a.relevance - b.relevance
        return b.year - a.year
      })

      const results = matches.slice(0, 50).map(({ relevance, year, ...g }) => g)

      return NextResponse.json({ results })
    }

    if (id) {
      // Details mode — find by ID
      const game = allGames.find((g) => String(g.i) === id)
      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }
      return NextResponse.json({
        game: {
          id: String(game.i),
          name: game.n,
          yearPublished: game.y || undefined,
          minPlayers: game.mn || undefined,
          maxPlayers: game.mx || undefined,
        },
      })
    }

    return NextResponse.json({ error: 'Missing q or id parameter' }, { status: 400 })
  } catch (err: any) {
    console.error('BGG search error:', err)
    return NextResponse.json(
      { error: 'Failed to search games' },
      { status: 500 }
    )
  }
}
