-- MILESTONE_3.md Phase 21: approval pipeline. Edits to adventure pages,
-- trails and spots no longer hit the live row directly - they sit as a
-- PENDING revision until enough votes (or one admin/moderator vote) land.

CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT');

-- Revision tables become the pending queue.

ALTER TABLE "page_revisions"
    ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "resolvedAt" TIMESTAMP(3),
    ADD COLUMN "resolvedById" TEXT,
    ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "trail_revisions"
    ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "resolvedAt" TIMESTAMP(3),
    ADD COLUMN "resolvedById" TEXT,
    ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "spot_revisions"
    ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "resolvedAt" TIMESTAMP(3),
    ADD COLUMN "resolvedById" TEXT,
    ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trail_revisions" ADD CONSTRAINT "trail_revisions_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spot_revisions" ADD CONSTRAINT "spot_revisions_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Confirmation tables become vote ballots - APPROVE/REJECT, not a pure count.

ALTER TABLE "page_confirmations" ADD COLUMN "decision" "ApprovalDecision" NOT NULL DEFAULT 'APPROVE';
ALTER TABLE "trail_confirmations" ADD COLUMN "decision" "ApprovalDecision" NOT NULL DEFAULT 'APPROVE';
ALTER TABLE "spot_confirmations" ADD COLUMN "decision" "ApprovalDecision" NOT NULL DEFAULT 'APPROVE';

-- Parent rows: the published version (null until anything is approved) plus
-- a pending-count cache for the "N unapproved changes" badge (Phase 22 UI).

ALTER TABLE "adventure_pages"
    ADD COLUMN "approvedRevisionId" TEXT,
    ADD COLUMN "pendingRevisionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "adventure_pages" ADD CONSTRAINT "adventure_pages_approvedRevisionId_key" UNIQUE ("approvedRevisionId");
ALTER TABLE "adventure_pages" ADD CONSTRAINT "adventure_pages_approvedRevisionId_fkey"
    FOREIGN KEY ("approvedRevisionId") REFERENCES "page_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trails"
    ADD COLUMN "approvedRevisionId" TEXT,
    ADD COLUMN "pendingRevisionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "trails" ADD CONSTRAINT "trails_approvedRevisionId_key" UNIQUE ("approvedRevisionId");
ALTER TABLE "trails" ADD CONSTRAINT "trails_approvedRevisionId_fkey"
    FOREIGN KEY ("approvedRevisionId") REFERENCES "trail_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "spots"
    ADD COLUMN "approvedRevisionId" TEXT,
    ADD COLUMN "pendingRevisionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "spots" ADD CONSTRAINT "spots_approvedRevisionId_key" UNIQUE ("approvedRevisionId");
ALTER TABLE "spots" ADD CONSTRAINT "spots_approvedRevisionId_fkey"
    FOREIGN KEY ("approvedRevisionId") REFERENCES "spot_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration safety (MILESTONE_3.md §5.5): every pre-Phase-21 revision was
-- live-in-its-time under the old optimistic-wiki model, so all of them are
-- backfilled to APPROVED (not just the latest per target) - otherwise older
-- rows would misreport as a still-open pending queue. resolvedById is left
-- NULL: no single real approver exists for this bulk backfill.

UPDATE "page_revisions" SET "approvalStatus" = 'APPROVED', "resolvedAt" = "createdAt";
UPDATE "trail_revisions" SET "approvalStatus" = 'APPROVED', "resolvedAt" = "createdAt";
UPDATE "spot_revisions" SET "approvalStatus" = 'APPROVED', "resolvedAt" = "createdAt";

UPDATE "adventure_pages" ap
    SET "approvedRevisionId" = (
        SELECT pr.id FROM "page_revisions" pr
        WHERE pr."adventurePageId" = ap.id
        ORDER BY pr.version DESC LIMIT 1
    );

UPDATE "trails" t
    SET "approvedRevisionId" = (
        SELECT tr.id FROM "trail_revisions" tr
        WHERE tr."trailId" = t.id
        ORDER BY tr.version DESC LIMIT 1
    );

UPDATE "spots" s
    SET "approvedRevisionId" = (
        SELECT sr.id FROM "spot_revisions" sr
        WHERE sr."spotId" = s.id
        ORDER BY sr.version DESC LIMIT 1
    );

-- "pendingRevisionCount" stays at its DEFAULT 0 for every existing row,
-- which is already correct now that every revision above is APPROVED.
