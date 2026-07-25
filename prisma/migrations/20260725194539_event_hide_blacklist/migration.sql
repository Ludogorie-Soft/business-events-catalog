-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventStatus" ADD VALUE 'HIDDEN';
ALTER TYPE "EventStatus" ADD VALUE 'BLACKLISTED';

-- CreateTable
CREATE TABLE "EventTitleBlacklist" (
    "id" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "EventTitleBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTitleBlacklist_normalizedTitle_key" ON "EventTitleBlacklist"("normalizedTitle");

-- AddForeignKey
ALTER TABLE "EventTitleBlacklist" ADD CONSTRAINT "EventTitleBlacklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
