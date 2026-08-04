-- MILESTONE_3.md Phase 23: reporting & enforcement. Anyone can report
-- content; an upheld report reverts the change (page/trail/spot) or soft-
-- deletes it (media/trip report/comment) and deducts points.

ALTER TABLE "media" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_UPHELD_AGAINST_YOU';

CREATE TYPE "ReportTargetType" AS ENUM (
    'ADVENTURE_PAGE', 'PAGE_REVISION', 'TRAIL', 'TRAIL_REVISION',
    'SPOT', 'SPOT_REVISION', 'MEDIA', 'TRIP_REPORT', 'COMMENT'
);
CREATE TYPE "ReportReason" AS ENUM (
    'FAKE_OR_FALSE', 'INAPPROPRIATE', 'COPYRIGHT', 'DUPLICATE', 'SAFETY_RISK', 'OTHER'
);
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UPHELD', 'REJECTED');

CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_reports_status_createdAt_idx" ON "content_reports"("status", "createdAt");
CREATE INDEX "content_reports_targetType_targetId_idx" ON "content_reports"("targetType", "targetId");

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
