-- AlterTable
ALTER TABLE "media" ADD COLUMN     "largeUrl" TEXT,
ADD COLUMN     "mediumUrl" TEXT,
ADD COLUMN     "smallUrl" TEXT;

-- AlterTable
ALTER TABLE "trip_report_media" ADD COLUMN     "largeUrl" TEXT,
ADD COLUMN     "mediumUrl" TEXT,
ADD COLUMN     "smallUrl" TEXT;
