-- CreateEnum
CREATE TYPE "GeoVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "spot_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spot_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trails" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "name" TEXT,
    "geometry" geometry(LineString, 4326) NOT NULL,
    "distanceMeters" INTEGER,
    "verificationStatus" "GeoVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "lastEditedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_confirmations" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spots" (
    "id" TEXT NOT NULL,
    "adventurePageId" TEXT NOT NULL,
    "spotTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "geometry" geometry(Point, 4326) NOT NULL,
    "elevationMeters" INTEGER,
    "verificationStatus" "GeoVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "lastEditedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_confirmations" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spot_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (hand-added: GiST spatial indexes, Prisma can't express these)
CREATE INDEX "trails_geometry_idx" ON "trails" USING GIST ("geometry");

-- CreateIndex (hand-added: GiST spatial indexes, Prisma can't express these)
CREATE INDEX "spots_geometry_idx" ON "spots" USING GIST ("geometry");

-- CreateIndex
CREATE UNIQUE INDEX "spot_types_name_key" ON "spot_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "spot_types_slug_key" ON "spot_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "trail_confirmations_trailId_userId_key" ON "trail_confirmations"("trailId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "spot_confirmations_spotId_userId_key" ON "spot_confirmations"("spotId", "userId");

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_confirmations" ADD CONSTRAINT "trail_confirmations_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_confirmations" ADD CONSTRAINT "trail_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_adventurePageId_fkey" FOREIGN KEY ("adventurePageId") REFERENCES "adventure_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_spotTypeId_fkey" FOREIGN KEY ("spotTypeId") REFERENCES "spot_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_confirmations" ADD CONSTRAINT "spot_confirmations_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_confirmations" ADD CONSTRAINT "spot_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
