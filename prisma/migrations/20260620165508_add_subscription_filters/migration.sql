-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "language" "Language",
ADD COLUMN     "locationType" "LocationType",
ADD COLUMN     "maxPrice" DECIMAL(10,2),
ADD COLUMN     "priceType" "PriceType";
