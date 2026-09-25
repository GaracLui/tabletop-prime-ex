/**
 * GET /api/stats/player?eventId=X  → per-event stats for the current user
 * GET /api/stats/player            → global stats across all events
 *
 * Computes stats on-the-fly from PlacementScore + TableScore data.
 * Cached for 60s via TanStack Query on the client.
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { db } from '@/lib/db'

interface PlayerStat {
  eventId: string
  eventName: string
  gameName: string
  roundsPlayed: number
  totalPoints: number
  gamePointsTotal: number
  averagePlacement: number
  bestPlacement: number
  worstPlacement: number
  firstPlaceCount: number
  winRate: number
}

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const userId = auth.value.profile.id
  const url = new URL(req.url)
  const eventId = url.searchParams.get('eventId')

  // Find all Player rows linked to this user
  const players = await db.player.findMany({
    where: { userId },
    select: { id: true, eventId: true, name: true },
  })

  if (players.length === 0) {
    return NextResponse.json({ stats: [], summary: null })
  }

  // If eventId is provided, filter to just that event
  const filteredPlayers = eventId
    ? players.filter((p) => p.eventId === eventId)
    : players

  if (filteredPlayers.length === 0) {
    return NextResponse.json({ stats: [], summary: null })
  }

  // Get all events these players belong to
  const eventIds = [...new Set(filteredPlayers.map((p) => p.eventId))]
  const events = await db.event.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true,
      name: true,
      gameName: true,
      totalRounds: true,
      status: true,
    },
  })
  const eventMap = new Map(events.map((e) => [e.id, e]))

  // Get all LOCKED/DISPUTED scores for these events
  const scores = await db.tableScore.findMany({
    where: {
      eventId: { in: eventIds },
      state: { in: ['LOCKED', 'DISPUTED'] },
    },
    include: {
      placements: {
        select: {
          playerId: true, placement: true, gamePoints: true,
          basePoints: true, bonus: true, total: true,
        },
      },
    },
    orderBy: [{ round: 'asc' }, { tableNumber: 'asc' }],
  })

  // Build stats per event
  const stats: PlayerStat[] = []

  for (const player of filteredPlayers) {
    const event = eventMap.get(player.eventId)
    if (!event) continue

    const eventScores = scores.filter((s) => s.eventId === player.eventId)
    const playerPlacements = eventScores
      .flatMap((s) => s.placements)
      .filter((p) => p.playerId === player.id)

    if (playerPlacements.length === 0) continue

    const placements = playerPlacements.map((p) => p.placement)
    const totalPoints = playerPlacements.reduce((sum, p) => sum + p.total, 0)
    const gamePointsTotal = playerPlacements.reduce((sum, p) => sum + p.gamePoints, 0)
    const firstPlaceCount = placements.filter((p) => p === 1).length
    const avgPlacement = placements.reduce((a, b) => a + b, 0) / placements.length

    stats.push({
      eventId: event.id,
      eventName: event.name,
      gameName: event.gameName,
      roundsPlayed: playerPlacements.length,
      totalPoints,
      gamePointsTotal,
      averagePlacement: Math.round(avgPlacement * 10) / 10,
      bestPlacement: Math.min(...placements),
      worstPlacement: Math.max(...placements),
      firstPlaceCount,
      winRate: Math.round((firstPlaceCount / playerPlacements.length) * 100),
    })
  }

  // Build summary across all events
  const summary = stats.length > 0 ? {
    totalEvents: stats.length,
    totalRounds: stats.reduce((s, st) => s + st.roundsPlayed, 0),
    totalPoints: stats.reduce((s, st) => s + st.totalPoints, 0),
    totalGamePoints: stats.reduce((s, st) => s + st.gamePointsTotal, 0),
    totalFirstPlaces: stats.reduce((s, st) => s + st.firstPlaceCount, 0),
    averagePlacement: Math.round(
      (stats.reduce((s, st) => s + st.averagePlacement * st.roundsPlayed, 0) /
        stats.reduce((s, st) => s + st.roundsPlayed, 0)) * 10
    ) / 10,
    overallWinRate: Math.round(
      (stats.reduce((s, st) => s + st.firstPlaceCount, 0) /
        stats.reduce((s, st) => s + st.roundsPlayed, 0)) * 100
    ),
  } : null

  return NextResponse.json({ stats, summary })
}
