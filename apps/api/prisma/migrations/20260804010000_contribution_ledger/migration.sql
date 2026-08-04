-- MILESTONE_3.md Phase 20: contribution ledger.

CREATE TYPE "ContributionReason" AS ENUM (
    'PAGE_CREATE',
    'PAGE_UPDATE',
    'GEO_CREATE',
    'GEO_UPDATE',
    'MEDIA_UPLOAD',
    'STORY_CREATE',
    'MEDIA_REPORT_UPHELD',
    'GEO_REPORT_UPHELD',
    'PAGE_REPORT_UPHELD',
    'BACKFILL',
    'ADMIN_ADJUSTMENT'
);

CREATE TYPE "ContributionTargetType" AS ENUM (
    'ADVENTURE_PAGE',
    'PAGE_REVISION',
    'TRAIL',
    'TRAIL_REVISION',
    'SPOT',
    'SPOT_REVISION',
    'MEDIA',
    'TRIP_REPORT'
);

CREATE TABLE "contribution_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "ContributionReason" NOT NULL,
    "points" INTEGER NOT NULL,
    "targetType" "ContributionTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contribution_events_userId_reason_targetId_key" ON "contribution_events"("userId", "reason", "targetId");
CREATE INDEX "contribution_events_userId_createdAt_idx" ON "contribution_events"("userId", "createdAt");

ALTER TABLE "contribution_events" ADD CONSTRAINT "contribution_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
