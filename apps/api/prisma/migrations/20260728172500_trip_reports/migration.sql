-- CreateTable
CREATE TABLE "trip_reports" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "dateCompleted" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER,
    "actualCostAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_report_media" (
    "id" TEXT NOT NULL,
    "tripReportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_report_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_report_kudos" (
    "id" TEXT NOT NULL,
    "tripReportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_report_kudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "tripReportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_report_kudos_tripReportId_userId_key" ON "trip_report_kudos"("tripReportId", "userId");

-- AddForeignKey
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_report_media" ADD CONSTRAINT "trip_report_media_tripReportId_fkey" FOREIGN KEY ("tripReportId") REFERENCES "trip_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_report_kudos" ADD CONSTRAINT "trip_report_kudos_tripReportId_fkey" FOREIGN KEY ("tripReportId") REFERENCES "trip_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_report_kudos" ADD CONSTRAINT "trip_report_kudos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_tripReportId_fkey" FOREIGN KEY ("tripReportId") REFERENCES "trip_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
