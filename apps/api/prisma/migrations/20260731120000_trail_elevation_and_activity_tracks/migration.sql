-- Trail elevation profiles + activity tracks (TRAIL_ELEVATION.md +
-- ACTIVITY_TRACKS.md, Milestone 2 Phase 16). Built together since they
-- share a parser module and the sample-sidecar pattern.

-- ============================================================
-- TrailSource + Trail.source (TRAIL_ELEVATION.md)
-- ============================================================

CREATE TYPE "TrailSource" AS ENUM ('DRAWN', 'GPX_IMPORT', 'RECORDED_ACTIVITY');

ALTER TABLE "trails" ADD COLUMN "source" "TrailSource" NOT NULL DEFAULT 'DRAWN';

-- ============================================================
-- TrailElevationProfile - sidecar table, no geometry column, so no GiST
-- index needed here (unlike every other table this migration touches).
-- ============================================================

CREATE TABLE "trail_elevation_profiles" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "samples" JSONB NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "ascentMeters" INTEGER NOT NULL,
    "descentMeters" INTEGER NOT NULL,
    "minElevationMeters" INTEGER NOT NULL,
    "maxElevationMeters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trail_elevation_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trail_elevation_profiles_trailId_key" ON "trail_elevation_profiles"("trailId");

ALTER TABLE "trail_elevation_profiles" ADD CONSTRAINT "trail_elevation_profiles_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- ActivityTrack (ACTIVITY_TRACKS.md)
-- ============================================================

CREATE TYPE "ActivityTrackVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "ActivityTrackSource" AS ENUM ('RECORDED', 'IMPORTED');

CREATE TABLE "activity_tracks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adventurePageId" TEXT,
    "tripReportId" TEXT,
    "activityTypeId" TEXT NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "geometry" geometry(LineString, 4326) NOT NULL,
    "samples" JSONB NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "movingSeconds" INTEGER,
    "distanceMeters" INTEGER NOT NULL,
    "ascentMeters" INTEGER,
    "descentMeters" INTEGER,
    "minElevationMeters" INTEGER,
    "maxElevationMeters" INTEGER,
    "source" "ActivityTrackSource" NOT NULL,
    "visibility" "ActivityTrackVisibility" NOT NULL DEFAULT 'PRIVATE',
    "privacyTrimMeters" INTEGER,
    "clientUuid" TEXT,
    "originalFileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activity_tracks_userId_clientUuid_key" ON "activity_tracks"("userId", "clientUuid");
CREATE INDEX "activity_tracks_userId_startedAt_idx" ON "activity_tracks"("userId", "startedAt");

-- hand-added: GiST spatial index, Prisma can't express Unsupported geometry
CREATE INDEX IF NOT EXISTS "activity_tracks_geometry_idx" ON "activity_tracks" USING GIST ("geometry");

ALTER TABLE "activity_tracks" ADD CONSTRAINT "activity_tracks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_tracks" ADD CONSTRAINT "activity_tracks_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_tracks" ADD CONSTRAINT "activity_tracks_tripReportId_fkey" FOREIGN KEY ("tripReportId") REFERENCES "trip_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_tracks" ADD CONSTRAINT "activity_tracks_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- This migration adds new tables/columns only and touches no other
-- trail/spot DDL - audit note per the known spurious-DROP-INDEX gotcha
-- (20260729063554_add_trip_groups / 20260729064500_restore_geodata_indexes):
-- the pre-existing trails_geometry_idx, spots_geometry_idx,
-- trail_revisions_geometry_idx, spot_revisions_geometry_idx are untouched.
-- ============================================================
