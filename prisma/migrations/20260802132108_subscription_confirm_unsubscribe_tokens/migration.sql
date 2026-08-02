-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "unsubscribeToken" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "confirmToken" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "confirmTokenExpiresAt" TIMESTAMP(3);

-- Backfill unique tokens for existing subscriptions
UPDATE "Subscription"
SET "unsubscribeToken" = md5(random()::text || id || clock_timestamp()::text)
WHERE "unsubscribeToken" IS NULL;

-- Make unsubscribeToken required
ALTER TABLE "Subscription" ALTER COLUMN "unsubscribeToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_unsubscribeToken_key" ON "Subscription"("unsubscribeToken");
CREATE UNIQUE INDEX "Subscription_confirmToken_key" ON "Subscription"("confirmToken");
