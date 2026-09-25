/**
 * Zod request-body schemas for the API layer (C2).
 *
 * The audit found the API boundary untyped end-to-end: 30 routes hand-roll
 * `typeof` checks with varying rigor, so `minPlayersPerTable: -3` or
 * `totalRounds: -5` used to persist happily. These schemas gate the five
 * riskiest bodies before any DB access:
 *
 *   1. scores POST            (standings integrity — the S3 attack surface)
 *   2. events POST            (event creation)
 *   3. events PATCH           (event mutation — C8.6 min/max ranges)
 *   4. round-configs PUT      (per-round pairing overrides)
 *   5. judge-calls POST       (C8.5 category was an arbitrary string)
 *
 * Design rules:
 *   - Schemas validate SHAPE and RANGES only. Authorization (who may send
 *     what) stays in the route handlers / requireX() helpers — never move
 *     authz decisions here.
 *   - Unknown keys are stripped (zod default) for create/update bodies,
 *     which is what the handlers did implicitly anyway.
 *   - Freeshaped JSON blobs the engine already tolerates (scoringRules,
 *     per-round modifiers) are gated as "array/object of unknowns" instead
 *     of strictly typed, so we don't silently drop fields the UI sends.
 *
 * `parseBody()` returns a discriminated union in the same style as the C4
 * AuthResult helpers, so skipping the failure branch is a type error.
 */
import { z } from 'zod'
import { NextResponse } from 'next/server'

// ──────────────────────────────────────────────────────────────────────
// Shared atoms
// ──────────────────────────────────────────────────────────────────────

/** Table numbers are 1-indexed; generous ceiling for big events. */
export const tableNumberSchema = z.number().int().min(1).max(10_000)

/**
 * Round numbers: 1..totalRounds normally, but bonus rounds number beyond
 * totalRounds and round 0 can appear in pre-pairing states. The authz
 * logic (pairing existence check) is what actually scopes this — here we
 * only reject structural garbage (floats, negatives, absurd sizes).
 */
export const roundNumberSchema = z.number().int().min(0).max(10_000)

/** 1..50 players per table — covers every real game; blocks -3/9999 junk. */
export const perTableSchema = z.number().int().min(1).max(50)

/** Placement points / modifier values — any finite number (zod rejects NaN/±Infinity). */
const finiteNumber = z.number()

/** Free-form modifier row: gate as object, let the engine tolerate the rest. */
const modifierRow = z.record(z.string(), z.unknown())

// ──────────────────────────────────────────────────────────────────────
// 1. POST /api/events/[eventId]/scores
// ──────────────────────────────────────────────────────────────────────

const placementInput = z.object({
  playerId: z.string().min(1).max(128),
  placement: z.number().int().min(1).max(1000),
  gamePoints: finiteNumber,
})

/**
 * The companion confirms with `placements: []` (it only flips the state —
 * no placement data is written), so placements are REQUIRED for
 * submit/update but OPTIONAL (possibly empty) for confirm.
 */
export const scorePostSchema = z
  .object({
    tableNumber: tableNumberSchema,
    round: roundNumberSchema,
    note: z.string().max(2000).optional(),
    action: z.enum(['submit', 'confirm', 'update']).optional(),
    placements: z.array(placementInput).max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action !== 'confirm') {
      const list = val.placements
      if (!list || list.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['placements'],
          message: 'placements (at least one) are required for submit/update',
        })
      }
    }
  })

// ──────────────────────────────────────────────────────────────────────
// 2. POST /api/events
// ──────────────────────────────────────────────────────────────────────

const scheduleEntry = z.object({
  start: z.string().min(1),
  end: z.string().optional(),
})

export const eventCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  gameName: z.string().trim().max(200).optional(),
  gameBggId: z.string().trim().max(20).optional(),
  gameMaxPlayers: z.number().int().min(1).max(1000).nullable().optional(),
  minPlayersPerTable: perTableSchema.optional(),
  maxPlayersPerTable: perTableSchema.optional(),
  /** Matches the PATCH whitelist (1-100). */
  totalRounds: z.number().int().min(1).max(100).optional(),
  primeTier: z.enum(['FREE', 'TIER_1', 'TIER_2', 'TIER_3']).optional(),
  templateId: z.string().min(1).max(128).optional(),
  description: z.string().max(2000).nullable().optional(),
  /** normalizeSchedule() does the per-entry sanitation; this gates the envelope. */
  schedule: z.array(scheduleEntry).max(400).nullable().optional(),
})

// ──────────────────────────────────────────────────────────────────────
// 3. PATCH /api/events/[eventId]
// ──────────────────────────────────────────────────────────────────────

export const eventPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  gameName: z.string().trim().max(200).optional(),
  status: z.enum(['DRAFT', 'CHECK_IN', 'ACTIVE', 'FINISHED']).optional(),
  currentRound: z.number().int().min(0).max(100).optional(),
  totalRounds: z.number().int().min(1).max(100).optional(),
  /** C8.6: previously passed through unvalidated — negative values persisted. */
  minPlayersPerTable: perTableSchema.optional(),
  maxPlayersPerTable: perTableSchema.optional(),
  description: z.string().max(2000).nullable().optional(),
  schedule: z.array(scheduleEntry).max(400).nullable().optional(),
  /** 'reroll' increments the offset server-side; else an explicit non-negative int. */
  bannerSeedOffset: z
    .union([z.literal('reroll'), z.number().int().min(0).max(1e6)])
    .optional(),
  /**
   * Gated but NOT strictly typed: the handler scrubs NaN placement points /
   * modifier values (documented defense-in-depth) and re-stringifies the
   * whole object. A strict object schema here would STRIP unknown fields
   * (tiebreakers, tieScoreMode) and silently corrupt stored rules.
   */
  scoringRules: z.record(z.string(), z.unknown()).optional(),
})

// ──────────────────────────────────────────────────────────────────────
// 4. PUT /api/events/[eventId]/round-configs
// ──────────────────────────────────────────────────────────────────────

export const roundConfigPutSchema = z.object({
  round: z.number().int().min(1).max(1000),
  /** Previously `format || 'ROUND_ROBIN'` — arbitrary strings persisted. */
  format: z.enum(['ROUND_ROBIN', 'SWISS', 'SINGLE_ELIM', 'ADJACENT_SWISS']).optional(),
  minPerTable: perTableSchema.optional(),
  maxPerTable: perTableSchema.optional(),
  seatRotation: z.enum(['NONE', 'CLOCKWISE', 'BALANCED']).optional(),
  modifiers: z.array(modifierRow).max(100).optional(),
})

// ──────────────────────────────────────────────────────────────────────
// 5. POST /api/events/[eventId]/judge-calls
// ──────────────────────────────────────────────────────────────────────

/** C8.5: category was an arbitrary string; the UI only ever sends these three. */
export const judgeCallPostSchema = z.object({
  tableNumber: tableNumberSchema,
  category: z.enum(['SCORE', 'RULE', 'OTHER']),
  message: z.string().max(1000).optional(),
})

/**
 * PATCH /api/events/[eventId]/judge-calls/[callId]: previously an unknown
 * `action` fell through BOTH branches and returned success:true without
 * touching the row — a silent lie. The schema makes it an honest 400.
 */
export const judgeCallPatchSchema = z.object({
  action: z.enum(['acknowledge', 'resolve']),
})

// ──────────────────────────────────────────────────────────────────────
// parseBody — same discriminated-union style as the C4 authz helpers
// ──────────────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

/**
 * Parse + validate a JSON request body. Invalid JSON → 400 (it used to
 * fall into the handlers' catch-alls as a misleading 500).
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Invalid request body',
          details: result.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      ),
    }
  }

  return { ok: true, data: result.data }
}
