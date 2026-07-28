-- AlterTable
ALTER TABLE "districts" ADD COLUMN "requiresRegisteredAgency" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "GuideVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_LICENSE_REVIEW', 'VERIFIED');

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "bio" TEXT,
    "rateMin" INTEGER,
    "rateMax" INTEGER,
    "rateUnit" TEXT,
    "verificationStatus" "GuideVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_specialties" (
    "id" TEXT NOT NULL,
    "guideProfileId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,

    CONSTRAINT "guide_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_regions" (
    "id" TEXT NOT NULL,
    "guideProfileId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "guide_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_languages" (
    "id" TEXT NOT NULL,
    "guideProfileId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "guide_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_name_key" ON "languages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "languages_isoCode_key" ON "languages"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "guide_profiles_userId_key" ON "guide_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guide_specialties_guideProfileId_activityTypeId_key" ON "guide_specialties"("guideProfileId", "activityTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "guide_regions_guideProfileId_districtId_key" ON "guide_regions"("guideProfileId", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "guide_languages_guideProfileId_languageId_key" ON "guide_languages"("guideProfileId", "languageId");

-- AddForeignKey
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_specialties" ADD CONSTRAINT "guide_specialties_guideProfileId_fkey" FOREIGN KEY ("guideProfileId") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_specialties" ADD CONSTRAINT "guide_specialties_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_regions" ADD CONSTRAINT "guide_regions_guideProfileId_fkey" FOREIGN KEY ("guideProfileId") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_regions" ADD CONSTRAINT "guide_regions_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_languages" ADD CONSTRAINT "guide_languages_guideProfileId_fkey" FOREIGN KEY ("guideProfileId") REFERENCES "guide_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_languages" ADD CONSTRAINT "guide_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
