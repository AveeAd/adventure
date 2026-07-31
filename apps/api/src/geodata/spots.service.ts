import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
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

export interface SpotRevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: Date;
}

export interface SpotRevisionDetail extends SpotRevisionSummary {
  spotId: string;
  geometry: unknown;
  spotTypeId: string;
  name: string;
  description: string | null;
  elevationMeters: number | null;
}

@Injectable()
export class SpotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  // Insert creates a version:1 SpotRevision in the same transaction,
  // mirroring TrailsService.create().
  async create(pageId: string, userId: string, dto: CreateSpotDto): Promise<SpotRow> {
    const id = randomUUID();
    const revisionId = randomUUID();
    const now = new Date();
    const geojson = JSON.stringify(dto.geometry);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
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

      await tx.$executeRaw`
        INSERT INTO spot_revisions (
          id, "spotId", version, geometry, "spotTypeId", name, description,
          "elevationMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, 1, geometry, "spotTypeId", name, description,
               "elevationMeters", NULL, false, ${userId}, ${now}
        FROM spots WHERE id = ${id}
      `;
    });

    return this.get(id);
  }

  // Creates a new SpotRevision as a transactional side effect of PATCH -
  // see TrailsService.update()'s comment for the full reasoning. The
  // spotConfirmation.deleteMany call that used to run here is gone.
  async update(id: string, userId: string, dto: UpdateSpotDto): Promise<SpotRow> {
    await this.get(id);
    const nextStatus = dto.isSafetyCriticalEdit ? 'NEEDS_REVIEW' : 'UNVERIFIED';
    const now = new Date();
    const revisionId = randomUUID();

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

      const latest = await tx.$queryRaw<{ version: number }[]>`
        SELECT version FROM spot_revisions WHERE "spotId" = ${id} ORDER BY version DESC LIMIT 1
      `;
      const nextVersion = (latest[0]?.version ?? 0) + 1;

      await tx.$executeRaw`
        INSERT INTO spot_revisions (
          id, "spotId", version, geometry, "spotTypeId", name, description,
          "elevationMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, ${nextVersion}, geometry, "spotTypeId", name, description,
               "elevationMeters", ${dto.editSummary ?? null}, ${dto.isSafetyCriticalEdit ?? false}, ${userId}, ${now}
        FROM spots WHERE id = ${id}
      `;
    });

    return this.get(id);
  }

  async delete(id: string): Promise<SpotRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE spots SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  async confirm(spotId: string, userId: string) {
    const spot = await this.get(spotId);
    const latest = await this.currentRevisionId(spotId);

    await this.prisma.spotConfirmation.upsert({
      where: { revisionId_userId: { revisionId: latest, userId } },
      create: { revisionId: latest, userId },
      update: {},
    });

    const confirmationCount = await this.prisma.spotConfirmation.count({ where: { revisionId: latest } });
    if (confirmationCount >= CONFIRMATION_THRESHOLD) {
      await this.prisma.$executeRaw`UPDATE spots SET "verificationStatus" = 'VERIFIED'::"GeoVerificationStatus" WHERE id = ${spotId}`;

      const page = await this.prisma.adventurePage.findUnique({
        where: { id: spot.adventurePageId },
        select: { slug: true },
      });
      await this.notifications.notify(
        spot.createdById,
        userId,
        NotificationType.SPOT_VERIFIED,
        `"${spot.name}" was confirmed as accurate`,
        page ? `/adventures/${page.slug}` : undefined,
      );
    }

    return { spotId, confirmationCount, threshold: CONFIRMATION_THRESHOLD };
  }

  async listRevisions(spotId: string): Promise<SpotRevisionSummary[]> {
    await this.get(spotId);
    return this.prisma.spotRevision.findMany({
      where: { spotId },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        editorId: true,
        editSummary: true,
        isSafetyCriticalEdit: true,
        createdAt: true,
      },
    });
  }

  async getRevision(spotId: string, version: number): Promise<SpotRevisionDetail> {
    const rows = await this.prisma.$queryRaw<SpotRevisionDetail[]>`
      SELECT id, "spotId", version, ST_AsGeoJSON(geometry)::json AS geometry, "spotTypeId",
             name, description, "elevationMeters", "editSummary", "isSafetyCriticalEdit",
             "editorId", "createdAt"
      FROM spot_revisions
      WHERE "spotId" = ${spotId} AND version = ${version}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Revision ${version} not found for this spot`);
    }
    return rows[0];
  }

  async diff(spotId: string, fromVersion: number, toVersion: number) {
    const rows = await this.prisma.$queryRaw<
      {
        fromName: string;
        toName: string;
        fromDescription: string | null;
        toDescription: string | null;
        fromSpotTypeId: string;
        toSpotTypeId: string;
        fromElevationMeters: number | null;
        toElevationMeters: number | null;
        fromGeometry: unknown;
        toGeometry: unknown;
        maxDeviationMeters: number;
        geometryChanged: boolean;
      }[]
    >`
      SELECT
        f.name AS "fromName", t.name AS "toName",
        f.description AS "fromDescription", t.description AS "toDescription",
        f."spotTypeId" AS "fromSpotTypeId", t."spotTypeId" AS "toSpotTypeId",
        f."elevationMeters" AS "fromElevationMeters", t."elevationMeters" AS "toElevationMeters",
        ST_AsGeoJSON(f.geometry)::json AS "fromGeometry", ST_AsGeoJSON(t.geometry)::json AS "toGeometry",
        ST_HausdorffDistance(ST_Transform(f.geometry, 32645), ST_Transform(t.geometry, 32645)) AS "maxDeviationMeters",
        NOT ST_Equals(f.geometry, t.geometry) AS "geometryChanged"
      FROM spot_revisions f, spot_revisions t
      WHERE f."spotId" = ${spotId} AND f.version = ${fromVersion}
        AND t."spotId" = ${spotId} AND t.version = ${toVersion}
    `;
    if (rows.length === 0) {
      throw new NotFoundException('One or both revisions not found');
    }
    const row = rows[0];

    const changes: { field: string; from: unknown; to: unknown }[] = [];
    if (row.fromName !== row.toName) changes.push({ field: 'name', from: row.fromName, to: row.toName });
    if (row.fromDescription !== row.toDescription) {
      changes.push({ field: 'description', from: row.fromDescription, to: row.toDescription });
    }
    if (row.fromSpotTypeId !== row.toSpotTypeId) {
      changes.push({ field: 'spotTypeId', from: row.fromSpotTypeId, to: row.toSpotTypeId });
    }
    if (row.fromElevationMeters !== row.toElevationMeters) {
      changes.push({ field: 'elevationMeters', from: row.fromElevationMeters, to: row.toElevationMeters });
    }

    return {
      from: fromVersion,
      to: toVersion,
      changes,
      geometry: {
        from: row.fromGeometry,
        to: row.toGeometry,
        maxDeviationMeters: row.maxDeviationMeters,
        geometryChanged: row.geometryChanged,
      },
    };
  }

  async revert(spotId: string, editorId: string, version: number): Promise<SpotRow> {
    const target = await this.getRevision(spotId, version);
    return this.update(spotId, editorId, {
      geometry: target.geometry as UpdateSpotDto['geometry'],
      spotTypeId: target.spotTypeId,
      name: target.name,
      description: target.description ?? undefined,
      elevationMeters: target.elevationMeters ?? undefined,
      editSummary: `Reverted to version ${version}`,
    });
  }

  // Was unbounded, no LIMIT - see TrailsService.inBoundingBox's comment.
  // Points can't be simplified, so only the LIMIT applies here.
  async inBoundingBox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
  ): Promise<(SpotRow & { pageSlug: string; pageTitle: string })[]> {
    const limit = 500;
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
      LIMIT ${limit}
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

  private async currentRevisionId(spotId: string): Promise<string> {
    const latest = await this.prisma.spotRevision.findFirst({
      where: { spotId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (!latest) {
      throw new NotFoundException('This spot has no revisions to confirm');
    }
    return latest.id;
  }
}
