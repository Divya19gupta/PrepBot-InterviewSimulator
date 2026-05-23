-- Add participantId with a temporary default to handle existing rows
ALTER TABLE "Session" ADD COLUMN "participantId" TEXT NOT NULL DEFAULT 'LEGACY-0000';

-- Update existing rows to have unique IDs
UPDATE "Session" SET "participantId" = 'LEGACY-' || id WHERE "participantId" = 'LEGACY-0000';

-- Add unique constraint
ALTER TABLE "Session" ADD CONSTRAINT "Session_participantId_key" UNIQUE ("participantId");

-- Drop name and email
ALTER TABLE "Session" DROP COLUMN "name";
ALTER TABLE "Session" DROP COLUMN "email";