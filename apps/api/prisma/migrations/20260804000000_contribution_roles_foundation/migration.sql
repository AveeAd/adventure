-- MILESTONE_3.md Phase 19: roles & profile foundation.

-- Role gains MODERATOR (admin-site login is allowed for ADMIN and
-- MODERATOR; moderator promotion itself arrives in Phase 24 via
-- ModeratorApplication - this migration only adds the enum value).
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- GuideProfile becomes universal: every user gets a row going forward
-- (see AuthService.handleGoogleLogin), and existing rows were created only
-- by users who opted into professional guiding, so they backfill isListed
-- = true to keep the public /guides directory unchanged for them.
ALTER TABLE "guide_profiles" ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "guide_profiles" SET "isListed" = true;

ALTER TABLE "guide_profiles" ADD COLUMN "contributionPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guide_profiles" ADD COLUMN "guideLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "guide_profiles" ADD COLUMN "approvalsGiven" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
