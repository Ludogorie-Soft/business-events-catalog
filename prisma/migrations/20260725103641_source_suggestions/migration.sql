-- CreateTable
CREATE TABLE "SourceSuggestion" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SourceSuggestion_pkey" PRIMARY KEY ("id")
);
