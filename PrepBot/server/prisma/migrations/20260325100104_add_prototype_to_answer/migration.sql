/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,question,prototype]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `prototype` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Answer_sessionId_question_key";

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "prototype" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_question_prototype_key" ON "Answer"("sessionId", "question", "prototype");
