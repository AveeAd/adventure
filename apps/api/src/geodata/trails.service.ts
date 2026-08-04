import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, NotificationType, Prisma, Role, TrailElevationProfile } from '@prisma/client';
import { randomUUID } from 'crypto';
import { deriveVerificationStatus, isApprovalEligible, resolveVoteOutcome } from '../approvals/approval-rules.util';
import { ContributionsService } from '../contributions/contributions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { assertWithinNepal, buildSamples, computeAggregates, simplifyPoints, TrackAggregates } from '../tracks/track-geometry.util';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateTrailDto } from './dto/create-trail.dto';
import { deriveDistrictTags } from './district-derivation.util';
import { UpdateTrailDto } from './dto/update-trail.dto';

export interface TrailRow {
  id: string;
  adventurePageId: string;
  name: string | null;
  geometry: unknown;
  distanceMeters: number | null;
  source: string;
  verificationStatus: string;
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
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
  approvalStatus: string;
  resolvedAt: Date | null;
  resolvedById: string | null;
  rejectionReason: string | null;
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
    private readonly contributions: ContributionsService,
    private readonly settings: SettingsService,
  ) {}

  // LEFT JOINs the elevation profile - unlike get(id)'s explicit extra
  // select, this list backs the adventure page view, which needs every
  // trail's chart/ascent-descent figures up front (see TRAIL_ELEVATION.md's
  // public UI section), so a per-trail follow-up fetch would be worse.
  async listForPage(pageId: string): Promise<TrailListRow[]> {
    return this.prisma.$queryRaw<TrailListRow[]>`
      SELECT t.id, t."adventurePageId", t.name, ST_AsGeoJSON(t.geometry)::json AS geometry,
             t."distanceMeters", t.source, t."verificationStatus",
             t."approvedRevisionId", t."pendingRevisionCount", t."isActive",
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
  async get(id: string): Promise<TrailRow & { elevationProfile: TrailElevationProfile | null; approvedRevision: TrailRevisionDetail | null }> {
    const rows = await this.prisma.$queryRaw<TrailRow[]>`
      SELECT id, "adventurePageId", name, ST_AsGeoJSON(geometry)::json AS geometry,
             "distanceMeters", source, "verificationStatus",
             "approvedRevisionId", "pendingRevisionCount", "isActive",
             "createdById", "lastEditedById", "createdAt", "updatedAt"
      FROM trails
      WHERE id = ${id}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Trail ${id} not found`);
    }
    const elevationProfile = await this.prisma.trailElevationProfile.findUnique({ where: { trailId: id } });
    // MILESTONE_3.md §9.1: the live row's own name/geometry/distanceMeters
    // stay whatever the last *approved* revision wrote (see applyApproval),
    // so they already reflect the approved version - approvedRevision here
    // is only needed so the frontend can diff against a version number.
    const approvedRevision = rows[0].approvedRevisionId
      ? await this.getRevisionById(rows[0].approvedRevisionId)
      : null;
    return { ...rows[0], elevationProfile, approvedRevision };
  }

  private async getRevisionById(revisionId: string): Promise<TrailRevisionDetail> {
    const rows = await this.prisma.$queryRaw<TrailRevisionDetail[]>`
      SELECT id, "trailId", version, ST_AsGeoJSON(geometry)::json AS geometry, name,
             "distanceMeters", "editSummary", "isSafetyCriticalEdit", "approvalStatus",
             "resolvedAt", "resolvedById", "rejectionReason", "editorId", "createdAt"
      FROM trail_revisions
      WHERE id = ${revisionId}
    `;
    return rows[0];
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
  // promote-to-trail flow passes RECORDED_ACTIVITY instead. When a trail
  // already exists for this page, the "create" is really an edit and goes
  // through update() - which, under MILESTONE_3.md's approval gate, now
  // returns a pending TrailRevisionDetail rather than the live TrailRow.
  async create(pageId: string, userId: string, dto: CreateTrailDto, source: 'DRAWN' | 'RECORDED_ACTIVITY' = 'DRAWN'): Promise<TrailRow | TrailRevisionDetail> {
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

    // MILESTONE_3.md §3.2: points are awarded on approval, not on submit -
    // v1 sits PENDING like any other revision, GEO_CREATE moves to
    // applyApproval().
    return this.get(id);
  }

  // MILESTONE_3.md §5.2: the significant refactor. Under the approval gate
  // an edit writes only a new PENDING TrailRevision - it never touches the
  // live trails row (geometry/name/distanceMeters/verificationStatus), which
  // only changes when a revision is later approved (applyApproval). The new
  // revision's unspecified fields are COALESCEd against the *latest existing
  // revision* (pending or approved), not the live row, since the live row
  // can now lag behind a still-pending edit.
  //
  // Elevation-profile invalidation stays here, immediate and ungated, same
  // as before this phase - TRAIL_ELEVATION.md never made it part of the
  // revision/confirmation trust model (it's a derived "sidecar", not
  // reviewable content), and its source data (per-point elevation) only
  // exists transiently at submit time, not in the stored 2D geometry, so it
  // cannot be reconstructed later at approval time. deriveDistrictTags is
  // the same kind of additive-only derived metadata (FEATURE.md §4) and
  // stays ungated for the same reason.
  async update(id: string, userId: string, dto: UpdateTrailDto): Promise<TrailRevisionDetail> {
    const existing = await this.get(id);
    const now = new Date();
    const revisionId = randomUUID();

    const baseRows = await this.prisma.$queryRaw<{ version: number; name: string | null; geometryText: string }[]>`
      SELECT version, name, ST_AsGeoJSON(geometry) AS "geometryText"
      FROM trail_revisions WHERE "trailId" = ${id} ORDER BY version DESC LIMIT 1
    `;
    const base = baseRows[0];
    if (!base) {
      throw new NotFoundException(`Trail ${id} has no revisions to edit`);
    }
    const nextVersion = base.version + 1;
    const geojson = dto.geometry ? JSON.stringify(dto.geometry) : base.geometryText;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        VALUES (
          ${revisionId}, ${id}, ${nextVersion},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
          COALESCE(${dto.name ?? null}, ${base?.name ?? null}),
          COALESCE(${dto.distanceMeters ?? null}, ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography)::int),
          ${dto.editSummary ?? null}, ${dto.isSafetyCriticalEdit ?? false}, ${userId}, ${now}
        )
      `;

      if (dto.geometry) {
        await tx.trailElevationProfile.deleteMany({ where: { trailId: id } });
        await deriveDistrictTags(tx, 'trails', id, existing.adventurePageId);
      }

      await this.recomputeStatus(tx, id);
    });

    return this.getRevision(id, nextVersion);
  }

  async delete(id: string): Promise<TrailRow> {
    await this.get(id);
    await this.prisma.$executeRaw`UPDATE trails SET "isActive" = false WHERE id = ${id}`;
    return this.get(id);
  }

  // MILESTONE_3.md §5.3: casts an APPROVE/REJECT vote on a specific pending
  // revision. Replaces the retired confirm()/CONFIRMATION_THRESHOLD flow.
  async voteOnRevision(trailId: string, version: number, voterId: string, voterRole: Role, dto: CastVoteDto) {
    const revision = await this.prisma.trailRevision.findUnique({
      where: { trailId_version: { trailId, version } },
    });
    if (!revision) {
      throw new NotFoundException(`Revision ${version} not found for this trail`);
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

    const existingVote = await this.prisma.trailConfirmation.findUnique({
      where: { revisionId_userId: { revisionId: revision.id, userId: voterId } },
    });
    await this.prisma.trailConfirmation.upsert({
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
      this.prisma.trailConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
      this.prisma.trailConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
    ]);
    const threshold = this.settings.getNumber('approval.threshold');
    const outcome = resolveVoteOutcome(dto.decision, isAdminOrMod, approveCount, rejectCount, threshold);

    if (outcome === 'APPROVED') {
      await this.applyApproval(trailId, revision, voterId);
    } else if (outcome === 'REJECTED') {
      await this.applyRejection(trailId, revision, voterId, dto.rejectionReason);
    }

    return { revisionId: revision.id, outcome, approveCount, rejectCount, threshold };
  }

  // Applies the winning revision's snapshot to the live row - this is the
  // one point where geometry/name/distanceMeters actually go live, per
  // MILESTONE_3.md §5.2.
  private async applyApproval(
    trailId: string,
    revision: { id: string; version: number; editorId: string },
    approverId: string,
  ): Promise<void> {
    const before = await this.get(trailId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.trailRevision.update({
        where: { id: revision.id },
        data: { approvalStatus: 'APPROVED', resolvedAt: now, resolvedById: approverId },
      });
      await tx.trailRevision.updateMany({
        where: { trailId, approvalStatus: 'PENDING', version: { lt: revision.version } },
        data: { approvalStatus: 'REJECTED', resolvedAt: now, resolvedById: approverId, rejectionReason: 'SUPERSEDED' },
      });

      await tx.$executeRaw`
        UPDATE trails t
        SET geometry = r.geometry, name = r.name, "distanceMeters" = r."distanceMeters",
            "lastEditedById" = r."editorId", "approvedRevisionId" = r.id, "updatedAt" = ${now}
        FROM trail_revisions r
        WHERE r.id = ${revision.id} AND t.id = ${trailId}
      `;

      await this.recomputeStatus(tx, trailId);
    });

    // MILESTONE_3.md §3.2: v1 always pays GEO_CREATE; later versions pay
    // GEO_UPDATE only when the editor differs from the trail's creator.
    if (revision.version === 1) {
      await this.contributions.award({
        userId: revision.editorId,
        reason: ContributionReason.GEO_CREATE,
        targetType: ContributionTargetType.TRAIL,
        targetId: trailId,
      });
    } else if (before.createdById !== revision.editorId) {
      await this.contributions.award({
        userId: revision.editorId,
        reason: ContributionReason.GEO_UPDATE,
        targetType: ContributionTargetType.TRAIL_REVISION,
        targetId: revision.id,
      });
    }

    const after = await this.get(trailId);
    if (before.verificationStatus !== 'VERIFIED' && after.verificationStatus === 'VERIFIED') {
      const page = await this.prisma.adventurePage.findUnique({
        where: { id: before.adventurePageId },
        select: { slug: true },
      });
      await this.notifications.notify(
        before.createdById,
        approverId,
        NotificationType.TRAIL_VERIFIED,
        `"${after.name ?? 'Your trail'}" was confirmed as accurate`,
        page ? `/adventures/${page.slug}` : undefined,
      );
    }
  }

  private async applyRejection(
    trailId: string,
    revision: { id: string },
    approverId: string,
    rejectionReason: string | undefined,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.trailRevision.update({
        where: { id: revision.id },
        data: {
          approvalStatus: 'REJECTED',
          resolvedAt: new Date(),
          resolvedById: approverId,
          rejectionReason: rejectionReason ?? null,
        },
      });
      await this.recomputeStatus(tx, trailId);
    });
  }

  // Recomputes pendingRevisionCount + the derived verificationStatus for a
  // trail, inside the caller's transaction - mirrors
  // AdventurePagesService.recomputeStatus, in raw SQL since Trail's geometry
  // column is Unsupported and most of this service already talks to the
  // trails/trail_revisions tables directly.
  private async recomputeStatus(tx: Prisma.TransactionClient, trailId: string): Promise<void> {
    const trailRows = await tx.$queryRaw<{ approvedRevisionId: string | null }[]>`
      SELECT "approvedRevisionId" FROM trails WHERE id = ${trailId}
    `;
    const latestRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM trail_revisions WHERE "trailId" = ${trailId} ORDER BY version DESC LIMIT 1
    `;
    const pending = await tx.$queryRaw<{ isSafetyCriticalEdit: boolean }[]>`
      SELECT "isSafetyCriticalEdit" FROM trail_revisions WHERE "trailId" = ${trailId} AND "approvalStatus" = 'PENDING'
    `;
    const verificationStatus = deriveVerificationStatus(trailRows[0]?.approvedRevisionId ?? null, latestRows[0].id, pending);
    await tx.$executeRaw`
      UPDATE trails SET "pendingRevisionCount" = ${pending.length}, "verificationStatus" = ${verificationStatus}::"GeoVerificationStatus"
      WHERE id = ${trailId}
    `;
  }

  async listRevisions(trailId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<(TrailRevisionSummary & { approveCount: number; rejectCount: number; threshold: number })[]> {
    await this.get(trailId);
    const revisions = await this.prisma.trailRevision.findMany({
      where: { trailId, approvalStatus: status },
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

  async getRevision(trailId: string, version: number): Promise<TrailRevisionDetail & { approveCount: number; rejectCount: number; threshold: number }> {
    const rows = await this.prisma.$queryRaw<TrailRevisionDetail[]>`
      SELECT id, "trailId", version, ST_AsGeoJSON(geometry)::json AS geometry, name,
             "distanceMeters", "editSummary", "isSafetyCriticalEdit", "approvalStatus",
             "resolvedAt", "resolvedById", "rejectionReason", "editorId", "createdAt"
      FROM trail_revisions
      WHERE "trailId" = ${trailId} AND version = ${version}
    `;
    if (rows.length === 0) {
      throw new NotFoundException(`Revision ${version} not found for this trail`);
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
          this.prisma.trailConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
          this.prisma.trailConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
        ]);
        return { ...revision, approveCount, rejectCount, threshold };
      }),
    );
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
  // delete or pointer move, per FEATURE.md §3's revert convention. Now
  // pending-gated like any other edit, via update().
  async revert(trailId: string, editorId: string, version: number): Promise<TrailRevisionDetail> {
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
               t."verificationStatus", t."approvedRevisionId", t."pendingRevisionCount", t."isActive",
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
  ): Promise<(TrailRow & { elevationProfile: TrailElevationProfile | null }) | TrailRevisionDetail> {
    assertWithinNepal(points);
    const simplified = simplifyPoints(points, 5);
    const geometry = { type: 'LineString' as const, coordinates: simplified.map((p) => [p.lng, p.lat]) };
    const geojson = JSON.stringify(geometry);
    const aggregates = computeAggregates(points);
    const hasElevation = aggregates.minElevationMeters !== null;

    const existingId = await this.findActiveTrailId(pageId);
    if (existingId) {
      return this.replaceGeometryFromGpx(existingId, userId, name, geojson, aggregates, hasElevation, points);
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

    // MILESTONE_3.md §3.2: points move to approval - no award here.
    return this.get(id);
  }

  // Re-importing a GPX for a page that already has a trail replaces its
  // geometry via a new PENDING TrailRevision, mirroring update()'s gated
  // shape, instead of importGpx() inserting a second Trail row. Elevation-
  // profile handling stays immediate/ungated - see update()'s comment for why.
  private async replaceGeometryFromGpx(
    trailId: string,
    userId: string,
    name: string | undefined,
    geojson: string,
    aggregates: TrackAggregates,
    hasElevation: boolean,
    points: { lng: number; lat: number; ele?: number }[],
  ): Promise<TrailRevisionDetail> {
    const existing = await this.get(trailId);
    const now = new Date();
    const revisionId = randomUUID();

    const baseRows = await this.prisma.$queryRaw<{ version: number }[]>`
      SELECT version FROM trail_revisions WHERE "trailId" = ${trailId} ORDER BY version DESC LIMIT 1
    `;
    const nextVersion = (baseRows[0]?.version ?? 0) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO trail_revisions (
          id, "trailId", version, geometry, name, "distanceMeters",
          "editSummary", "isSafetyCriticalEdit", "editorId", "createdAt"
        )
        VALUES (
          ${revisionId}, ${trailId}, ${nextVersion},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
          ${name ?? null}, ${aggregates.distanceMeters},
          'Replaced via GPX re-import', false, ${userId}, ${now}
        )
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

      await deriveDistrictTags(tx, 'trails', trailId, existing.adventurePageId);
      await this.recomputeStatus(tx, trailId);
    });

    return this.getRevision(trailId, nextVersion);
  }

  // admin-only escape hatch for a bad import - deletes the profile without
  // touching the trail.
  async deleteElevationProfile(trailId: string): Promise<void> {
    await this.get(trailId);
    await this.prisma.trailElevationProfile.deleteMany({ where: { trailId } });
  }
}
