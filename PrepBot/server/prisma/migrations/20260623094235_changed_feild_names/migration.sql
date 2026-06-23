/*
  Warnings:

  - You are about to drop the column `bias` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `clarity` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `trustReason` on the `Answer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "bias",
DROP COLUMN "clarity",
DROP COLUMN "trustReason",
ADD COLUMN     "feedbackAUsefulness" TEXT,
ADD COLUMN     "feedbackBUsefulness" TEXT,
ADD COLUMN     "perceivedAccuracy" TEXT;
