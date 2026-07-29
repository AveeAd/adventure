-- The Prisma-generated add_trip_groups migration dropped these GiST spatial
-- indexes because they're hand-added (Prisma can't express Unsupported
-- geometry columns' indexes in the schema, per CLAUDE.md's DATABASE.md
-- convention) - restore them here.
CREATE INDEX IF NOT EXISTS "trails_geometry_idx" ON "trails" USING GIST ("geometry");
CREATE INDEX IF NOT EXISTS "spots_geometry_idx" ON "spots" USING GIST ("geometry");
