-- CreateTable
CREATE TABLE "adventure_page_views" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventure_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adventure_page_views_adventurePageId_createdAt_idx" ON "adventure_page_views"("adventurePageId", "createdAt");

-- AddForeignKey
ALTER TABLE "adventure_page_views" ADD CONSTRAINT "adventure_page_views_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
