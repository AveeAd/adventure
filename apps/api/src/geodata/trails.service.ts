import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TrailElevationProfile } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertWithinNepal, buildSamples, computeAggregates, simplifyPoints, TrackAggregates } from '../tracks/track-geometry.util';
import { CreateTrailDto } from './dto/create-trail.dto';
import { deriveDistrictTags } from './district-derivation.util';
import { UpdateTrailDto } from './dto/update-trail.dto';

const CONFIRMATION_THRESHOLD = 2;

export interface TrailRow {
  id: string;
  adventurePageId: string;
  name: string | null;
  geometry: unknown;
  distanceMeters: number | null;
  source: string;
  verificationStatus: string;
  isActive: boolean;
  createdById: string;
  lastEditedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrailListRow extends TrailRow {
  elevationSamples: unknown;
  ascentMeters: number | null;
  descentMeters: number | null;
}

export interface TrailRevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: Date;
}

export interface TrailRevisionDetail extends TrailRevisionSummary {
  trailId: string;
  geometry: unknown;
  name: string | null;
  distanceMeters: number | null;
}

@Injectable()
export class TrailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // LEFT JOINs the elevation profile - unlike get(id)'s explicit extra
  // select, this list backs the adventure page view, which needs every
  // trail's chart/ascent-descent figures up front (see TRAIL_ELEVATION.md's
  // public UI section), so a per-trail follow-up fetch would be worse.
  async listForPage(pageId: string): Promise<TrailListRow[]> {
    return this.prisma.$queryRaw<TrailListRow[]>`
      SELECT t.id, t."adventurePageId", t.name, ST_AsGeoJSON(t.geometry)::json AS geometry,
             t."distanceMeters", t.source, t."verificationStatus", t."isActive",
             t."createdById", t."lastEditedById", t."createdAt", t."updatedAt",
             p.samples AS "elevationSamples", p."ascentMeters", p."descentMeters"
      FROM trails t
      LEFT JOIN trail_elevation_profiles p ON p."trailId" = t.id
      WHERE t."adventurePageId" = ${pageId} AND t."isActive" = true
    `;
  }

  // Response gains elevationProfile (aggregates + samples) when present, per
  // TRAIL_ELEVATION.md - an explicit extra select, not selected on the list/
  // bbox paths above, matching the doc's "not selected unless asked for" rule.
  async get(id: string): Promise<TrailRow & { elevationProfile: TrailElevationProfile | null }> {
    const rows = await this.prisma.$queryRaw<TrailRow[]>`
      SELECT id, "adventurePageId", name, ST_AsGeoJSON(geometry)::json AS geometry,
             "distanceMeters", source, "verificationStatus", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM trails
      WHERE id = ${id}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Trail ${id} not found`);
    }
    const elevationProfile = await this.prisma.trailElevationProfile.findUnique({ where: { trailId: id } });
    return { ...rows[0], elevationProfile };
  }

  // One trail per activity page: a second "add trail" submission is an edit
  // to the existing trail, not a new one, so it must go through update() and
  // create a TrailRevision rather than a second Trail row.
  private async findActiveTrailId(pageId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM trails WHERE "adventurePageId" = ${pageId} AND "isActive" = true LIMIT 1
    `;
    return rows[0]?.id ?? null;
  }

  // Insert creates a version:1 TrailRevision in the same transaction,
  // mirroring AdventurePagesService.create()'s page+revision transaction.
  // source defaults to DRAWN (hand-clicked in DrawMap); TracksService's
  // promote-to-trail flow passes RECORDED_ACTIVITY instead.
  async create(pageId: string, userId: string, dto: CreateTrailDto, source: 'DRAWN' | 'RECORDED_ACTIVITY' = 'DRAWN'): Promise<TrailRow> {
    const existingId = await this.findActiveTrailId(pageId);
    if (existingId) {
      return this.update(existingId, userId, {
        geometry: dto.geometry,
        name: dto.name,
        distanceMeters: dto.distanceMeters,
        editSummary: 'Replaced via a new trail submission for this activity',
      });
    }

    const id = randomUUID();
    const revisionId = randomUUID();
    const now = new Date();
    const geojson = JSON.stringify(dto.geometry);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO trails (
          id, "adventurePageId", name, geometry, "distanceMeters", source,
          "verificationStatus", "isActive", "createdById", "lastEditedById",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${id}, ${pageId}, ${dto.name ?? null},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
          COALESCE(${dto.distanceMeters ?? null}, ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography)::int),
          ${source}::"TrailSource",
          'UNVERIFIED', true, ${userId}, ${userId}, ${now}, ${now}
        )
      `;

      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, 1, geometry, name, "distanceMeters",
               NULL, false, ${userId}, ${now}
        FROM trails WHERE id = ${id}
      `;

      await deriveDistrictTags(tx, 'trails', id, pageId);
    });

    return this.get(id);
  }

  // Creates a new TrailRevision as a transactional side effect of the same
  // PATCH entry point the contribute UI already uses - see GEODATA_HISTORY.md's
  // "the divergence" note on why this isn't a separate POST :id/revisions route
  // the way adventure pages are. The trailConfirmation.deleteMany call that
  // used to run here is gone: confirmations are revision-scoped now, so they
  // go stale for free by pointing at a superseded revision.
  async update(id: string, userId: string, dto: UpdateTrailDto): Promise<TrailRow> {
    const existing = await this.get(id);
    const nextStatus = dto.isSafetyCriticalEdit ? 'NEEDS_REVIEW' : 'UNVERIFIED';
    const now = new Date();
    const revisionId = randomUUID();

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

      const latest = await tx.$queryRaw<{ version: number }[]>`
        SELECT version FROM trail_revisions WHERE "trailId" = ${id} ORDER BY version DESC LIMIT 1
      `;
      const nextVersion = (latest[0]?.version ?? 0) + 1;

      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, ${nextVersion}, geometry, name, "distanceMeters",
               ${dto.editSummary ?? null}, ${dto.isSafetyCriticalEdit ?? false}, ${userId}, ${now}
        FROM trails WHERE id = ${id}
      `;

      // TRAIL_ELEVATION.md's invalidation rule: a profile is only meaningful
      // for the exact path it was derived from, so it's deleted in the same
      // transaction as the geometry change - but geometry-conditional, not
      // unconditional, or a name-only edit would wipe a perfectly good profile.
      if (dto.geometry) {
        await tx.trailElevationProfile.deleteMany({ where: { trailId: id } });
        await deriveDistrictTags(tx, 'trails', id, existing.adventurePageId);
      }
    });

    return this.get(id);
  }

  async delete(id: string): Promise<TrailRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE trails SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  // Confirms against the current revision's confirmations, not the row's
  // all-time total - see GEODATA_HISTORY.md's per-table notes.
  async confirm(trailId: string, userId: string) {
    const trail = await this.get(trailId);
    const latest = await this.currentRevisionId(trailId);

    await this.prisma.trailConfirmation.upsert({
      where: { revisionId_userId: { revisionId: latest, userId } },
      create: { revisionId: latest, userId },
      update: {},
    });

    const confirmationCount = await this.prisma.trailConfirmation.count({ where: { revisionId: latest } });
    if (confirmationCount >= CONFIRMATION_THRESHOLD) {
      await this.prisma.$executeRaw`UPDATE trails SET "verificationStatus" = 'VERIFIED'::"GeoVerificationStatus" WHERE id = ${trailId}`;

      const page = await this.prisma.adventurePage.findUnique({
        where: { id: trail.adventurePageId },
        select: { slug: true },
      });
      await this.notifications.notify(
        trail.createdById,
        userId,
        NotificationType.TRAIL_VERIFIED,
        `"${trail.name ?? 'Your trail'}" was confirmed as accurate`,
        page ? `/adventures/${page.slug}` : undefined,
      );
    }

    return { trailId, confirmationCount, threshold: CONFIRMATION_THRESHOLD };
  }

  async listRevisions(trailId: string): Promise<TrailRevisionSummary[]> {
    await this.get(trailId);
    return this.prisma.trailRevision.findMany({
      where: { trailId },
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

  async getRevision(trailId: string, version: number): Promise<TrailRevisionDetail> {
    const rows = await this.prisma.$queryRaw<TrailRevisionDetail[]>`
      SELECT id, "trailId", version, ST_AsGeoJSON(geometry)::json AS geometry, name,
             "distanceMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
      FROM trail_revisions
      WHERE "trailId" = ${trailId} AND version = ${version}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Revision ${version} not found for this trail`);
    }
    return rows[0];
  }

  // diffLines is meaningless for a LineString, so geodata diverges from
  // adventure pages here - scalar field changes plus PostGIS-computed
  // geometry summary stats, per GEODATA_HISTORY.md's "Diffing geometry".
  async diff(trailId: string, fromVersion: number, toVersion: number) {
    const rows = await this.prisma.$queryRaw<
      {
        fromName: string | null;
        toName: string | null;
        fromDistanceMeters: number | null;
        toDistanceMeters: number | null;
        fromGeometry: unknown;
        toGeometry: unknown;
        vertexDelta: number;
        lengthDeltaMeters: number;
        maxDeviationMeters: number;
        geometryChanged: boolean;
      }[]
    >`
      SELECT
        f.name AS "fromName", t.name AS "toName",
        f."distanceMeters" AS "fromDistanceMeters", t."distanceMeters" AS "toDistanceMeters",
        ST_AsGeoJSON(f.geometry)::json AS "fromGeometry", ST_AsGeoJSON(t.geometry)::json AS "toGeometry",
        (ST_NPoints(t.geometry) - ST_NPoints(f.geometry)) AS "vertexDelta",
        (ST_Length(t.geometry::geography) - ST_Length(f.geometry::geography))::int AS "lengthDeltaMeters",
        ST_HausdorffDistance(ST_Transform(f.geometry, 32645), ST_Transform(t.geometry, 32645)) AS "maxDeviationMeters",
        NOT ST_Equals(f.geometry, t.geometry) AS "geometryChanged"
      FROM trail_revisions f, trail_revisions t
      WHERE f."trailId" = ${trailId} AND f.version = ${fromVersion}
        AND t."trailId" = ${trailId} AND t.version = ${toVersion}
    `;
    if (rows.length === 0) {
      throw new NotFoundException('One or both revisions not found');
    }
    const row = rows[0];

    const changes: { field: string; from: unknown; to: unknown }[] = [];
    if (row.fromName !== row.toName) {
      changes.push({ field: 'name', from: row.fromName, to: row.toName });
    }
    if (row.fromDistanceMeters !== row.toDistanceMeters) {
      changes.push({ field: 'distanceMeters', from: row.fromDistanceMeters, to: row.toDistanceMeters });
    }

    return {
      from: fromVersion,
      to: toVersion,
      changes,
      geometry: {
        from: row.fromGeometry,
        to: row.toGeometry,
        vertexDelta: row.vertexDelta,
        lengthDeltaMeters: row.lengthDeltaMeters,
        maxDeviationMeters: row.maxDeviationMeters,
        geometryChanged: row.geometryChanged,
      },
    };
  }

  // Creates a NEW revision copying the target snapshot forward - never a
  // delete or pointer move, per FEATURE.md §3's revert convention.
  async revert(trailId: string, editorId: string, version: number): Promise<TrailRow> {
    const target = await this.getRevision(trailId, version);
    return this.update(trailId, editorId, {
      geometry: target.geometry as UpdateTrailDto['geometry'],
      name: target.name ?? undefined,
      distanceMeters: target.distanceMeters ?? undefined,
      editSummary: `Reverted to version ${version}`,
    });
  }

  // Was unbounded and unsimplified - every intersecting row at full vertex
  // resolution, no LIMIT. A zoom-derived ST_SimplifyPreserveTopology
  // tolerance plus a hard LIMIT fix that; see ACTIVITY_TRACKS.md's
  // prerequisite fixes (a track recorder is exactly the workload that turns
  // this into an outage).
  async inBoundingBox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
    zoom = 10,
  ): Promise<(TrailRow & { pageSlug: string; pageTitle: string })[]> {
    const toleranceDegrees = 0.5 / Math.pow(2, zoom);
    const limit = 500;
    return this.prisma.$queryRaw<(TrailRow & { pageSlug: string; pageTitle: string })[]>`
      SELECT t.id, t."adventurePageId", ap.slug AS "pageSlug", ap.title AS "pageTitle", t.name,
             ST_AsGeoJSON(ST_SimplifyPreserveTopology(t.geometry, ${toleranceDegrees}))::json AS geometry,
             t."distanceMeters", t.source, t."verificationStatus", t."isActive",
             t."createdById", t."lastEditedById", t."createdAt", t."updatedAt"
      FROM trails t
      JOIN adventure_pages ap ON ap.id = t."adventurePageId"
      WHERE t."isActive" = true
        AND ST_Intersects(t.geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
      LIMIT ${limit}
    `;
  }

  // admin-only flat listing across all pages, for the Trails & Spots admin area
  async listAll(page = 1, pageSize = 20): Promise<{ data: (TrailRow & { adventurePageTitle: string })[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    const [data, totalRows] = await Promise.all([
      this.prisma.$queryRaw<(TrailRow & { adventurePageTitle: string })[]>`
        SELECT t.id, t."adventurePageId", ap.title AS "adventurePageTitle", t.name,
               ST_AsGeoJSON(t.geometry)::json AS geometry, t."distanceMeters", t.source,
               t."verificationStatus", t."isActive",
               t."createdById", t."lastEditedById", t."createdAt", t."updatedAt"
        FROM trails t
        JOIN adventure_pages ap ON ap.id = t."adventurePageId"
        WHERE t."isActive" = true
        ORDER BY t."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM trails WHERE "isActive" = true`,
    ]);
    return { data, total: Number(totalRows[0].count), page, pageSize };
  }

  // admin override - sets verificationStatus directly, mirrors
  // AdventurePagesService.updateVerificationStatus
  async updateVerificationStatus(id: string, status: string): Promise<TrailRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE trails SET "verificationStatus" = ${status}::"GeoVerificationStatus" WHERE id = ${id}`;
    return this.get(id);
  }

  // One transaction creates the Trail (source: GPX_IMPORT), its v1
  // TrailRevision, and a TrailElevationProfile when the file supplied
  // elevation. Only the first parsed track is used - a Trail is a single
  // LineString, and multi-<trk> files are ACTIVITY_TRACKS.md's territory.
  async importGpx(
    pageId: string,
    userId: string,
    points: { lng: number; lat: number; ele?: number }[],
    name: string | undefined,
  ): Promise<TrailRow & { elevationProfile: TrailElevationProfile | null }> {
    assertWithinNepal(points);
    const simplified = simplifyPoints(points, 5);
    const geometry = { type: 'LineString' as const, coordinates: simplified.map((p) => [p.lng, p.lat]) };
    const geojson = JSON.stringify(geometry);
    const aggregates = computeAggregates(points);
    const hasElevation = aggregates.minElevationMeters !== null;

    const existingId = await this.findActiveTrailId(pageId);
    if (existingId) {
      return this.replaceGeometryFromGpx(existingId, pageId, userId, name, geojson, aggregates, hasElevation, points);
    }

    const id = randomUUID();
    const revisionId = randomUUID();
    const profileId = randomUUID();
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO trails (
          id, "adventurePageId", name, geometry, "distanceMeters", source,
          "verificationStatus", "isActive", "createdById", "lastEditedById",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${id}, ${pageId}, ${name ?? null},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
          ${aggregates.distanceMeters}, 'GPX_IMPORT',
          'UNVERIFIED', true, ${userId}, ${userId}, ${now}, ${now}
        )
      `;

      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, 1, geometry, name, "distanceMeters",
               'Imported from GPX', false, ${userId}, ${now}
        FROM trails WHERE id = ${id}
      `;

      if (hasElevation) {
        const samples = buildSamples(points);
        await tx.trailElevationProfile.create({
          data: {
            id: profileId,
            trailId: id,
            samples,
            sampleCount: samples.length,
            ascentMeters: aggregates.ascentMeters,
            descentMeters: aggregates.descentMeters,
            minElevationMeters: aggregates.minElevationMeters!,
            maxElevationMeters: aggregates.maxElevationMeters!,
          },
        });
      }

      await deriveDistrictTags(tx, 'trails', id, pageId);
    });

    return this.get(id);
  }

  // Re-importing a GPX for a page that already has a trail replaces its
  // geometry via a new TrailRevision, mirroring update()'s geometry branch,
  // instead of importGpx() inserting a second Trail row.
  private async replaceGeometryFromGpx(
    trailId: string,
    pageId: string,
    userId: string,
    name: string | undefined,
    geojson: string,
    aggregates: TrackAggregates,
    hasElevation: boolean,
    points: { lng: number; lat: number; ele?: number }[],
  ): Promise<TrailRow & { elevationProfile: TrailElevationProfile | null }> {
    const now = new Date();
    const revisionId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE trails
        SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
            "distanceMeters" = ${aggregates.distanceMeters},
            name = COALESCE(${name ?? null}, name),
            "verificationStatus" = 'UNVERIFIED',
            "lastEditedById" = ${userId},
            "updatedAt" = ${now}
        WHERE id = ${trailId}
      `;

      const latest = await tx.$queryRaw<{ version: number }[]>`
        SELECT version FROM trail_revisions WHERE "trailId" = ${trailId} ORDER BY version DESC LIMIT 1
      `;
      const nextVersion = (latest[0]?.version ?? 0) + 1;

      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        SELECT ${revisionId}, id, ${nextVersion}, geometry, name, "distanceMeters",
               'Replaced via GPX re-import', false, ${userId}, ${now}
        FROM trails WHERE id = ${trailId}
      `;

      await tx.trailElevationProfile.deleteMany({ where: { trailId } });
      if (hasElevation) {
        const samples = buildSamples(points);
        await tx.trailElevationProfile.create({
          data: {
            id: randomUUID(),
            trailId,
            samples,
            sampleCount: samples.length,
            ascentMeters: aggregates.ascentMeters,
            descentMeters: aggregates.descentMeters,
            minElevationMeters: aggregates.minElevationMeters!,
            maxElevationMeters: aggregates.maxElevationMeters!,
          },
        });
      }

      await deriveDistrictTags(tx, 'trails', trailId, pageId);
    });

    return this.get(trailId);
  }

  // admin-only escape hatch for a bad import - deletes the profile without
  // touching the trail.
  async deleteElevationProfile(trailId: string): Promise<void> {
    await this.get(trailId);
    await this.prisma.trailElevationProfile.deleteMany({ where: { trailId } });
  }

  private async currentRevisionId(trailId: string): Promise<string> {
    const latest = await this.prisma.trailRevision.findFirst({
      where: { trailId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (!latest) {
      throw new NotFoundException('This trail has no revisions to confirm');
    }
    return latest.id;
  }
}
