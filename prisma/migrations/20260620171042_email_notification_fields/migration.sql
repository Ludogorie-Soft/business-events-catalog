-- CreateEnum
CREATE TYPE "EmailNotificationStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "EmailNotification" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" "EmailNotificationStatus" NOT NULL DEFAULT 'SENT',
ADD COLUMN     "subscriptionId" TEXT;

-- AddForeignKey
ALTER TABLE "EmailNotification" ADD CONSTRAINT "EmailNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
