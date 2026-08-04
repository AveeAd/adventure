import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, NotificationType, Prisma, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { deriveVerificationStatus, isApprovalEligible, resolveVoteOutcome } from '../approvals/approval-rules.util';
import { ContributionsService } from '../contributions/contributions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateSpotDto } from './dto/create-spot.dto';
import { deriveDistrictTags } from './district-derivation.util';
import { UpdateSpotDto } from './dto/update-spot.dto';

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
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
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
  approvalStatus: string;
  resolvedAt: Date | null;
  resolvedById: string | null;
  rejectionReason: string | null;
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
    private readonly contributions: ContributionsService,
    private readonly settings: SettingsService,
  ) {}

  async listForPage(pageId: string): Promise<SpotRow[]> {
    return this.prisma.$queryRaw<SpotRow[]>`
      SELECT s.id, s."adventurePageId", s."spotTypeId", st.name AS "spotTypeName", s.name, s.description,
             ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
             s."verificationStatus", s."approvedRevisionId", s."pendingRevisionCount", s."isActive",
             s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
      FROM spots s
      JOIN spot_types st ON st.id = s."spotTypeId"
      WHERE s."adventurePageId" = ${pageId} AND s."isActive" = true
    `;
  }

  async get(id: string): Promise<SpotRow & { approvedRevision: SpotRevisionDetail | null }> {
    const rows = await this.prisma.$queryRaw<SpotRow[]>`
      SELECT s.id, s."adventurePageId", s."spotTypeId", st.name AS "spotTypeName", s.name, s.description,
             ST_AsGeoJSON(s.geometry)::json AS geometry, s."elevationMeters",
             s."verificationStatus", s."approvedRevisionId", s."pendingRevisionCount", s."isActive",
             s."createdById", s."lastEditedById", s."createdAt", s."updatedAt"
      FROM spots s
      JOIN spot_types st ON st.id = s."spotTypeId"
      WHERE s.id = ${id}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Spot ${id} not found`);
    }
    const approvedRevision = rows[0].approvedRevisionId ? await this.getRevisionById(rows[0].approvedRevisionId) : null;
    return { ...rows[0], approvedRevision };
  }

  private async getRevisionById(revisionId: string): Promise<SpotRevisionDetail> {
    const rows = await this.prisma.$queryRaw<SpotRevisionDetail[]>`
      SELECT id, "spotId", version, ST_AsGeoJSON(geometry)::json AS geometry, "spotTypeId",
             name, description, "elevationMeters", "editSummary", "isSafetyCriticalEdit",
             "approvalStatus", "resolvedAt", "resolvedById", "rejectionReason",
             "editorId", "createdAt"
      FROM spot_revisions
      WHERE id = ${revisionId}
    `;
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

      await deriveDistrictTags(tx, 'spots', id, pageId);
    });

    // MILESTONE_3.md §3.2: points are awarded on approval, not on submit -
    // v1 sits PENDING like any other revision, GEO_CREATE moves to
    // applyApproval().
    return this.get(id);
  }

  // MILESTONE_3.md §5.2 - see TrailsService.update()'s comment for the full
  // reasoning (same shape: writes only a new PENDING SpotRevision, never
  // touches the live spots row, COALESCEs against the latest existing
  // revision rather than the live row). deriveDistrictTags stays immediate/
  // ungated, same "additive-only derived metadata" reasoning as trails.
  async update(id: string, userId: string, dto: UpdateSpotDto): Promise<SpotRevisionDetail> {
    const existing = await this.get(id);
    const now = new Date();
    const revisionId = randomUUID();

    const baseRows = await this.prisma.$queryRaw<
      { version: number; spotTypeId: string; name: string; description: string | null; elevationMeters: number | null; geometryText: string }[]
    >`
      SELECT version, "spotTypeId", name, description, "elevationMeters", ST_AsGeoJSON(geometry) AS "geometryText"
      FROM spot_revisions WHERE "spotId" = ${id} ORDER BY version DESC LIMIT 1
    `;
    const base = baseRows[0];
    if (!base) {
      throw new NotFoundException(`Spot ${id} has no revisions to edit`);
    }
    const nextVersion = base.version + 1;
    const geojson = dto.geometry ? JSON.stringify(dto.geometry) : base.geometryText;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO spot_revisions (
          id, "spotId", version, geometry, "spotTypeId", name, description,
          "elevationMeters", "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        VALUES (
          ${revisionId}, ${id}, ${nextVersion},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
          COALESCE(${dto.spotTypeId ?? null}, ${base.spotTypeId}),
          COALESCE(${dto.name ?? null}, ${base.name}),
          COALESCE(${dto.description ?? null}, ${base.description}),
          COALESCE(${dto.elevationMeters ?? null}, ${base.elevationMeters}),
          ${dto.editSummary ?? null}, ${dto.isSafetyCriticalEdit ?? false}, ${userId}, ${now}
        )
      `;

      if (dto.geometry) {
        await deriveDistrictTags(tx, 'spots', id, existing.adventurePageId);
      }

      await this.recomputeStatus(tx, id);
    });

    return this.getRevision(id, nextVersion);
  }

  async delete(id: string): Promise<SpotRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE spots SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  // MILESTONE_3.md §5.3: casts an APPROVE/REJECT vote on a specific pending
  // revision. Replaces the retired confirm()/CONFIRMATION_THRESHOLD flow.
  async voteOnRevision(spotId: string, version: number, voterId: string, voterRole: Role, dto: CastVoteDto) {
    const revision = await this.prisma.spotRevision.findUnique({
      where: { spotId_version: { spotId, version } },
    });
    if (!revision) {
      throw new NotFoundException(`Revision ${version} not found for this spot`);
    }
    if (revision.approvalStatus !== 'PENDING') {
      throw new BadRequestException('This revision has already been resolved');
    }
    if (revision.editorId === voterId) {
      throw new ForbiddenException('You cannot vote on your own revision');
    }

    const isAdminOrMod = voterRole === Role.ADMIN || voterRole === Role.MODERATOR;
    if (!isAdminOrMod) {
      const profile = await this.prisma.guideProfile.findUnique({
        where: { userId: voterId },
        select: { guideLevel: true },
      });
      const minGuideLevel = this.settings.getNumber('approval.minGuideLevel');
      if (!isApprovalEligible(voterRole, profile?.guideLevel ?? 1, minGuideLevel)) {
        throw new ForbiddenException(`Guide level ${minGuideLevel}+ is required to vote on pending revisions`);
      }
    }

    const existingVote = await this.prisma.spotConfirmation.findUnique({
      where: { revisionId_userId: { revisionId: revision.id, userId: voterId } },
    });
    await this.prisma.spotConfirmation.upsert({
      where: { revisionId_userId: { revisionId: revision.id, userId: voterId } },
      create: { revisionId: revision.id, userId: voterId, decision: dto.decision },
      update: { decision: dto.decision },
    });
    if (!existingVote) {
      await this.prisma.guideProfile.updateMany({
        where: { userId: voterId },
        data: { approvalsGiven: { increment: 1 } },
      });
    }

    const [approveCount, rejectCount] = await Promise.all([
      this.prisma.spotConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
      this.prisma.spotConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
    ]);
    const threshold = this.settings.getNumber('approval.threshold');
    const outcome = resolveVoteOutcome(dto.decision, isAdminOrMod, approveCount, rejectCount, threshold);

    if (outcome === 'APPROVED') {
      await this.applyApproval(spotId, revision, voterId);
    } else if (outcome === 'REJECTED') {
      await this.applyRejection(spotId, revision, voterId, dto.rejectionReason);
    }

    return { revisionId: revision.id, outcome, approveCount, rejectCount, threshold };
  }

  private async applyApproval(
    spotId: string,
    revision: { id: string; version: number; editorId: string },
    approverId: string,
  ): Promise<void> {
    const before = await this.get(spotId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.spotRevision.update({
        where: { id: revision.id },
        data: { approvalStatus: 'APPROVED', resolvedAt: now, resolvedById: approverId },
      });
      await tx.spotRevision.updateMany({
        where: { spotId, approvalStatus: 'PENDING', version: { lt: revision.version } },
        data: { approvalStatus: 'REJECTED', resolvedAt: now, resolvedById: approverId, rejectionReason: 'SUPERSEDED' },
      });

      await tx.$executeRaw`
        UPDATE spots s
        SET geometry = r.geometry, "spotTypeId" = r."spotTypeId", name = r.name,
            description = r.description, "elevationMeters" = r."elevationMeters",
            "lastEditedById" = r."editorId", "approvedRevisionId" = r.id, "updatedAt" = ${now}
        FROM spot_revisions r
        WHERE r.id = ${revision.id} AND s.id = ${spotId}
      `;

      await this.recomputeStatus(tx, spotId);
    });

    // MILESTONE_3.md §3.2: v1 always pays GEO_CREATE; later versions pay
    // GEO_UPDATE only when the editor differs from the spot's creator.
    if (revision.version === 1) {
      await this.contributions.award({
        userId: revision.editorId,
        reason: ContributionReason.GEO_CREATE,
        targetType: ContributionTargetType.SPOT,
        targetId: spotId,
      });
    } else if (before.createdById !== revision.editorId) {
      await this.contributions.award({
        userId: revision.editorId,
        reason: ContributionReason.GEO_UPDATE,
        targetType: ContributionTargetType.SPOT_REVISION,
        targetId: revision.id,
      });
    }

    const after = await this.get(spotId);
    if (before.verificationStatus !== 'VERIFIED' && after.verificationStatus === 'VERIFIED') {
      const page = await this.prisma.adventurePage.findUnique({
        where: { id: before.adventurePageId },
        select: { slug: true },
      });
      await this.notifications.notify(
        before.createdById,
        approverId,
        NotificationType.SPOT_VERIFIED,
        `"${after.name}" was confirmed as accurate`,
        page ? `/adventures/${page.slug}` : undefined,
      );
    }
  }

  private async applyRejection(
    spotId: string,
    revision: { id: string },
    approverId: string,
    rejectionReason: string | undefined,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.spotRevision.update({
        where: { id: revision.id },
        data: {
          approvalStatus: 'REJECTED',
          resolvedAt: new Date(),
          resolvedById: approverId,
          rejectionReason: rejectionReason ?? null,
        },
      });
      await this.recomputeStatus(tx, spotId);
    });
  }

  // Recomputes pendingRevisionCount + the derived verificationStatus for a
  // spot - mirrors TrailsService.recomputeStatus.
  private async recomputeStatus(tx: Prisma.TransactionClient, spotId: string, hasUpheldReport = false): Promise<void> {
    const spotRows = await tx.$queryRaw<{ approvedRevisionId: string | null }[]>`
      SELECT "approvedRevisionId" FROM spots WHERE id = ${spotId}
    `;
    const latestRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM spot_revisions WHERE "spotId" = ${spotId} ORDER BY version DESC LIMIT 1
    `;
    const pending = await tx.$queryRaw<{ isSafetyCriticalEdit: boolean }[]>`
      SELECT "isSafetyCriticalEdit" FROM spot_revisions WHERE "spotId" = ${spotId} AND "approvalStatus" = 'PENDING'
    `;
    const verificationStatus = deriveVerificationStatus(spotRows[0]?.approvedRevisionId ?? null, latestRows[0].id, pending, hasUpheldReport);
    await tx.$executeRaw`
      UPDATE spots SET "pendingRevisionCount" = ${pending.length}, "verificationStatus" = ${verificationStatus}::"GeoVerificationStatus"
      WHERE id = ${spotId}
    `;
  }

  // MILESTONE_3.md §8: mirrors TrailsService.revertToPreviousApproved - see
  // its comment for the full rationale (live-row content vs. a page's
  // pointer-only revert, and the no-earlier-approved-version edge case).
  async revertToPreviousApproved(spotId: string): Promise<{ reportedRevisionId: string; reportedEditorId: string }> {
    const spotRows = await this.prisma.$queryRaw<{ approvedRevisionId: string | null }[]>`
      SELECT "approvedRevisionId" FROM spots WHERE id = ${spotId}
    `;
    const approvedRevisionId = spotRows[0]?.approvedRevisionId;
    if (!approvedRevisionId) {
      throw new BadRequestException('This spot has no approved revision to revert');
    }
    const reported = await this.prisma.spotRevision.findUniqueOrThrow({ where: { id: approvedRevisionId } });
    const previous = await this.prisma.spotRevision.findFirst({
      where: { spotId, approvalStatus: 'APPROVED', version: { lt: reported.version } },
      orderBy: { version: 'desc' },
    });

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      if (previous) {
        await tx.$executeRaw`
          UPDATE spots s
          SET geometry = r.geometry, "spotTypeId" = r."spotTypeId", name = r.name,
              description = r.description, "elevationMeters" = r."elevationMeters",
              "lastEditedById" = r."editorId", "approvedRevisionId" = r.id, "updatedAt" = ${now}
          FROM spot_revisions r
          WHERE r.id = ${previous.id} AND s.id = ${spotId}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE spots SET "approvedRevisionId" = NULL, "updatedAt" = ${now} WHERE id = ${spotId}
        `;
      }
      await this.recomputeStatus(tx, spotId, true);
    });

    return { reportedRevisionId: reported.id, reportedEditorId: reported.editorId };
  }

  async listRevisions(spotId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<(SpotRevisionSummary & { approveCount: number; rejectCount: number; threshold: number })[]> {
    await this.get(spotId);
    const revisions = await this.prisma.spotRevision.findMany({
      where: { spotId, approvalStatus: status },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        editorId: true,
        editSummary: true,
        isSafetyCriticalEdit: true,
        approvalStatus: true,
        resolvedAt: true,
        resolvedById: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
    return this.withVoteCounts(revisions);
  }

  async getRevision(spotId: string, version: number): Promise<SpotRevisionDetail & { approveCount: number; rejectCount: number; threshold: number }> {
    const rows = await this.prisma.$queryRaw<SpotRevisionDetail[]>`
      SELECT id, "spotId", version, ST_AsGeoJSON(geometry)::json AS geometry, "spotTypeId",
             name, description, "elevationMeters", "editSummary", "isSafetyCriticalEdit",
             "approvalStatus", "resolvedAt", "resolvedById", "rejectionReason",
             "editorId", "createdAt"
      FROM spot_revisions
      WHERE "spotId" = ${spotId} AND version = ${version}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Revision ${version} not found for this spot`);
    }
    const [withCounts] = await this.withVoteCounts([rows[0]]);
    return withCounts;
  }

  // MILESTONE_3.md §9.1 - mirrors AdventurePagesService.withVoteCounts.
  private async withVoteCounts<T extends { id: string; approvalStatus: string }>(
    revisions: T[],
  ): Promise<(T & { approveCount: number; rejectCount: number; threshold: number })[]> {
    const threshold = this.settings.getNumber('approval.threshold');
    return Promise.all(
      revisions.map(async (revision) => {
        if (revision.approvalStatus !== 'PENDING') {
          return { ...revision, approveCount: 0, rejectCount: 0, threshold };
        }
        const [approveCount, rejectCount] = await Promise.all([
          this.prisma.spotConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
          this.prisma.spotConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
        ]);
        return { ...revision, approveCount, rejectCount, threshold };
      }),
    );
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

  // Now pending-gated like any other edit, via update().
  async revert(spotId: string, editorId: string, version: number): Promise<SpotRevisionDetail> {
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
               s."verificationStatus", s."approvedRevisionId", s."pendingRevisionCount", s."isActive",
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
