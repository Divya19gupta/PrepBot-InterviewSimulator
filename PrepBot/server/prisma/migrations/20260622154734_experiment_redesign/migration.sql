/*
  Warnings:

  - You are about to drop the column `wrongErrorType` on the `Answer` table. All the data in the column will be lost.
  - Added the required column `experimentVersion` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wrongnessImplementation` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "wrongErrorType";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "experimentVersion" TEXT NOT NULL,
ADD COLUMN     "wrongnessImplementation" TEXT NOT NULL;
