/**
 * GET /api/events/[eventId]/export?type=standings|matches&lang=en|es
 *
 * Returns CSV. Used by the organizer dashboard "Export CSV" dropdown.
 *
 *   ?type=standings → one row per player with totals + per-round breakdown
 *   ?type=matches   → one row per (round, table, player) with placement,
 *                     game points, base/bonus/total, AND a breakdown of the
 *                     bonus into flat vs multiplier components.
 *   ?lang=en|es     → translates the CSV column headers + filenames.
 *                     Defaults to 'en' if missing/invalid.
 */
import { NextResponse } from 'next/server'
import { requireParticipant } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { aggregateStandings, applyModifier } from '@/lib/engine/scoring-engine'
import type { ScoringRules } from '@/lib/types'
import enMessages from '@/messages/en.json'
import esMessages from '@/messages/es.json'
import type { Locale } from '@/lib/i18n'

function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  let s = String(value)
  // CSV formula injection prevention: if a cell starts with =, +, -, @, or a tab/newline,
  // prepend a single quote to prevent spreadsheet apps from interpreting it as a formula.
  // This is important because player names are user-supplied and could be malicious.
  if (/^[=+\-@\t\r\n]/.test(s)) {
    s = `'${s}`
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvRow(values: Array<string | number | undefined | null>): string {
  return values.map(csvEscape).join(',')
}

/**
 * Look up a dot-notation key in the messages object.
 * Falls back to the key itself if not found (so the CSV is never broken).
 */
function lookup(messages: Record<string, unknown>, key: string): string {
  const parts = key.split('.')
  let cur: unknown = messages
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return key
    }
  }
  return typeof cur === 'string' ? cur : key
}

/**
 * Build a translator function for the given locale.
 * Returns a function that looks up `dashboard.csv.*` keys.
 */
function makeCsvT(locale: Locale) {
  const messages = locale === 'es' ? esMessages : enMessages
  return (key: string) => lookup(messages, `dashboard.csv.${key}`)
}

/**
 * Break down a placement's bonus into flat vs multiplier components.
 *
 * Flat-type modifiers (add a fixed amount): ATTENDANCE_BONUS, FLAT_BONUS, CUSTOM
 * Multiplier-type modifiers (scale the running total): FINAL_ROUND_MULTIPLIER, MULTIPLIER
 *
 * Returns { flatBonus, multiplierBonus } — the delta from each category.
 * Recomputed from the event's current scoring rules at export time.
 */
function breakdownBonus(
  rules: ScoringRules,
  placement: number,
  gamePoints: number,
  round: number,
  totalRounds: number,
): { flatBonus: number; multiplierBonus: number } {
  const idx = Math.max(0, placement - 1)
  const basePoints = rules.placementPoints[idx] ?? 0
  let runningTotal = basePoints
  let flatBonus = 0
  let multiplierBonus = 0

  const ctx = {
    playerId: '', // not needed for applyModifier
    placement,
    gamePoints,
    round,
    totalRounds,
    attended: true, // assume attended — the score was submitted
  }

  for (const mod of rules.modifiers) {
    const delta = applyModifier(mod, runningTotal, ctx)
    if (delta !== 0) {
      if (mod.type === 'MULTIPLIER' || mod.type === 'FINAL_ROUND_MULTIPLIER') {
        multiplierBonus += delta
      } else {
        flatBonus += delta
      }
      runningTotal += delta
    }
  }

  return { flatBonus, multiplierBonus }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const auth = await requireParticipant(eventId)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'standings'
  const langParam = url.searchParams.get('lang') === 'es' ? 'es' : 'en'
  const t = makeCsvT(langParam as Locale)

  // Parallel fetch with only the columns we need.
  const [event, players, scores] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, totalRounds: true, scoringRulesJson: true },
    }),
    db.player.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.tableScore.findMany({
      where: { eventId, state: { in: ['LOCKED', 'DISPUTED'] } },
      orderBy: [{ round: 'asc' }, { tableNumber: 'asc' }],
      include: {
        placements: {
          select: { playerId: true, placement: true, gamePoints: true, basePoints: true, bonus: true, total: true },
        },
      },
    }),
  ])
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const scoringRules: ScoringRules = JSON.parse(event.scoringRulesJson)
  const playerMap = new Map(players.map((p) => [p.id, p]))

  // Build a round-label lookup map (for bonus round labels in the CSV)
  const allPairings = await db.roundPairing.findMany({
    where: { eventId },
    select: { round: true, label: true, isBonus: true },
  })
  const roundLabelMap = new Map<number, string>()
  for (const r of allPairings) {
    if (r.label) {
      roundLabelMap.set(r.round, r.label)
    } else if (r.isBonus) {
      roundLabelMap.set(r.round, t('bonusRoundN').replace('{n}', String(r.round)))
    } else {
      // Regular round: just the round number (no "Round " prefix needed —
      // the column already has the round number separately).
      roundLabelMap.set(r.round, String(r.round))
    }
  }

  let csv = ''
  let filename = ''

  if (type === 'standings') {
    const playerIds = players.map((p) => p.id)
    const scoresData = scores.map((s) => ({
      placements: s.placements.map((p) => ({
        playerId: p.playerId, placement: p.placement, gamePoints: p.gamePoints,
        basePoints: p.basePoints, bonus: p.bonus, total: p.total,
      })),
      state: s.state, round: s.round, tableNumber: s.tableNumber,
      tablePointsTotal: s.tablePointsTotal,
    }))
    const standings = aggregateStandings(playerIds, scoresData, scoringRules)

    const maxRound = event.totalRounds
    const roundHeaders: string[] = []
    for (let r = 1; r <= maxRound; r++) {
      const roundLabel = t('roundN').replace('{n}', String(r))
      roundHeaders.push(`${roundLabel}_${t('place')}`, `${roundLabel}_${t('gamePts')}`, `${roundLabel}_${t('total')}`)
    }
    const header = [
      t('rank'), t('name'), t('eventPoints'), t('gamePoints'), t('tablePoints'),
      t('roundsPlayed'), t('firstPlaces'), t('bestPlacement'), t('dropWorst'),
      ...roundHeaders,
    ]
    csv = csvRow(header) + '\n'
    standings.forEach((row, idx) => {
      const line: Array<string | number> = [idx + 1, playerMap.get(row.playerId)?.name ?? 'Unknown']
      line.push(row.total, row.gamePointsTotal, row.accumulatedTablePoints)
      line.push(row.rounds, row.firstPlaceCount, row.bestPlacement || '', row.dropWorstTotal)
      for (let r = 1; r <= maxRound; r++) {
        const pr = row.perRound[r]
        line.push(pr?.placement ?? '', pr?.gamePoints ?? '', pr?.total ?? '')
      }
      csv += csvRow(line) + '\n'
    })
    filename = t('standingsFilename').replace('{name}', slugify(event.name))
  } else if (type === 'matches') {
    const header = [
      t('round'), t('roundLabel'), t('table'), t('player'), t('placement'), t('gamePoints'),
      t('basePoints'), t('bonus'), t('flatBonus'), t('multiplierBonus'), t('total'),
      t('state'), t('tablePointsTotal'), t('playersAtTable'),
    ]
    csv = csvRow(header) + '\n'
    for (const s of scores) {
      const placements = [...s.placements].sort((a, b) => a.placement - b.placement)
      for (const p of placements) {
        const { flatBonus, multiplierBonus } = breakdownBonus(
          scoringRules,
          p.placement,
          p.gamePoints,
          s.round,
          event.totalRounds,
        )
        const line: Array<string | number> = [
          s.round,
          roundLabelMap.get(s.round) || String(s.round),
          s.tableNumber,
          playerMap.get(p.playerId)?.name ?? 'Unknown',
          p.placement, p.gamePoints, p.basePoints, p.bonus,
          flatBonus, multiplierBonus,
          p.total,
          s.state, s.tablePointsTotal, placements.length,
        ]
        csv += csvRow(line) + '\n'
      }
    }
    filename = t('matchesFilename').replace('{name}', slugify(event.name))
  } else {
    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'event'
}
