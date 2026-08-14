-- CreateEnum
CREATE TYPE "TripGroupStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "trip_groups" ADD COLUMN     "status" "TripGroupStatus" NOT NULL DEFAULT 'ACTIVE';
