-- TableTop Prime — add seatRotation column to RoundConfig
--
-- Enables per-round seat rotation (NONE / CLOCKWISE / BALANCED) for games
-- with first-player advantage (Catan, Carcassonne, etc.).
--
-- The column is nullable: null = no rotation (backward compat with existing
-- rows that don't have a seat rotation configured).
--
-- Run with:  bun scripts/migrate-seat-rotation.mjs
--    (or:  psql "postgresql://..." -f prisma/add-seat-rotation-column.sql)
--
-- Idempotent: if the column already exists, the script exits 0.

ALTER TABLE "RoundConfig" ADD COLUMN IF NOT EXISTS "seatRotation" TEXT;
