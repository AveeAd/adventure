-- A trip group's description used to be optional plain text; it's now a
-- required Markdown body (rendered like TripReport.content). Backfill any
-- existing NULL before the NOT NULL constraint, same belt-and-suspenders
-- style as the trail/spot confirmation backfills in
-- 20260731000000_geodata_changeset_history.
UPDATE "trip_groups" SET "description" = '' WHERE "description" IS NULL;

-- AlterTable
ALTER TABLE "trip_groups" ALTER COLUMN "description" SET NOT NULL;
