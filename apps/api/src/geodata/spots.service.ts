import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpotDto } from './dto/create-spot.dto';
import { UpdateSpotDto } from './dto/update-spot.dto';

const CONFIRMATION_THRESHOLD = 2;

export interface SpotRow {
  id: string;
  adventurePageId: string;
  spotTypeId: string;
  spotTypeName: string;
  name: string;
  description: string | null;
  geometry: unknown;
  elevationMeters: number | null;
  verificationStatus: string;
  isActive: boolean;
  createdById: string;
  lastEditedById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SpotsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPage(pageId: string): Promise<SpotRow[]> {
    return this.prisma.$queryRaw<SpotRow[]>`
      SELECT s.id, s."adventurePageId", s."spotTypeId", st.name AS "spotTypeName", s.name, s.description,
             ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
             s."verificationStatus", s."isActive",
             s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
      FROM spots s
      JOIN spot_types st ON st.id = s."spotTypeId"
      WHERE s."adventurePageId" = ${pageId} AND s."isActive" = true
    `;
  }

  async get(id: string): Promise<SpotRow> {
    const rows = await this.prisma.$queryRaw<SpotRow[]>`
      SELECT s.id, s."adventurePageId", s."spotTypeId", st.name AS "spotTypeName", s.name, s.description,
             ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
             s."verificationStatus", s."isActive",
             s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
      FROM spots s
      JOIN spot_types st ON st.id = s."spotTypeId"
      WHERE s.id = ${id}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Spot ${id} not found`);
    }
    return rows[0];
  }

  async create(pageId: string, userId: string, dto: CreateSpotDto): Promise<SpotRow> {
    const id = randomUUID();
    const now = new Date();
    const geojson = JSON.stringify(dto.geometry);

    await this.prisma.$executeRaw`
      INSERT INTO spots (
        id, "adventurePageId", "spotTypeId", name, description, geometry,
        "elevationMeters", "verificationStatus", "isActive",
        "createdById", "lastEditedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${pageId}, ${dto.spotTypeId}, ${dto.name}, ${dto.description ?? null},
        ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
        ${dto.elevationMeters ?? null},
        'UNVERIFIED', true, ${userId}, ${userId}, ${now}, ${now}
      )
    `;

    return this.get(id);
  }

  async update(id: string, userId: string, dto: UpdateSpotDto): Promise<SpotRow> {
    await this.get(id);
    const nextStatus = dto.isSafetyCriticalEdit ? 'NEEDS_REVIEW' : 'UNVERIFIED';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (dto.geometry) {
        const geojson = JSON.stringify(dto.geometry);
        await tx.$executeRaw`
          UPDATE spots
          SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
              name = COALESCE(${dto.name ?? null}, name),
              description = COALESCE(${dto.description ?? null}, description),
              "spotTypeId" = COALESCE(${dto.spotTypeId ?? null}, "spotTypeId"),
              "elevationMeters" = COALESCE(${dto.elevationMeters ?? null}, "elevationMeters"),
              "verificationStatus" = ${nextStatus}::"GeoVerificationStatus",
              "lastEditedById" = ${userId},
              "updatedAt" = ${now}
          WHERE id = ${id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE spots
          SET name = COALESCE(${dto.name ?? null}, name),
              description = COALESCE(${dto.description ?? null}, description),
              "spotTypeId" = COALESCE(${dto.spotTypeId ?? null}, "spotTypeId"),
              "elevationMeters" = COALESCE(${dto.elevationMeters ?? null}, "elevationMeters"),
              "verificationStatus" = ${nextStatus}::"GeoVerificationStatus",
              "lastEditedById" = ${userId},
              "updatedAt" = ${now}
          WHERE id = ${id}
        `;
      }
      await tx.spotConfirmation.deleteMany({ where: { spotId: id } });
    });

    return this.get(id);
  }

  async delete(id: string): Promise<SpotRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE spots SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  async confirm(spotId: string, userId: string) {
    await this.get(spotId);
    await this.prisma.spotConfirmation.upsert({
      where: { spotId_userId: { spotId, userId } },
      create: { spotId, userId },
      update: {},
    });

    const confirmationCount = await this.prisma.spotConfirmation.count({ where: { spotId } });
    if (confirmationCount >= CONFIRMATION_THRESHOLD) {
      await this.prisma.$executeRaw`UPDATE spots SET "verificationStatus" = 'VERIFIED'::"GeoVerificationStatus" WHERE id = ${spotId}`;
    }

    return { spotId, confirmationCount, threshold: CONFIRMATION_THRESHOLD };
  }

  async inBoundingBox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
  ): Promise<(SpotRow & { pageSlug: string; pageTitle: string })[]> {
    return this.prisma.$queryRaw<(SpotRow & { pageSlug: string; pageTitle: string })[]>`
      SELECT s.id, s."adventurePageId", ap.slug AS "pageSlug", ap.title AS "pageTitle",
             s."spotTypeId", st.name AS "spotTypeName", s.name, s.description,
             ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
             s."verificationStatus", s."isActive",
             s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
      FROM spots s
      JOIN spot_types st ON st.id = s."spotTypeId"
      JOIN adventure_pages ap ON ap.id = s."adventurePageId"
      WHERE s."isActive" = true
        AND ST_Intersects(s.geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    `;
  }

  // admin-only flat listing across all pages, for the Trails & Spots admin area
  async listAll(page = 1, pageSize = 20): Promise<{ data: (SpotRow & { adventurePageTitle: string })[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    const [data, totalRows] = await Promise.all([
      this.prisma.$queryRaw<(SpotRow & { adventurePageTitle: string })[]>`
        SELECT s.id, s."adventurePageId", ap.title AS "adventurePageTitle", s."spotTypeId",
               st.name AS "spotTypeName", s.name, s.description,
               ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
               s."verificationStatus", s."isActive",
               s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
        FROM spots s
        JOIN spot_types st ON st.id = s."spotTypeId"
        JOIN adventure_pages ap ON ap.id = s."adventurePageId"
        WHERE s."isActive" = true
        ORDER BY s."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM spots WHERE "isActive" = true`,
    ]);
    return { data, total: Number(totalRows[0].count), page, pageSize };
  }

  // admin override - sets verificationStatus directly, mirrors
  // AdventurePagesService.updateVerificationStatus
  async updateVerificationStatus(id: string, status: string): Promise<SpotRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE spots SET "verificationStatus" = ${status}::"GeoVerificationStatus" WHERE id = ${id}`;
    return this.get(id);
  }
}
