-- Geodata changeset history (GEODATA_HISTORY.md, Milestone 2 Phase 15).
-- Four ordered steps, all raw SQL - geometry columns can't round-trip
-- through Prisma's normal migration diffing. See the doc's "Migration
-- notes" section for why each step is ordered the way it is.

-- ============================================================
-- Step 1: create trail_revisions / spot_revisions, hand-add GiST indexes.
-- ============================================================

CREATE TABLE "trail_revisions" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "geometry" geometry(LineString, 4326) NOT NULL,
    "name" TEXT,
    "distanceMeters" INTEGER,
    "editSummary" TEXT,
    "isSafetyCriticalEdit" BOOLEAN NOT NULL DEFAULT false,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "spot_revisions" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "geometry" geometry(Point, 4326) NOT NULL,
    "spotTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "elevationMeters" INTEGER,
    "editSummary" TEXT,
    "isSafetyCriticalEdit" BOOLEAN NOT NULL DEFAULT false,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spot_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trail_revisions_trailId_version_key" ON "trail_revisions"("trailId", "version");
CREATE UNIQUE INDEX "spot_revisions_spotId_version_key" ON "spot_revisions"("spotId", "version");

-- hand-added: GiST spatial indexes, Prisma can't express these
CREATE INDEX IF NOT EXISTS "trail_revisions_geometry_idx" ON "trail_revisions" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "spot_revisions_geometry_idx" ON "spot_revisions" USING GIST ("geometry");

ALTER TABLE "trail_revisions" ADD CONSTRAINT "trail_revisions_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trail_revisions" ADD CONSTRAINT "trail_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "spot_revisions" ADD CONSTRAINT "spot_revisions_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "spot_revisions" ADD CONSTRAINT "spot_revisions_spotTypeId_fkey" FOREIGN KEY ("spotTypeId") REFERENCES "spot_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spot_revisions" ADD CONSTRAINT "spot_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Step 2: backfill a synthetic version-1 revision per existing active row.
-- Geometry copied from the live row, editorId = createdById, createdAt =
-- the live row's createdAt, editSummary flags it as a backfill.
-- ============================================================

INSERT INTO "trail_revisions" ("id", "trailId", "version", "geometry", "name", "distanceMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt")
SELECT gen_random_uuid(), "id", 1, "geometry", "name", "distanceMeters", 'Imported from pre-history row', false, "createdById", "createdAt"
FROM "trails"
WHERE "isActive" = true;

INSERT INTO "spot_revisions" ("id", "spotId", "version", "geometry", "spotTypeId", "name", "description", "elevationMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt")
SELECT gen_random_uuid(), "id", 1, "geometry", "spotTypeId", "name", "description", "elevationMeters", 'Imported from pre-history row', false, "createdById", "createdAt"
FROM "spots"
WHERE "isActive" = true;

-- ============================================================
-- Step 3: retarget trail_confirmations / spot_confirmations from
-- trailId/spotId to revisionId. Nullable -> backfill -> constrain is
-- mandatory: existing confirmation rows have no revision to point at
-- until step 2 has run.
-- ============================================================

ALTER TABLE "trail_confirmations" ADD COLUMN "revisionId" TEXT;

UPDATE "trail_confirmations" tc
SET "revisionId" = tr."id"
FROM "trail_revisions" tr
WHERE tr."trailId" = tc."trailId" AND tr."version" = 1;

-- A confirmation whose trail has since been soft-deleted (no active row,
-- so no backfilled revision) has nothing to point at - drop it rather than
-- leave an orphan; the trail it vouched for is gone from every live view anyway.
DELETE FROM "trail_confirmations" WHERE "revisionId" IS NULL;

ALTER TABLE "trail_confirmations" ALTER COLUMN "revisionId" SET NOT NULL;
ALTER TABLE "trail_confirmations" DROP CONSTRAINT "trail_confirmations_trailId_fkey";
DROP INDEX "trail_confirmations_trailId_userId_key";
ALTER TABLE "trail_confirmations" DROP COLUMN "trailId";
ALTER TABLE "trail_confirmations" ADD CONSTRAINT "trail_confirmations_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "trail_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "trail_confirmations_revisionId_userId_key" ON "trail_confirmations"("revisionId", "userId");

ALTER TABLE "spot_confirmations" ADD COLUMN "revisionId" TEXT;

UPDATE "spot_confirmations" sc
SET "revisionId" = sr."id"
FROM "spot_revisions" sr
WHERE sr."spotId" = sc."spotId" AND sr."version" = 1;

DELETE FROM "spot_confirmations" WHERE "revisionId" IS NULL;

ALTER TABLE "spot_confirmations" ALTER COLUMN "revisionId" SET NOT NULL;
ALTER TABLE "spot_confirmations" DROP CONSTRAINT "spot_confirmations_spotId_fkey";
DROP INDEX "spot_confirmations_spotId_userId_key";
ALTER TABLE "spot_confirmations" DROP COLUMN "spotId";
ALTER TABLE "spot_confirmations" ADD CONSTRAINT "spot_confirmations_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "spot_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "spot_confirmations_revisionId_userId_key" ON "spot_confirmations"("revisionId", "userId");

-- ============================================================
-- Step 4: this migration creates new tables and touches no other trail/spot
-- DDL, so it does not risk the spurious DROP INDEX-on-unrelated-migration
-- gotcha the doc warns about (see 20260729063554_add_trip_groups /
-- 20260729064500_restore_geodata_indexes). Confirmed by inspection, not by
-- re-running that gotcha here. The pre-existing trails_geometry_idx /
-- spots_geometry_idx are untouched by this file.
-- ============================================================
