/**
 * CSV export utilities — PRD §3.6 (Tier 1 feature)
 *
 * Generates CSV strings for standings and match history, then triggers
 * a browser download via a Blob URL. Values are RFC 4180 compliant.
 */

import type { TournamentEvent, Player } from '@/lib/types'

function csvField(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvRow(fields: Array<string | number | undefined | null>): string {
  return fields.map(csvField).join(',')
}

function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'event'
}

export interface StandingsRow {
  playerId: string
  total: number
  gamePointsTotal: number
  accumulatedTablePoints: number
  rounds: number
  bestPlacement: number
  perRound: Record<
    number,
    { total: number; gamePoints: number; placement: number; table: number; tablePoints: number }
  >
}

export function exportStandingsCsv(
  event: TournamentEvent,
  players: Player[],
  standings: StandingsRow[]
): void {
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const maxRound = event.totalRounds

  const headers = [
    'Rank', 'Player', 'Rounds Played', 'Best Placement',
    'Game Pts', 'Table Pts', 'Event Pts',
  ]
  for (let r = 1; r <= maxRound; r++) {
    headers.push(`R${r} Placement`, `R${r} Game Pts`, `R${r} Event Pts`)
  }

  const rows: string[] = [csvRow(headers)]

  standings.forEach((row, idx) => {
    const player = playerMap.get(row.playerId)
    const fields: Array<string | number> = [
      idx + 1,
      player?.name ?? 'Unknown',
      row.rounds,
      row.bestPlacement > 0 ? row.bestPlacement : '',
      row.gamePointsTotal,
      row.accumulatedTablePoints,
      row.total,
    ]
    for (let r = 1; r <= maxRound; r++) {
      const pr = row.perRound[r]
      fields.push(pr ? pr.placement : '', pr ? pr.gamePoints : '', pr ? pr.total : '')
    }
    rows.push(csvRow(fields))
  })

  const csv = rows.join('\n')
  downloadCsv(`${slugify(event.name)}-standings.csv`, csv)
}

export function exportMatchHistoryCsv(
  event: TournamentEvent,
  players: Player[]
): void {
  const playerMap = new Map(players.map((p) => [p.id, p]))

  const headers = [
    'Round', 'Table', 'Format', 'Player', 'Placement',
    'Game Pts', 'Base Pts', 'Bonus', 'Total',
    'Table Pts Total', 'Score State', 'Submitted By', 'Confirmed By', 'Judge Note',
  ]

  const rows: string[] = [csvRow(headers)]

  const sortedScores = [...event.scores].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    return a.tableNumber - b.tableNumber
  })

  for (const score of sortedScores) {
    const pairing = event.pairings.find((p) => p.round === score.round)
    const format = pairing?.format ?? ''
    const sortedPlacements = [...score.placements].sort(
      (a, b) => a.placement - b.placement
    )

    for (const placement of sortedPlacements) {
      const player = playerMap.get(placement.playerId)
      const submitterName = score.submittedBy === 'JUDGE_PROXY'
        ? 'Judge (proxy)'
        : playerMap.get(score.submittedBy ?? '')?.name ?? score.submittedBy ?? ''
      const confirmerName = score.confirmedBy === 'JUDGE_PROXY'
        ? 'Judge (proxy)'
        : playerMap.get(score.confirmedBy ?? '')?.name ?? score.confirmedBy ?? ''

      rows.push(csvRow([
        score.round,
        score.tableNumber,
        format,
        player?.name ?? 'Unknown',
        placement.placement,
        placement.gamePoints,
        placement.basePoints,
        placement.bonus,
        placement.total,
        score.tablePointsTotal,
        score.state,
        submitterName,
        confirmerName,
        score.note ?? '',
      ]))
    }
  }

  const csv = rows.join('\n')
  downloadCsv(`${slugify(event.name)}-match-history.csv`, csv)
}
