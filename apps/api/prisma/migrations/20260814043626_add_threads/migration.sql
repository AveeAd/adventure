-- CreateEnum
CREATE TYPE "ThreadTag" AS ENUM ('DISCUSSION', 'TRIP_SHARE', 'QUESTION', 'ANNOUNCEMENT', 'RANDOM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'THREAD_REPLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportTargetType" ADD VALUE 'THREAD';
ALTER TYPE "ReportTargetType" ADD VALUE 'THREAD_REPLY';

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tag" "ThreadTag" NOT NULL DEFAULT 'DISCUSSION',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tripReportId" TEXT,
    "trailId" TEXT,
    "spotId" TEXT,
    "adventurePageId" TEXT,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_replies" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentReplyId" TEXT,

    CONSTRAINT "thread_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threads_clubId_isActive_createdAt_idx" ON "threads"("clubId", "isActive", "createdAt");

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_tripReportId_fkey" FOREIGN KEY ("tripReportId") REFERENCES "trip_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "thread_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
