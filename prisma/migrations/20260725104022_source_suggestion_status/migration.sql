/*
  Warnings:

  - You are about to drop the column `reviewed` on the `SourceSuggestion` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `SourceSuggestion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SourceSuggestionStatus" AS ENUM ('PENDING', 'REJECTED', 'IMPLEMENTED');

-- AlterTable
ALTER TABLE "SourceSuggestion" DROP COLUMN "reviewed",
ADD COLUMN     "status" "SourceSuggestionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
