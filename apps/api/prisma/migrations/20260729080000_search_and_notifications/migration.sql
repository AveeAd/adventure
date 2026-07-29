-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMMENT', 'REPLY', 'KUDOS', 'PAGE_VERIFIED', 'TRAIL_VERIFIED', 'SPOT_VERIFIED', 'GUIDE_VERIFIED');

-- AlterTable
ALTER TABLE "adventure_pages" ADD COLUMN "searchVector" tsvector;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Full-text search: searchVector is trigger-maintained (title + summary +
-- latest revision content), not written to by Prisma/application code.
-- One shared function recomputes it; two triggers call it - one on
-- adventure_pages (title/summary edits), one on page_revisions (new content).
CREATE OR REPLACE FUNCTION refresh_adventure_page_search_vector(p_id TEXT) RETURNS void AS $$
BEGIN
  UPDATE adventure_pages ap
  SET "searchVector" = to_tsvector('english',
    coalesce(ap.title, '') || ' ' || coalesce(ap.summary, '') || ' ' || coalesce((
      SELECT pr.content FROM page_revisions pr
      WHERE pr."adventurePageId" = ap.id
      ORDER BY pr.version DESC
      LIMIT 1
    ), '')
  )
  WHERE ap.id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_adventure_pages_search_vector() RETURNS trigger AS $$
BEGIN
  PERFORM refresh_adventure_page_search_vector(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adventure_pages_search_vector_trigger
AFTER INSERT OR UPDATE OF title, summary ON adventure_pages
FOR EACH ROW EXECUTE FUNCTION trg_adventure_pages_search_vector();

CREATE OR REPLACE FUNCTION trg_page_revisions_search_vector() RETURNS trigger AS $$
BEGIN
  PERFORM refresh_adventure_page_search_vector(NEW."adventurePageId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_revisions_search_vector_trigger
AFTER INSERT ON page_revisions
FOR EACH ROW EXECUTE FUNCTION trg_page_revisions_search_vector();

-- backfill existing rows
UPDATE adventure_pages ap
SET "searchVector" = to_tsvector('english',
  coalesce(ap.title, '') || ' ' || coalesce(ap.summary, '') || ' ' || coalesce((
    SELECT pr.content FROM page_revisions pr
    WHERE pr."adventurePageId" = ap.id
    ORDER BY pr.version DESC
    LIMIT 1
  ), '')
);

CREATE INDEX adventure_pages_search_idx ON adventure_pages USING GIN ("searchVector");
