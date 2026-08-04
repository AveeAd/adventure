import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { isApprovalEligible } from './approval-rules.util';

export type PendingRevisionTargetType = 'ADVENTURE_PAGE' | 'TRAIL' | 'SPOT';

export interface PendingRevisionRow {
  targetType: PendingRevisionTargetType;
  targetId: string;
  targetName: string | null;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  districtIds: string[];
  revisionId: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: Date;
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

// MILESTONE_3.md §9.1/§10 (Phase 22): the review queue Phase 21 didn't build
// - a single cross-type read over PageRevision/TrailRevision/SpotRevision,
// since the per-target listRevisions() endpoints require already knowing the
// target id. Three separate raw queries (one per content type), merged and
// sorted in memory, mirroring AdventurePagesService.listTrending's precedent
// for "score/merge in JS rather than a query Prisma can't express cleanly."
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async assertCanViewQueue(user: AuthenticatedUser): Promise<void> {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      return;
    }
    const profile = await this.prisma.guideProfile.findUnique({
      where: { userId: user.userId },
      select: { guideLevel: true },
    });
    const minGuideLevel = this.settings.getNumber('approval.minGuideLevel');
    if (!isApprovalEligible(user.role, profile?.guideLevel ?? 1, minGuideLevel)) {
      throw new ForbiddenException(`Guide level ${minGuideLevel}+ is required to view the review queue`);
    }
  }

  async listPending(
    user: AuthenticatedUser,
    filters: { type?: PendingRevisionTargetType; districtId?: string; page?: number; pageSize?: number },
  ): Promise<{ data: PendingRevisionRow[]; total: number; page: number; pageSize: number }> {
    await this.assertCanViewQueue(user);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const districtId = filters.districtId ?? null;

    const [pages, trails, spots] = await Promise.all([
      !filters.type || filters.type === 'ADVENTURE_PAGE' ? this.pendingPages(districtId) : [],
      !filters.type || filters.type === 'TRAIL' ? this.pendingTrails(districtId) : [],
      !filters.type || filters.type === 'SPOT' ? this.pendingSpots(districtId) : [],
    ]);

    const threshold = this.settings.getNumber('approval.threshold');
    const merged = [...pages, ...trails, ...spots]
      .map((row) => ({ ...row, threshold }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const total = merged.length;
    const data = merged.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return { data, total, page, pageSize };
  }

  private async pendingPages(districtId: string | null): Promise<Omit<PendingRevisionRow, 'threshold'>[]> {
    const rows = await this.prisma.$queryRaw<
      Omit<PendingRevisionRow, 'threshold' | 'districtIds'>[]
    >`
      SELECT 'ADVENTURE_PAGE' AS "targetType", ap.id AS "targetId", ap.title AS "targetName",
             ap.id AS "pageId", ap.slug AS "pageSlug", ap.title AS "pageTitle",
             pr.id AS "revisionId", pr.version, pr."editorId", pr."editSummary",
             pr."isSafetyCriticalEdit", pr."createdAt",
             COALESCE(SUM(CASE WHEN pc.decision = 'APPROVE' THEN 1 ELSE 0 END), 0)::int AS "approveCount",
             COALESCE(SUM(CASE WHEN pc.decision = 'REJECT' THEN 1 ELSE 0 END), 0)::int AS "rejectCount"
      FROM page_revisions pr
      JOIN adventure_pages ap ON ap.id = pr."adventurePageId"
      LEFT JOIN page_confirmations pc ON pc."revisionId" = pr.id
      WHERE pr."approvalStatus" = 'PENDING'
        AND (${districtId}::text IS NULL OR EXISTS (
          SELECT 1 FROM adventure_page_districts d WHERE d."adventurePageId" = ap.id AND d."districtId" = ${districtId}
        ))
      GROUP BY ap.id, ap.title, ap.slug, pr.id, pr.version, pr."editorId", pr."editSummary", pr."isSafetyCriticalEdit", pr."createdAt"
    `;
    return this.withDistrictIds(rows, 'ADVENTURE_PAGE');
  }

  private async pendingTrails(districtId: string | null): Promise<Omit<PendingRevisionRow, 'threshold'>[]> {
    const rows = await this.prisma.$queryRaw<
      Omit<PendingRevisionRow, 'threshold' | 'districtIds'>[]
    >`
      SELECT 'TRAIL' AS "targetType", t.id AS "targetId", tr.name AS "targetName",
             ap.id AS "pageId", ap.slug AS "pageSlug", ap.title AS "pageTitle",
             tr.id AS "revisionId", tr.version, tr."editorId", tr."editSummary",
             tr."isSafetyCriticalEdit", tr."createdAt",
             COALESCE(SUM(CASE WHEN tc.decision = 'APPROVE' THEN 1 ELSE 0 END), 0)::int AS "approveCount",
             COALESCE(SUM(CASE WHEN tc.decision = 'REJECT' THEN 1 ELSE 0 END), 0)::int AS "rejectCount"
      FROM trail_revisions tr
      JOIN trails t ON t.id = tr."trailId"
      JOIN adventure_pages ap ON ap.id = t."adventurePageId"
      LEFT JOIN trail_confirmations tc ON tc."revisionId" = tr.id
      WHERE tr."approvalStatus" = 'PENDING'
        AND (${districtId}::text IS NULL OR EXISTS (
          SELECT 1 FROM adventure_page_districts d WHERE d."adventurePageId" = ap.id AND d."districtId" = ${districtId}
        ))
      GROUP BY t.id, tr.name, ap.id, ap.slug, ap.title, tr.id, tr.version, tr."editorId", tr."editSummary", tr."isSafetyCriticalEdit", tr."createdAt"
    `;
    return this.withDistrictIds(rows, 'TRAIL');
  }

  private async pendingSpots(districtId: string | null): Promise<Omit<PendingRevisionRow, 'threshold'>[]> {
    const rows = await this.prisma.$queryRaw<
      Omit<PendingRevisionRow, 'threshold' | 'districtIds'>[]
    >`
      SELECT 'SPOT' AS "targetType", s.id AS "targetId", sr.name AS "targetName",
             ap.id AS "pageId", ap.slug AS "pageSlug", ap.title AS "pageTitle",
             sr.id AS "revisionId", sr.version, sr."editorId", sr."editSummary",
             sr."isSafetyCriticalEdit", sr."createdAt",
             COALESCE(SUM(CASE WHEN sc.decision = 'APPROVE' THEN 1 ELSE 0 END), 0)::int AS "approveCount",
             COALESCE(SUM(CASE WHEN sc.decision = 'REJECT' THEN 1 ELSE 0 END), 0)::int AS "rejectCount"
      FROM spot_revisions sr
      JOIN spots s ON s.id = sr."spotId"
      JOIN adventure_pages ap ON ap.id = s."adventurePageId"
      LEFT JOIN spot_confirmations sc ON sc."revisionId" = sr.id
      WHERE sr."approvalStatus" = 'PENDING'
        AND (${districtId}::text IS NULL OR EXISTS (
          SELECT 1 FROM adventure_page_districts d WHERE d."adventurePageId" = ap.id AND d."districtId" = ${districtId}
        ))
      GROUP BY s.id, sr.name, ap.id, ap.slug, ap.title, sr.id, sr.version, sr."editorId", sr."editSummary", sr."isSafetyCriticalEdit", sr."createdAt"
    `;
    return this.withDistrictIds(rows, 'SPOT');
  }

  // districtIds is informational (chips on the queue row) - a second small
  // query per branch rather than folding array_agg into the GROUP BY above,
  // which would force every other selected column into the GROUP BY too.
  private async withDistrictIds(
    rows: Omit<PendingRevisionRow, 'threshold' | 'districtIds'>[],
    targetType: PendingRevisionTargetType,
  ): Promise<Omit<PendingRevisionRow, 'threshold'>[]> {
    if (rows.length === 0) {
      return [];
    }
    const pageIds = [...new Set(rows.map((r) => r.pageId))];
    const districtRows = await this.prisma.adventurePageDistrict.findMany({
      where: { adventurePageId: { in: pageIds } },
      select: { adventurePageId: true, districtId: true },
    });
    const byPage = new Map<string, string[]>();
    for (const d of districtRows) {
      byPage.set(d.adventurePageId, [...(byPage.get(d.adventurePageId) ?? []), d.districtId]);
    }
    return rows.map((row) => ({ ...row, targetType, districtIds: byPage.get(row.pageId) ?? [] }));
  }
}
