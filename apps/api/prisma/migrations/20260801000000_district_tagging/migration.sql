-- Spatially-derived district tagging (FEATURE.md §4, Milestone 2 Phase 17).

-- ============================================================
-- District.boundary - nullable, backfilled by the one-off import script
-- (import-district-boundaries.ts), not by this migration.
-- ============================================================

ALTER TABLE "districts" ADD COLUMN "boundary" geometry(MultiPolygon, 4326);

-- hand-added: GiST spatial index, Prisma can't express Unsupported geometry
CREATE INDEX IF NOT EXISTS "districts_boundary_idx" ON "districts" USING GIST ("boundary");

-- ============================================================
-- AdventurePageDistrict gains source + timestamps - it previously had
-- neither, a standing violation of §2's "createdAt/updatedAt on every
-- table" convention, fixed here alongside the tagging feature that needed
-- `source` anyway.
-- ============================================================

CREATE TYPE "DistrictTagSource" AS ENUM ('MANUAL', 'DERIVED');

ALTER TABLE "adventure_page_districts" ADD COLUMN "source" "DistrictTagSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "adventure_page_districts" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "adventure_page_districts" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- This migration only adds new columns/an index on districts and
-- adventure_page_districts - it does not touch trails/spots DDL, so it
-- carries no risk of the spurious DROP INDEX gotcha those tables have been
-- bitten by twice. The districts_boundary_idx above is the third
-- hand-added GiST index in the schema (after trails/spots' geometry
-- indexes), all three untouched by this file.
-- ============================================================
