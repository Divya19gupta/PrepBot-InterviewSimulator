/*
  Warnings:

  - The `blameTarget` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `trustChoice` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reengageIntent` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `selfCompetence` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `uncertaintyInfluence` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `feedbackAUsefulness` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `feedbackBUsefulness` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `perceivedAccuracy` column on the `Answer` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "blameTarget",
ADD COLUMN     "blameTarget" INTEGER,
DROP COLUMN "trustChoice",
ADD COLUMN     "trustChoice" INTEGER,
DROP COLUMN "reengageIntent",
ADD COLUMN     "reengageIntent" INTEGER,
DROP COLUMN "selfCompetence",
ADD COLUMN     "selfCompetence" INTEGER,
DROP COLUMN "uncertaintyInfluence",
ADD COLUMN     "uncertaintyInfluence" INTEGER,
DROP COLUMN "feedbackAUsefulness",
ADD COLUMN     "feedbackAUsefulness" INTEGER,
DROP COLUMN "feedbackBUsefulness",
ADD COLUMN     "feedbackBUsefulness" INTEGER,
DROP COLUMN "perceivedAccuracy",
ADD COLUMN     "perceivedAccuracy" INTEGER;
