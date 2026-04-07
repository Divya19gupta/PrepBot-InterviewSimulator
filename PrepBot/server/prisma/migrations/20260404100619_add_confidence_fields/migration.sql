-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "editedTranscript" TEXT,
ADD COLUMN     "lowConfidenceWords" JSONB;
