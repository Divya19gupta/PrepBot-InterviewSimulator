/*
  Warnings:

  - Added the required column `currentPrototype` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "currentPrototype" TEXT NOT NULL,
ADD COLUMN     "phaseCompleted" INTEGER NOT NULL DEFAULT 0;
