/*
  Warnings:

  - You are about to drop the column `confidenceUsed` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `fairnessChoice` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `relianceChoice` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `understanding` on the `Answer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "confidenceUsed",
DROP COLUMN "fairnessChoice",
DROP COLUMN "relianceChoice",
DROP COLUMN "understanding",
ADD COLUMN     "reengageIntent" TEXT,
ADD COLUMN     "selfCompetence" TEXT,
ADD COLUMN     "uncertaintyBuffer" TEXT;
