-- CreateEnum
CREATE TYPE "ModeratorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "adventure_page_districts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- FEATURE.md gotcha: prisma migrate dev spuriously generates DROP INDEX for
-- the Unsupported(...)-typed GiST/GIN indexes (PostGIS geometry, tsvector)
-- any time an unrelated schema change lands in the same pass, because those
-- columns aren't diff-managed. This migration originally dropped all seven;
-- restored here with IF NOT EXISTS rather than splitting into a second
-- fixup migration, since nothing else depends on this one yet.
CREATE INDEX IF NOT EXISTS "trails_geometry_idx" ON "trails" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "spots_geometry_idx" ON "spots" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "trail_revisions_geometry_idx" ON "trail_revisions" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "spot_revisions_geometry_idx" ON "spot_revisions" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "activity_tracks_geometry_idx" ON "activity_tracks" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "districts_boundary_idx" ON "districts" USING GIST ("boundary");
CREATE INDEX IF NOT EXISTS adventure_pages_search_idx ON adventure_pages USING GIN ("searchVector");

-- CreateTable
CREATE TABLE "moderator_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "ModeratorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderator_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderator_applications_status_idx" ON "moderator_applications"("status");

-- AddForeignKey
ALTER TABLE "moderator_applications" ADD CONSTRAINT "moderator_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_applications" ADD CONSTRAINT "moderator_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
