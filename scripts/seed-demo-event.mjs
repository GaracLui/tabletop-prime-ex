#!/usr/bin/env node
/**
 * seed-demo-event.mjs — creates (or refreshes) a public demo event at
 * eventCode = 'demo' so the landing page "See a demo event" CTA resolves.
 *
 * The demo event is a complete, realistic 12-player Catan tournament with:
 *   - 3 rounds already paired (Round Robin)
 *   - Round 1 + 2 scores LOCKED with realistic placements + game points
 *   - Round 3 paired but unscored (so the visitor sees "pending" state too)
 *   - A description, schedule, and 4 player colors
 *
 * The script is IDEMPOTENT: re-running it wipes and recreates the demo event
 * (so you can refresh the sample data after a schema change). It does NOT
 * touch any other events in the database.
 *
 * USAGE:
 *   bun scripts/seed-demo-event.mjs
 *     (or: npx tsx scripts/seed-demo-event.mjs)
 *
 * For production: set DATABASE_URL first, then run the same command.
 *
 * After running, visit https://your-domain/share/demo to see the public page.
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// Load .env manually so the script works without dotenv preloaded.
const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1].trim()
  }
} catch {
  // .env missing — DATABASE_URL must already be in the env (e.g., CI/prod).
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.')
  console.error('   Create .env at the project root with DATABASE_URL=postgresql://...,')
  console.error('   or prefix the command:')
  console.error('       DATABASE_URL="postgresql://..." node scripts/seed-demo-event.mjs')
  process.exit(1)
}

// Prisma v7 requires a driver adapter (no Rust engine binary). We import the
// generated client + the PrismaPg adapter, same as src/lib/db.ts.
const { PrismaClient } = await import('../src/generated/prisma/client')
const { PrismaPg } = await import('@prisma/adapter-pg')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter, log: ['error', 'warn'] })

const DEMO_EVENT_CODE = 'demo'

// Demo event config — a realistic 12-player Catan tournament.
const PLAYER_NAMES = [
  'Alice', 'Bruno', 'Camila', 'Diego', 'Elena', 'Federico',
  'Gloria', 'Hugo', 'Isabel', 'Joaquín', 'Laura', 'Mateo',
]
const PLAYER_COLORS = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-fuchsia-500', 'bg-cyan-500', 'bg-lime-500',
  'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]

const SCORING_RULES = {
  placementPoints: [10, 6, 3, 1],
  modifiers: [],
  tiebreakers: ['TOTAL_GAME_POINTS', 'FIRST_PLACES', 'BEST_PLACEMENT'],
}

// Round 1: 3 tables of 4. Player indices in seating order.
const ROUND_1_TABLES = [
  ['p01', 'p02', 'p03', 'p04'],
  ['p05', 'p06', 'p07', 'p08'],
  ['p09', 'p10', 'p11', 'p12'],
]

// Round 1 scores (LOCKED): placements + gamePoints per table.
// Each table: [playerId, placement, gamePoints]
const ROUND_1_SCORES = [
  // Table 1: Alice 1st, Bruno 2nd, Camila 3rd, Diego 4th
  [
    { playerId: 'p01', placement: 1, gamePoints: 10 },
    { playerId: 'p02', placement: 2, gamePoints: 6 },
    { playerId: 'p03', placement: 3, gamePoints: 3 },
    { playerId: 'p04', placement: 4, gamePoints: 1 },
  ],
  // Table 2: Federico 1st, Elena 2nd, Gloria 3rd, Hugo 4th
  [
    { playerId: 'p06', placement: 1, gamePoints: 8 },
    { playerId: 'p05', placement: 2, gamePoints: 5 },
    { playerId: 'p07', placement: 3, gamePoints: 4 },
    { playerId: 'p08', placement: 4, gamePoints: 0 },
  ],
  // Table 3: Joaquín 1st, Isabel 2nd, Laura 3rd, Mateo 4th
  [
    { playerId: 'p10', placement: 1, gamePoints: 9 },
    { playerId: 'p09', placement: 2, gamePoints: 7 },
    { playerId: 'p11', placement: 3, gamePoints: 2 },
    { playerId: 'p12', placement: 4, gamePoints: 1 },
  ],
]

// Round 2: shuffled to minimize rematches (different table composition)
const ROUND_2_TABLES = [
  ['p01', 'p05', 'p09', 'p12'],
  ['p02', 'p06', 'p10', 'p11'],
  ['p03', 'p04', 'p07', 'p08'],
]

const ROUND_2_SCORES = [
  // Table 1: Alice wins again, Federico drops to 3rd
  [
    { playerId: 'p01', placement: 1, gamePoints: 11 },
    { playerId: 'p12', placement: 2, gamePoints: 6 },
    { playerId: 'p05', placement: 3, gamePoints: 3 },
    { playerId: 'p09', placement: 4, gamePoints: 2 },
  ],
  // Table 2: Joaquín 1st, Bruno 2nd
  [
    { playerId: 'p10', placement: 1, gamePoints: 8 },
    { playerId: 'p02', placement: 2, gamePoints: 7 },
    { playerId: 'p06', placement: 3, gamePoints: 4 },
    { playerId: 'p11', placement: 4, gamePoints: 1 },
  ],
  // Table 3: Camila wins, Diego 2nd
  [
    { playerId: 'p03', placement: 1, gamePoints: 9 },
    { playerId: 'p04', placement: 2, gamePoints: 6 },
    { playerId: 'p07', placement: 3, gamePoints: 3 },
    { playerId: 'p08', placement: 4, gamePoints: 0 },
  ],
]

// Round 3: paired but unscored (visitor sees "pending" state)
const ROUND_3_TABLES = [
  ['p01', 'p10', 'p03', 'p12'],
  ['p02', 'p05', 'p04', 'p09'],
  ['p06', 'p07', 'p08', 'p11'],
]

/** Build the tablesJson string for a RoundPairing row. */
function tablesJson(tables) {
  return JSON.stringify(
    tables.map((playerIds, i) => ({ tableNumber: i + 1, playerIds }))
  )
}

/** Compute basePoints + total from a placement using the scoring rules. */
function computeScore(placement, gamePoints) {
  const basePoints = SCORING_RULES.placementPoints[placement - 1] ?? 0
  return { basePoints, bonus: 0, total: basePoints + gamePoints }
}

async function main() {
  console.log('🌱 Seeding demo event (eventCode = "demo")...')

  // 1. Find an existing demo event (by eventCode). If found, delete it
  //    CASCADE so all players, pairings, scores, configs go with it.
  const existing = await db.event.findUnique({
    where: { eventCode: DEMO_EVENT_CODE },
    select: { id: true },
  })
  if (existing) {
    console.log('   Found existing demo event — deleting (CASCADE)...')
    await db.event.delete({ where: { id: existing.id } })
  }

  // 2. Create the event with description + schedule.
  const event = await db.event.create({
    data: {
      name: 'Spring Catan Championship — Demo',
      gameName: 'Catan',
      gameBggId: '13',
      gameMaxPlayers: 4,
      minPlayersPerTable: 3,
      maxPlayersPerTable: 4,
      totalRounds: 4,
      status: 'ACTIVE',
      currentRound: 3,
      primeTier: 'FREE',
      eventCode: DEMO_EVENT_CODE,
      scoringRulesJson: JSON.stringify(SCORING_RULES),
      description:
        'A sample tournament so visitors can see what a public share page looks like. ' +
        'Feel free to browse the standings, pairings, and scores. This event is reset periodically.',
      scheduleJson: JSON.stringify([
        {
          start: '2026-09-20T14:00:00-03:00',
          end: '2026-09-20T20:00:00-03:00',
        },
      ]),
    },
  })
  console.log(`   Created event: ${event.id}`)

  // 3. Create 12 players with deterministic IDs (p01..p12) so the fixture
  //    tables above can reference them directly.
  const players = []
  for (let i = 0; i < PLAYER_NAMES.length; i++) {
    const player = await db.player.create({
      data: {
        id: `p${String(i + 1).padStart(2, '0')}`,
        name: PLAYER_NAMES[i],
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        checkedIn: true,
        ready: true,
        eventId: event.id,
      },
    })
    players.push(player)
  }
  console.log(`   Created ${players.length} players`)

  // 4. Round configs — all 4 rounds use ROUND_ROBIN with 3-4 per table.
  for (let r = 1; r <= 4; r++) {
    await db.roundConfig.create({
      data: {
        eventId: event.id,
        round: r,
        format: 'ROUND_ROBIN',
        minPerTable: 3,
        maxPerTable: 4,
        modifiersJson: '[]',
      },
    })
  }
  console.log('   Created 4 round configs')

  // 5. Round 1 pairing + LOCKED scores.
  await db.roundPairing.create({
    data: {
      eventId: event.id,
      round: 1,
      format: 'ROUND_ROBIN',
      tablesJson: tablesJson(ROUND_1_TABLES),
      droppedPlayerIdsJson: '[]',
    },
  })
  for (let t = 0; t < ROUND_1_SCORES.length; t++) {
    const placements = ROUND_1_SCORES[t]
    const tablePointsTotal = placements.reduce((s, p) => s + p.gamePoints, 0)
    const tableScore = await db.tableScore.create({
      data: {
        eventId: event.id,
        round: 1,
        tableNumber: t + 1,
        state: 'LOCKED',
        tablePointsTotal,
        submittedBy: placements[0].playerId,
        confirmedBy: placements[1].playerId,
        placements: {
          create: placements.map((p) => {
            const { basePoints, bonus, total } = computeScore(p.placement, p.gamePoints)
            return {
              playerId: p.playerId,
              placement: p.placement,
              gamePoints: p.gamePoints,
              basePoints,
              bonus,
              total,
            }
          }),
        },
      },
    })
    void tableScore
  }
  console.log('   Round 1: pairing + 3 LOCKED table scores created')

  // 6. Round 2 pairing + LOCKED scores.
  await db.roundPairing.create({
    data: {
      eventId: event.id,
      round: 2,
      format: 'ROUND_ROBIN',
      tablesJson: tablesJson(ROUND_2_TABLES),
      droppedPlayerIdsJson: '[]',
    },
  })
  for (let t = 0; t < ROUND_2_SCORES.length; t++) {
    const placements = ROUND_2_SCORES[t]
    const tablePointsTotal = placements.reduce((s, p) => s + p.gamePoints, 0)
    const tableScore = await db.tableScore.create({
      data: {
        eventId: event.id,
        round: 2,
        tableNumber: t + 1,
        state: 'LOCKED',
        tablePointsTotal,
        submittedBy: placements[0].playerId,
        confirmedBy: placements[1].playerId,
        placements: {
          create: placements.map((p) => {
            const { basePoints, bonus, total } = computeScore(p.placement, p.gamePoints)
            return {
              playerId: p.playerId,
              placement: p.placement,
              gamePoints: p.gamePoints,
              basePoints,
              bonus,
              total,
            }
          }),
        },
      },
    })
    void tableScore
  }
  console.log('   Round 2: pairing + 3 LOCKED table scores created')

  // 7. Round 3 pairing — NO scores (visitor sees "pending" state).
  await db.roundPairing.create({
    data: {
      eventId: event.id,
      round: 3,
      format: 'ROUND_ROBIN',
      tablesJson: tablesJson(ROUND_3_TABLES),
      droppedPlayerIdsJson: '[]',
    },
  })
  console.log('   Round 3: pairing created (no scores — shows pending state)')

  console.log('')
  console.log('✅ Demo event seeded successfully.')
  console.log(`   Public share URL: /share/${DEMO_EVENT_CODE}`)
  console.log('   Public API URL:   /api/public/' + DEMO_EVENT_CODE)
  console.log('')
  console.log('   The event has:')
  console.log('     • 12 players (Alice, Bruno, Camila, … Mateo)')
  console.log('     • 3 rounds of pairings (Round Robin, 3 tables of 4)')
  console.log('     • Rounds 1 & 2: fully scored + LOCKED')
  console.log('     • Round 3: paired but unscored (pending state)')
  console.log('     • Status: ACTIVE, currentRound: 3')
  console.log('     • Description + schedule for the share page')
}

main()
  .catch((err) => {
    // Prisma wraps connection errors in PrismaClientKnownRequestError with
    // code: 'ECONNREFUSED' or similar in err.meta. Walk the cause chain.
    const rootCause = (err?.cause ?? err)
    const msg = String(err?.message ?? '') + ' ' + String(rootCause?.message ?? '') + ' ' + String(err?.code ?? '') + ' ' + JSON.stringify(err?.meta ?? {})
    if (
      msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('Tenant or user not found') ||
      msg.includes('connection') ||
      msg.includes('connect ETIMEDOUT')
    ) {
      console.error('❌ Could not connect to the database.')
      console.error('')
      console.error('   The .env DATABASE_URL is either not a PostgreSQL URL (e.g., a local')
      console.error('   SQLite file) or the database is not reachable from this machine.')
      console.error('')
      console.error('   For LOCAL DEV with a real Postgres:')
      console.error('     1. Start a local Postgres (or use Supabase local).')
      console.error('     2. Set DATABASE_URL="postgresql://..." in .env.')
      console.error('     3. Run: bun scripts/seed-demo-event.mjs')
      console.error('')
      console.error('   For PRODUCTION (Supabase):')
      console.error('     DATABASE_URL="postgresql://user:pass@host:5432/db" bun scripts/seed-demo-event.mjs')
      console.error('')
      console.error('   Original error code:', err?.code ?? rootCause?.code ?? '(none)')
    } else {
      console.error('❌ Seed failed:', msg.slice(0, 500))
    }
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
