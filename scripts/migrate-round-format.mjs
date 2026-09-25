#!/usr/bin/env node
/**
 * migrate-round-format.mjs — one-off DB migration for the v6 RoundFormat enum.
 *
 * Replaces the legacy 'CUSTOM' value with 'ADJACENT_SWISS' in the Postgres
 * RoundFormat enum. Legacy 'CUSTOM' rows in RoundPairing.format and
 * RoundConfig.format are remapped to 'ROUND_ROBIN' (CustomStrategy was
 * behaviorally identical to SocialGolferStrategy / ROUND_ROBIN).
 *
 * WHY A SCRIPT INSTEAD OF `psql -f`:
 *   - It reads DATABASE_URL from .env / process.env automatically — no need
 *     to copy the connection string around or worry about shell escaping.
 *   - It prints which step it's on so you can see progress.
 *   - It's idempotent: if the enum already has ADJACENT_SWISS (e.g., fresh DB
 *     created via `db:push` after the schema change), the script exits 0
 *     without doing anything.
 *
 * USAGE:
 *   node scripts/migrate-round-format.mjs
 *
 * For production: set DATABASE_URL first, then run:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-round-format.mjs
 *
 * Or copy .env.production to .env temporarily, run the script, then delete .env.
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
  console.error('       DATABASE_URL="postgresql://..." node scripts/migrate-round-format.mjs')
  process.exit(1)
}

// We use `pg` directly (already a transitive dep via @prisma/adapter-pg).
// Avoids instantiating PrismaClient here — keeps the migration independent
// of generated code.
const { Client } = await import('pg')

const SQL_FILE = join(__dirname, '..', 'prisma', 'replace-custom-format-with-adjacent-swiss.sql')
const sql = readFileSync(SQL_FILE, 'utf8')

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

console.log('🔍 Pre-check: current RoundFormat enum values...')
const { rows: enumValues } = await client.query(`
  SELECT e.enumlabel
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname = 'RoundFormat'
  ORDER BY e.enumsortorder
`)
console.log('   Current values:', enumValues.map((r) => r.enumlabel).join(', '))

// Also check if a leftover "RoundFormat_old" exists (partial migration left over).
const { rows: leftoverTypes } = await client.query(`
  SELECT typname FROM pg_type WHERE typname = 'RoundFormat_old'
`)
if (leftoverTypes.length > 0) {
  console.error('❌ Found leftover "RoundFormat_old" type from a previous partial migration.')
  console.error('   This means a previous migration failed mid-way after renaming the enum.')
  console.error('   Inspect with: SELECT typname FROM pg_type WHERE typname LIKE \'RoundFormat%\';')
  console.error('   You may need to inspect both types and manually fix the orphaned one before retrying.')
  await client.end()
  process.exit(1)
}

if (enumValues.some((r) => r.enumlabel === 'ADJACENT_SWISS')) {
  console.log('✅ ADJACENT_SWISS already present — nothing to migrate.')
  await client.end()
  process.exit(0)
}

if (!enumValues.some((r) => r.enumlabel === 'CUSTOM')) {
  // Unexpected: no CUSTOM and no ADJACENT_SWISS. Probably a fresh DB at v6+ schema.
  console.log('⚠️  Neither CUSTOM nor ADJACENT_SWISS found in the enum.')
  console.log('   Running the migration anyway to add ADJACENT_SWISS...')
}

console.log('📝 Running migration SQL (atomic, in a transaction)...')
try {
  await client.query(sql)
  console.log('✅ Migration complete.')
} catch (err) {
  console.error('❌ Migration failed:', err.message)
  console.error('   The transaction was rolled back — your DB is unchanged.')
  await client.end()
  process.exit(1)
}

console.log('🔍 Post-check: RoundFormat enum values now...')
const { rows: enumValuesAfter } = await client.query(`
  SELECT e.enumlabel
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname = 'RoundFormat'
  ORDER BY e.enumsortorder
`)
console.log('   Current values:', enumValuesAfter.map((r) => r.enumlabel).join(', '))

// Confirm legacy CUSTOM rows are gone
const { rows: legacyRows } = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM "RoundPairing" WHERE format::text = 'CUSTOM') AS pairings,
    (SELECT COUNT(*) FROM "RoundConfig" WHERE format::text = 'CUSTOM') AS configs
`)
const total = Number(legacyRows[0].pairings) + Number(legacyRows[0].configs)
if (total > 0) {
  console.warn(`⚠️  ${total} legacy 'CUSTOM' row(s) still present — they could not be migrated automatically.`)
  console.warn('   Inspect them with: SELECT id, format FROM "RoundConfig" WHERE format::text = \'CUSTOM\';')
} else {
  console.log('✅ No legacy CUSTOM rows remain — all remapped to ROUND_ROBIN.')
}

await client.end()
