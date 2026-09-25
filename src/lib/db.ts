import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only log queries in development — they're noisy and add ~1ms overhead per
// query in production. Use ['error', 'warn'] in prod to still catch issues.
const logLevels: ('query' | 'info' | 'warn' | 'error')[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn']

// Prisma v7 requires a driver adapter — no more Rust engine binary.
// PrismaPg uses node-pg under the hood for direct TCP connections.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: logLevels,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
