-- CreateTable
CREATE TABLE "adventure_page_visits" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventure_page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adventure_page_visits_adventurePageId_visitedAt_idx" ON "adventure_page_visits"("adventurePageId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "adventure_page_visits_adventurePageId_userId_key" ON "adventure_page_visits"("adventurePageId", "userId");

-- AddForeignKey
ALTER TABLE "adventure_page_visits" ADD CONSTRAINT "adventure_page_visits_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_visits" ADD CONSTRAINT "adventure_page_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
