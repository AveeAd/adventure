-- CreateEnum
CREATE TYPE "PageVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "adventure_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "activityTypeId" TEXT NOT NULL,
    "difficultyLevelId" TEXT,
    "durationMinDays" INTEGER,
    "durationMaxDays" INTEGER,
    "maxAltitudeMeters" INTEGER,
    "verificationStatus" "PageVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adventure_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_revisions" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "editSummary" TEXT,
    "isSafetyCriticalEdit" BOOLEAN NOT NULL DEFAULT false,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_confirmations" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adventure_page_districts" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "adventure_page_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adventure_page_seasons" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "adventure_page_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adventure_page_likes" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventure_page_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adventure_pages_slug_key" ON "adventure_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "page_revisions_adventurePageId_version_key" ON "page_revisions"("adventurePageId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "page_confirmations_revisionId_userId_key" ON "page_confirmations"("revisionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "adventure_page_districts_adventurePageId_districtId_key" ON "adventure_page_districts"("adventurePageId", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "adventure_page_seasons_adventurePageId_seasonId_key" ON "adventure_page_seasons"("adventurePageId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "adventure_page_likes_adventurePageId_userId_key" ON "adventure_page_likes"("adventurePageId", "userId");

-- AddForeignKey
ALTER TABLE "adventure_pages" ADD CONSTRAINT "adventure_pages_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_pages" ADD CONSTRAINT "adventure_pages_difficultyLevelId_fkey" FOREIGN KEY ("difficultyLevelId") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_confirmations" ADD CONSTRAINT "page_confirmations_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "page_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_confirmations" ADD CONSTRAINT "page_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_districts" ADD CONSTRAINT "adventure_page_districts_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_districts" ADD CONSTRAINT "adventure_page_districts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_seasons" ADD CONSTRAINT "adventure_page_seasons_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_seasons" ADD CONSTRAINT "adventure_page_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_likes" ADD CONSTRAINT "adventure_page_likes_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adventure_page_likes" ADD CONSTRAINT "adventure_page_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
