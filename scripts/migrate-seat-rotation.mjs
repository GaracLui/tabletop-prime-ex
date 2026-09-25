#!/usr/bin/env node
/**
 * migrate-seat-rotation.mjs — adds the `seatRotation` column to the
 * RoundConfig table. Needed for the seat rotation UI feature (CLOCKWISE /
 * BALANCED seat assignment for games with first-player advantage).
 *
 * Idempotent: uses `ADD COLUMN IF NOT EXISTS`, so re-running is safe.
 *
 * USAGE:
 *   bun scripts/migrate-seat-rotation.mjs
 *   (or: npx tsx scripts/migrate-seat-rotation.mjs)
 *
 * For production: set DATABASE_URL first, then run the same command.
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
  // .env missing — DATABASE_URL must already be in the env.
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.')
  console.error('   Set it in .env or prefix the command:')
  console.error('       DATABASE_URL="postgresql://..." bun scripts/migrate-seat-rotation.mjs')
  process.exit(1)
}

// Prisma v7 requires a driver adapter.
const { PrismaClient } = await import('../src/generated/prisma/client')
const { PrismaPg } = await import('@prisma/adapter-pg')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter, log: ['error', 'warn'] })

async function main() {
  console.log('🌱 Adding seatRotation column to RoundConfig...')

  // Check if the column already exists (idempotency check for a clearer message).
  const existing = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'RoundConfig' AND column_name = 'seatRotation'
  `
  if (existing.length > 0) {
    console.log('✅ seatRotation column already exists — nothing to do.')
    return
  }

  // Add the column. Using IF NOT EXISTS for extra safety.
  await db.$executeRawUnsafe(
    `ALTER TABLE "RoundConfig" ADD COLUMN IF NOT EXISTS "seatRotation" TEXT`
  )

  console.log('✅ seatRotation column added successfully.')
  console.log('   Organizers can now set seat rotation (NONE / CLOCKWISE / BALANCED)')
  console.log('   per round in the Round Config tab.')
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
