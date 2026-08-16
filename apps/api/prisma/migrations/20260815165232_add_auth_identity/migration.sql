-- Replaces User.googleId with a provider-agnostic AuthIdentity table so one
-- User can hold both a Google and an Apple identity (Apple sign-in is
-- App Store-mandated - see MOBILE_PLAN.md Phase 0). Data-moving migration:
-- backfill one GOOGLE row per existing user from their googleId, verify the
-- row counts match, then drop the column - per CLAUDE.md's hand-stripped
-- migrate diff pattern rather than trusting a bare `prisma migrate dev`.

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerId_key" ON "auth_identities"("provider", "providerId");

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one GOOGLE identity per existing user, carrying their current
-- googleId and email over verbatim.
INSERT INTO "auth_identities" ("id", "userId", "provider", "providerId", "email", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'GOOGLE', "googleId", "email", "createdAt", "createdAt"
FROM "users";

-- Verify the backfill moved every row before the source column disappears.
DO $$
DECLARE
  user_count INTEGER;
  identity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM "users";
  SELECT COUNT(*) INTO identity_count FROM "auth_identities" WHERE "provider" = 'GOOGLE';
  IF user_count <> identity_count THEN
    RAISE EXCEPTION 'AuthIdentity backfill mismatch: % users but % GOOGLE identities', user_count, identity_count;
  END IF;
END $$;

-- DropIndex
DROP INDEX "users_googleId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "googleId";
