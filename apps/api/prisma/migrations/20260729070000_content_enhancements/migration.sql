-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('PER_DAY', 'PER_TRIP', 'PER_HOUR');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN "parentCommentId" TEXT;

-- AlterTable: convert guide_profiles.rateUnit from free text to RateUnit,
-- mapping existing values instead of the naive drop+recreate Prisma would
-- generate (which would silently lose data) - same care as the trip_groups
-- migration's GiST-index restoration.
ALTER TABLE "guide_profiles" ADD COLUMN "rateUnit_new" "RateUnit";
UPDATE "guide_profiles" SET "rateUnit_new" = CASE
  WHEN lower("rateUnit") LIKE '%day%' THEN 'PER_DAY'::"RateUnit"
  WHEN lower("rateUnit") LIKE '%trip%' THEN 'PER_TRIP'::"RateUnit"
  WHEN lower("rateUnit") LIKE '%hour%' THEN 'PER_HOUR'::"RateUnit"
  ELSE NULL
END;
ALTER TABLE "guide_profiles" DROP COLUMN "rateUnit";
ALTER TABLE "guide_profiles" RENAME COLUMN "rateUnit_new" TO "rateUnit";

-- AlterTable
ALTER TABLE "trip_reports" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NPR';

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adventure_page_tags" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "adventure_page_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "related_adventure_pages" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "relatedPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_adventure_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "adventure_page_tags_adventurePageId_tagId_key" ON "adventure_page_tags"("adventurePageId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "related_adventure_pages_pageId_relatedPageId_key" ON "related_adventure_pages"("pageId", "relatedPageId");

-- AddForeignKey
ALTER TABLE "adventure_page_tags" ADD CONSTRAINT "adventure_page_tags_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_tags" ADD CONSTRAINT "adventure_page_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_adventure_pages" ADD CONSTRAINT "related_adventure_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_adventure_pages" ADD CONSTRAINT "related_adventure_pages_relatedPageId_fkey" FOREIGN KEY ("relatedPageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
