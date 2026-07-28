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
      SELECT id, "adventurePageId", "spotTypeId", name, description,
             ST_AsGeoJSON(geometry)::json AS geometry, "elevationMeters",
             "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM spots
      WHERE "adventurePageId" = ${pageId} AND "isActive" = true
    `;
  }

  async get(id: string): Promise<SpotRow> {
    const rows = await this.prisma.$queryRaw<SpotRow[]>`
      SELECT id, "adventurePageId", "spotTypeId", name, description,
             ST_AsGeoJSON(geometry)::json AS geometry, "elevationMeters",
             "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM spots
      WHERE id = ${id}
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

  async inBoundingBox(minLng: number, minLat: number, maxLng: number, maxLat: number): Promise<SpotRow[]> {
    return this.prisma.$queryRaw<SpotRow[]>`
      SELECT id, "adventurePageId", "spotTypeId", name, description,
             ST_AsGeoJSON(geometry)::json AS geometry, "elevationMeters",
             "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM spots
      WHERE "isActive" = true
        AND ST_Intersects(geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    `;
  }
}
