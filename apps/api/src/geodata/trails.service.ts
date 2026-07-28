import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';

const CONFIRMATION_THRESHOLD = 2;

export interface TrailRow {
  id: string;
  adventurePageId: string;
  name: string | null;
  geometry: unknown;
  distanceMeters: number | null;
  verificationStatus: string;
  isActive: boolean;
  createdById: string;
  lastEditedById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TrailsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPage(pageId: string): Promise<TrailRow[]> {
    return this.prisma.$queryRaw<TrailRow[]>`
      SELECT id, "adventurePageId", name, ST_AsGeoJSON(geometry)::json AS geometry,
             "distanceMeters", "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM trails
      WHERE "adventurePageId" = ${pageId} AND "isActive" = true
    `;
  }

  async get(id: string): Promise<TrailRow> {
    const rows = await this.prisma.$queryRaw<TrailRow[]>`
      SELECT id, "adventurePageId", name, ST_AsGeoJSON(geometry)::json AS geometry,
             "distanceMeters", "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM trails
      WHERE id = ${id}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Trail ${id} not found`);
    }
    return rows[0];
  }

  async create(pageId: string, userId: string, dto: CreateTrailDto): Promise<TrailRow> {
    const id = randomUUID();
    const now = new Date();
    const geojson = JSON.stringify(dto.geometry);

    await this.prisma.$executeRaw`
      INSERT INTO trails (
        id, "adventurePageId", name, geometry, "distanceMeters",
        "verificationStatus", "isActive", "createdById", "lastEditedById",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${pageId}, ${dto.name ?? null},
        ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
        COALESCE(${dto.distanceMeters ?? null}, ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography)::int),
        'UNVERIFIED', true, ${userId}, ${userId}, ${now}, ${now}
      )
    `;

    return this.get(id);
  }

  async update(id: string, userId: string, dto: UpdateTrailDto): Promise<TrailRow> {
    await this.get(id);
    const nextStatus = dto.isSafetyCriticalEdit ? 'NEEDS_REVIEW' : 'UNVERIFIED';
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (dto.geometry) {
        const geojson = JSON.stringify(dto.geometry);
        await tx.$executeRaw`
          UPDATE trails
          SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
              "distanceMeters" = COALESCE(${dto.distanceMeters ?? null}, ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography)::int),
              name = COALESCE(${dto.name ?? null}, name),
              "verificationStatus" = ${nextStatus}::"GeoVerificationStatus",
              "lastEditedById" = ${userId},
              "updatedAt" = ${now}
          WHERE id = ${id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE trails
          SET name = COALESCE(${dto.name ?? null}, name),
              "verificationStatus" = ${nextStatus}::"GeoVerificationStatus",
              "lastEditedById" = ${userId},
              "updatedAt" = ${now}
          WHERE id = ${id}
        `;
      }
      // no revision history here (unlike PageConfirmation) - resetting
      // verification and clearing confirmations in the same transaction is
      // the load-bearing rule that keeps stale trust from riding along
      await tx.trailConfirmation.deleteMany({ where: { trailId: id } });
    });

    return this.get(id);
  }

  async delete(id: string): Promise<TrailRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE trails SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  async confirm(trailId: string, userId: string) {
    await this.get(trailId);
    await this.prisma.trailConfirmation.upsert({
      where: { trailId_userId: { trailId, userId } },
      create: { trailId, userId },
      update: {},
    });

    const confirmationCount = await this.prisma.trailConfirmation.count({ where: { trailId } });
    if (confirmationCount >= CONFIRMATION_THRESHOLD) {
      await this.prisma.$executeRaw`UPDATE trails SET "verificationStatus" = 'VERIFIED'::"GeoVerificationStatus" WHERE id = ${trailId}`;
    }

    return { trailId, confirmationCount, threshold: CONFIRMATION_THRESHOLD };
  }

  async inBoundingBox(minLng: number, minLat: number, maxLng: number, maxLat: number): Promise<TrailRow[]> {
    return this.prisma.$queryRaw<TrailRow[]>`
      SELECT id, "adventurePageId", name, ST_AsGeoJSON(geometry)::json AS geometry,
             "distanceMeters", "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM trails
      WHERE "isActive" = true
        AND ST_Intersects(geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    `;
  }
}
