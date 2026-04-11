-- CreateTable
CREATE TABLE "PhaseFeedback" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prototype" TEXT NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "fairness" INTEGER NOT NULL,
    "understanding" INTEGER NOT NULL,
    "blame" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseFeedback_pkey" PRIMARY KEY ("id")
);
