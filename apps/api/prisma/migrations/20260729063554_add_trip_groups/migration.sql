-- CreateEnum
CREATE TYPE "TripGroupRole" AS ENUM ('ORGANIZER', 'MEMBER');

-- DropIndex
DROP INDEX "spots_geometry_idx";

-- DropIndex
DROP INDEX "trails_geometry_idx";

-- CreateTable
CREATE TABLE "trip_groups" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_group_members" (
    "id" TEXT NOT NULL,
    "tripGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TripGroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_group_members_tripGroupId_userId_key" ON "trip_group_members"("tripGroupId", "userId");

-- AddForeignKey
ALTER TABLE "trip_groups" ADD CONSTRAINT "trip_groups_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_groups" ADD CONSTRAINT "trip_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_group_members" ADD CONSTRAINT "trip_group_members_tripGroupId_fkey" FOREIGN KEY ("tripGroupId") REFERENCES "trip_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_group_members" ADD CONSTRAINT "trip_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
