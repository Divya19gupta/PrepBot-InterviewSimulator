/*
  Warnings:

  - You are about to drop the column `editedTranscript` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `prototype` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `currentPrototype` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `phaseCompleted` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `PhaseFeedback` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sessionId,questionIndex]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `questionIndex` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Answer_sessionId_question_prototype_key";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "editedTranscript",
DROP COLUMN "feedback",
DROP COLUMN "prototype",
ADD COLUMN     "bias" TEXT,
ADD COLUMN     "blameTarget" TEXT,
ADD COLUMN     "clarity" TEXT,
ADD COLUMN     "confidenceUsed" BOOLEAN,
ADD COLUMN     "fairnessChoice" TEXT,
ADD COLUMN     "feedbackA" TEXT,
ADD COLUMN     "feedbackB" TEXT,
ADD COLUMN     "questionIndex" INTEGER NOT NULL,
ADD COLUMN     "relianceChoice" TEXT,
ADD COLUMN     "trustChoice" TEXT,
ADD COLUMN     "trustReason" TEXT,
ADD COLUMN     "understanding" TEXT,
ADD COLUMN     "viewedFeedbackA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewedFeedbackB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wrongErrorType" TEXT,
ADD COLUMN     "wrongExplanation" TEXT,
ADD COLUMN     "wrongFeedbackType" TEXT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "currentPrototype",
DROP COLUMN "phaseCompleted";

-- DropTable
DROP TABLE "PhaseFeedback";

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_questionIndex_key" ON "Answer"("sessionId", "questionIndex");
