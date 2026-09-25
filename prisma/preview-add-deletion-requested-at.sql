-- TableTop Prime — add deletionRequestedAt to User
--
-- This migration adds the `deletionRequestedAt` column to the User table,
-- enabling GDPR deletion requests. Existing rows get NULL (no deletion requested).
--
-- Run with: npm run db:migrate -- --name add_user_deletion_field
-- Apply to prod: DATABASE_URL=<prod> npm run db:migrate:deploy

ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
