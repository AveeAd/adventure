import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, NotificationType, PageRevision, PageVerificationStatus, Prisma, Role } from '@prisma/client';
import { diffLines } from 'diff';
import { deriveVerificationStatus, isApprovalEligible, resolveVoteOutcome } from '../approvals/approval-rules.util';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContributionsService } from '../contributions/contributions.service';
import { slugify } from '../common/slugify';
import { SpotsService } from '../geodata/spots.service';
import { TrailsService } from '../geodata/trails.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { UploadsService } from '../uploads/uploads.service';
import { AddMediaDto } from './dto/add-media.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateAdventurePageDto } from './dto/create-adventure-page.dto';
import { SubmitRevisionDto } from './dto/submit-revision.dto';
import { UpdateAdventurePageMetadataDto } from './dto/update-adventure-page-metadata.dto';

@Injectable()
export class AdventurePagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly uploads: UploadsService,
    private readonly contributions: ContributionsService,
    private readonly settings: SettingsService,
    private readonly trails: TrailsService,
    private readonly spots: SpotsService,
  ) {}

  async list(page = 1, pageSize = 20, sort: 'recent' | 'popular' | 'trending' = 'recent') {
    const where = { isActive: true };

    if (sort === 'trending') {
      return this.listTrending(page, pageSize, where);
    }

    const orderBy =
      sort === 'popular'
        ? [{ likes: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
        : { createdAt: 'desc' as const };
    const [data, total] = await Promise.all([
      this.prisma.adventurePage.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          activityType: true,
          difficultyLevel: true,
          media: { where: { isActive: true }, take: 1, orderBy: { sortOrder: 'asc' } },
          tags: { include: { tag: true } },
          _count: { select: { likes: true } },
        },
      }),
      this.prisma.adventurePage.count({ where }),
    ]);
    return {
      data: data.map(({ _count, ...page }) => ({ ...page, likeCount: _count.likes })),
      total,
      page,
      pageSize,
    };
  }

  // "Trending" = recent views (last 7 days) + total likes, equal weight -
  // a simple, explainable heuristic, not a real analytics pipeline. Prisma's
  // relation-count orderBy can't filter the counted relation by date *and*
  // combine it with a second, differently-filtered count in one query, so
  // this scores and sorts in memory instead of in SQL - fine at this site's
  // scale (see DATABASE.md's "revisit if it becomes a problem" convention).
  private async listTrending(page: number, pageSize: number, where: { isActive: boolean }) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pages = await this.prisma.adventurePage.findMany({
      where,
      include: {
        activityType: true,
        difficultyLevel: true,
        media: { where: { isActive: true }, take: 1, orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
        _count: { select: { likes: true, views: { where: { createdAt: { gte: sevenDaysAgo } } } } },
      },
    });

    const scored = pages
      .map(({ _count, ...page }) => ({
        ...page,
        likeCount: _count.likes,
        trendingScore: _count.views + _count.likes,
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore || b.createdAt.getTime() - a.createdAt.getTime());

    const total = scored.length;
    const data = scored
      .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      .map(({ trendingScore: _trendingScore, ...page }) => page);

    return { data, total, page, pageSize };
  }

  // searchVector is trigger-maintained (title + summary + latest revision
  // content) - see migration 20260729080000_search_and_notifications
  async search(query: string, page = 1, pageSize = 20) {
    const trimmed = query.trim();
    if (!trimmed) {
      return { data: [], total: 0, page, pageSize };
    }
    const offset = (page - 1) * pageSize;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        slug: string;
        summary: string | null;
        verificationStatus: string;
        activityTypeName: string | null;
        total: bigint;
      }>
    >`
      SELECT ap.id, ap.title, ap.slug, ap.summary, ap."verificationStatus",
             at.name AS "activityTypeName",
             count(*) OVER() AS total
      FROM adventure_pages ap
      LEFT JOIN activity_types at ON at.id = ap."activityTypeId"
      WHERE ap."isActive" = true
        AND ap."searchVector" @@ plainto_tsquery('english', ${trimmed})
      ORDER BY ts_rank(ap."searchVector", plainto_tsquery('english', ${trimmed})) DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const total = rows.length ? Number(rows[0].total) : 0;
    const data = rows.map(({ total: _total, ...row }) => row);
    return { data, total, page, pageSize };
  }

  async getBySlug(slug: string, currentUserId?: string) {
    const page = await this.prisma.adventurePage.findUnique({ where: { slug }, select: { id: true } });
    if (!page) {
      throw new NotFoundException(`Adventure page "${slug}" not found`);
    }
    return this.get(page.id, currentUserId);
  }

  async get(id: string, currentUserId?: string) {
    const page = await this.prisma.adventurePage.findUnique({
      where: { id },
      include: {
        activityType: true,
        difficultyLevel: true,
        districts: { include: { district: true } },
        seasons: { include: { season: true } },
        media: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
        relatedTo: {
          include: {
            relatedPage: {
              select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                verificationStatus: true,
                durationMinDays: true,
                durationMaxDays: true,
                activityType: { select: { name: true } },
                difficultyLevel: { select: { name: true } },
                media: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  select: { url: true, altText: true },
                },
              },
            },
          },
        },
        _count: { select: { likes: true, visits: true } },
      },
    });
    if (!page) {
      throw new NotFoundException(`Adventure page ${id} not found`);
    }

    const currentRevision = await this.prisma.pageRevision.findFirst({
      where: { adventurePageId: id },
      orderBy: { version: 'desc' },
    });

    // MILESTONE_3.md §9.1 read model: approvedRevision (not currentRevision)
    // is what the public UI renders by default; currentRevision stays
    // available so a "N unapproved changes" control can compare against it.
    const approvedRevision = page.approvedRevisionId
      ? await this.prisma.pageRevision.findUnique({ where: { id: page.approvedRevisionId } })
      : null;

    const contributorRows = await this.prisma.pageRevision.findMany({
      where: { adventurePageId: id },
      distinct: ['editorId'],
      select: { editorId: true },
    });

    const likedByMe = currentUserId
      ? !!(await this.prisma.adventurePageLike.findUnique({
          where: { adventurePageId_userId: { adventurePageId: id, userId: currentUserId } },
        }))
      : false;

    const visitedByMe = currentUserId
      ? !!(await this.prisma.adventurePageVisit.findUnique({
          where: { adventurePageId_userId: { adventurePageId: id, userId: currentUserId } },
        }))
      : false;

    const { _count, relatedTo, ...rest } = page;
    return {
      ...rest,
      currentRevision,
      approvedRevision,
      contributorIds: contributorRows.map((row) => row.editorId),
      likeCount: _count.likes,
      likedByMe,
      visitCount: _count.visits,
      visitedByMe,
      relatedPages: relatedTo.map((r) => r.relatedPage),
    };
  }

  // Slugs are server-generated from the title, never user-supplied - a
  // contributor has no way to know which slugs are already taken, so asking
  // them to pick one is just a validation error waiting to happen.
  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'page';
    const existing = await this.prisma.adventurePage.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    const taken = new Set(existing.map((p) => p.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  // dto.trail/dto.spots (optional) let the public "create adventure" form
  // submit the page plus its initial trail and spots as one request - all
  // created in this same transaction, so a contributor never ends up with a
  // page but no trail/spots because a later, separate request failed.
  async create(authorId: string, dto: CreateAdventurePageDto) {
    const slug = await this.generateUniqueSlug(dto.title);
    const result = await this.prisma.$transaction(async (tx) => {
      const page = await tx.adventurePage.create({
        data: {
          title: dto.title,
          slug,
          summary: dto.summary,
          activityTypeId: dto.activityTypeId,
          difficultyLevelId: dto.difficultyLevelId,
          durationMinDays: dto.durationMinDays,
          durationMaxDays: dto.durationMaxDays,
          maxAltitudeMeters: dto.maxAltitudeMeters,
          districts: dto.districtIds?.length
            ? { create: dto.districtIds.map((districtId) => ({ districtId })) }
            : undefined,
          seasons: dto.seasonIds?.length
            ? { create: dto.seasonIds.map((seasonId) => ({ seasonId })) }
            : undefined,
          tags: dto.tagIds?.length ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
        },
      });

      const revision = await tx.pageRevision.create({
        data: {
          adventurePageId: page.id,
          version: 1,
          content: dto.content,
          editorId: authorId,
        },
      });

      const trailId = dto.trail ? await this.trails.createInTransaction(tx, page.id, authorId, dto.trail) : null;
      const spotIds = dto.spots
        ? await Promise.all(dto.spots.map((spotDto) => this.spots.createInTransaction(tx, page.id, authorId, spotDto)))
        : [];

      return { ...page, currentRevision: revision, trailId, spotIds };
    });

    const { trailId, spotIds, ...page } = result;
    const [trail, spots] = await Promise.all([
      trailId ? this.trails.get(trailId) : null,
      Promise.all(spotIds.map((id) => this.spots.get(id))),
    ]);

    // MILESTONE_3.md §3.2: points are awarded on approval, not on submit -
    // v1 sits PENDING like any other revision (§5.2), the PAGE_CREATE award
    // moves to applyApproval().
    return { ...page, trail, spots };
  }

  async updateMetadata(id: string, dto: UpdateAdventurePageMetadataDto) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.districtIds) {
        // Narrowed to source: MANUAL - a wholesale delete here would
        // silently wipe FEATURE.md §4's spatially-derived DERIVED tags on
        // every metadata edit. Required fix, not optional, per that design.
        await tx.adventurePageDistrict.deleteMany({ where: { adventurePageId: id, source: 'MANUAL' } });
        // Upsert, not createMany: a district a contributor now hand-picks
        // may already have a DERIVED row from geometry - "MANUAL always
        // wins" means that collision upgrades the row to MANUAL rather
        // than erroring on the unique constraint or staying DERIVED forever.
        for (const districtId of dto.districtIds) {
          await tx.adventurePageDistrict.upsert({
            where: { adventurePageId_districtId: { adventurePageId: id, districtId } },
            create: { adventurePageId: id, districtId, source: 'MANUAL' },
            update: { source: 'MANUAL' },
          });
        }
      }

      if (dto.seasonIds) {
        await tx.adventurePageSeason.deleteMany({ where: { adventurePageId: id } });
        if (dto.seasonIds.length) {
          await tx.adventurePageSeason.createMany({
            data: dto.seasonIds.map((seasonId) => ({ adventurePageId: id, seasonId })),
          });
        }
      }

      if (dto.tagIds) {
        await tx.adventurePageTag.deleteMany({ where: { adventurePageId: id } });
        if (dto.tagIds.length) {
          await tx.adventurePageTag.createMany({
            data: dto.tagIds.map((tagId) => ({ adventurePageId: id, tagId })),
          });
        }
      }

      return tx.adventurePage.update({
        where: { id },
        data: {
          title: dto.title,
          summary: dto.summary,
          activityTypeId: dto.activityTypeId,
          difficultyLevelId: dto.difficultyLevelId,
          durationMinDays: dto.durationMinDays,
          durationMaxDays: dto.durationMaxDays,
          maxAltitudeMeters: dto.maxAltitudeMeters,
        },
      });
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    return this.prisma.adventurePage.update({ where: { id }, data: { isActive: false } });
  }

  // admin override - sets verificationStatus directly, bypassing the
  // confirmation-threshold/revision-reset flow normal users go through
  async updateVerificationStatus(id: string, status: PageVerificationStatus) {
    await this.ensureExists(id);
    return this.prisma.adventurePage.update({ where: { id }, data: { verificationStatus: status } });
  }

  async listRevisions(pageId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    await this.ensureExists(pageId);
    const revisions = await this.prisma.pageRevision.findMany({
      where: { adventurePageId: pageId, approvalStatus: status },
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

  async getRevision(pageId: string, version: number) {
    const revision = await this.prisma.pageRevision.findUnique({
      where: { adventurePageId_version: { adventurePageId: pageId, version } },
    });
    if (!revision) {
      throw new NotFoundException(`Revision ${version} not found for this page`);
    }
    const [withCounts] = await this.withVoteCounts([revision]);
    return withCounts;
  }

  // MILESTONE_3.md §9.1: the pending-revision diff view needs vote counts +
  // threshold to render "N of 5 approvals" alongside the vote buttons.
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
          this.prisma.pageConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
          this.prisma.pageConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
        ]);
        return { ...revision, approveCount, rejectCount, threshold };
      }),
    );
  }

  async diff(pageId: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.getRevision(pageId, fromVersion),
      this.getRevision(pageId, toVersion),
    ]);
    return {
      from: fromVersion,
      to: toVersion,
      changes: diffLines(from.content, to.content),
    };
  }

  // MILESTONE_3.md §5.2: writes only a new PENDING revision - the live page
  // row carries no content of its own (it's read via approvedRevision/
  // currentRevision), so no live-row mutation happens here at all; recomputeStatus
  // just keeps pendingRevisionCount/verificationStatus in sync.
  async submitRevision(pageId: string, editorId: string, dto: SubmitRevisionDto) {
    await this.ensureExists(pageId);

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.pageRevision.findFirst({
        where: { adventurePageId: pageId },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      const revision = await tx.pageRevision.create({
        data: {
          adventurePageId: pageId,
          version: nextVersion,
          content: dto.content,
          editSummary: dto.editSummary,
          isSafetyCriticalEdit: dto.isSafetyCriticalEdit ?? false,
          editorId,
        },
      });

      await this.recomputeStatus(tx, pageId);

      return revision;
    });
  }

  async revert(pageId: string, editorId: string, version: number) {
    const target = await this.getRevision(pageId, version);
    return this.submitRevision(pageId, editorId, {
      content: target.content,
      editSummary: `Reverted to version ${version}`,
    });
  }

  // MILESTONE_3.md §5.3: casts an APPROVE/REJECT vote on a specific pending
  // revision (there may be more than one pending at once, so this targets a
  // version rather than "the latest" the way the retired confirm() did).
  async voteOnRevision(pageId: string, version: number, voterId: string, voterRole: Role, dto: CastVoteDto) {
    const revision = await this.prisma.pageRevision.findUnique({
      where: { adventurePageId_version: { adventurePageId: pageId, version } },
    });
    if (!revision) {
      throw new NotFoundException(`Revision ${version} not found for this page`);
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

    const existingVote = await this.prisma.pageConfirmation.findUnique({
      where: { revisionId_userId: { revisionId: revision.id, userId: voterId } },
    });
    await this.prisma.pageConfirmation.upsert({
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
      this.prisma.pageConfirmation.count({ where: { revisionId: revision.id, decision: 'APPROVE' } }),
      this.prisma.pageConfirmation.count({ where: { revisionId: revision.id, decision: 'REJECT' } }),
    ]);
    const threshold = this.settings.getNumber('approval.threshold');
    const outcome = resolveVoteOutcome(dto.decision, isAdminOrMod, approveCount, rejectCount, threshold);

    if (outcome === 'APPROVED') {
      await this.applyApproval(pageId, revision, voterId);
    } else if (outcome === 'REJECTED') {
      await this.applyRejection(pageId, revision, voterId, dto.rejectionReason);
    }

    return { revisionId: revision.id, outcome, approveCount, rejectCount, threshold };
  }

  // Applies the winning revision - for pages there's no live-row content to
  // overwrite (see submitRevision's comment), so this is mostly bookkeeping:
  // supersede older pending revisions, flip approvedRevisionId, award points,
  // and notify contributors if this is the vote that reaches VERIFIED.
  private async applyApproval(pageId: string, revision: PageRevision, approverId: string): Promise<void> {
    const before = await this.prisma.adventurePage.findUniqueOrThrow({
      where: { id: pageId },
      select: { verificationStatus: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.pageRevision.update({
        where: { id: revision.id },
        data: { approvalStatus: 'APPROVED', resolvedAt: now, resolvedById: approverId },
      });
      await tx.pageRevision.updateMany({
        where: { adventurePageId: pageId, approvalStatus: 'PENDING', version: { lt: revision.version } },
        data: { approvalStatus: 'REJECTED', resolvedAt: now, resolvedById: approverId, rejectionReason: 'SUPERSEDED' },
      });
      await tx.adventurePage.update({ where: { id: pageId }, data: { approvedRevisionId: revision.id } });
      await this.recomputeStatus(tx, pageId);
    });

    // MILESTONE_3.md §3.2: v1 always pays PAGE_CREATE; later versions pay
    // PAGE_UPDATE only when the editor differs from v1's editor (self-edits
    // earn nothing).
    if (revision.version === 1) {
      await this.contributions.award({
        userId: revision.editorId,
        reason: ContributionReason.PAGE_CREATE,
        targetType: ContributionTargetType.ADVENTURE_PAGE,
        targetId: pageId,
      });
    } else {
      const v1 = await this.prisma.pageRevision.findUnique({
        where: { adventurePageId_version: { adventurePageId: pageId, version: 1 } },
        select: { editorId: true },
      });
      if (v1 && v1.editorId !== revision.editorId) {
        await this.contributions.award({
          userId: revision.editorId,
          reason: ContributionReason.PAGE_UPDATE,
          targetType: ContributionTargetType.PAGE_REVISION,
          targetId: revision.id,
        });
      }
    }

    const after = await this.prisma.adventurePage.findUnique({
      where: { id: pageId },
      select: { title: true, slug: true, verificationStatus: true },
    });
    if (after) {
      await this.notifications.notify(
        revision.editorId,
        approverId,
        NotificationType.CHANGE_APPROVED,
        `Your edit to "${after.title}" was approved`,
        `/adventures/${after.slug}`,
      );
    }
    if (after && before.verificationStatus !== 'VERIFIED' && after.verificationStatus === 'VERIFIED') {
      const contributorRows = await this.prisma.pageRevision.findMany({
        where: { adventurePageId: pageId },
        distinct: ['editorId'],
        select: { editorId: true },
      });
      await this.notifications.notifyMany(
        contributorRows.map((row) => row.editorId),
        approverId,
        NotificationType.PAGE_VERIFIED,
        `"${after.title}" was confirmed as verified`,
        `/adventures/${after.slug}`,
      );
    }
  }

  private async applyRejection(
    pageId: string,
    revision: PageRevision,
    approverId: string,
    rejectionReason: string | undefined,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.pageRevision.update({
        where: { id: revision.id },
        data: {
          approvalStatus: 'REJECTED',
          resolvedAt: new Date(),
          resolvedById: approverId,
          rejectionReason: rejectionReason ?? null,
        },
      });
      await this.recomputeStatus(tx, pageId);
    });

    const page = await this.prisma.adventurePage.findUnique({ where: { id: pageId }, select: { title: true, slug: true } });
    if (page) {
      await this.notifications.notify(
        revision.editorId,
        approverId,
        NotificationType.CHANGE_REJECTED,
        `Your edit to "${page.title}" was declined${rejectionReason ? `: ${rejectionReason}` : ''}`,
        `/adventures/${page.slug}`,
      );
    }
  }

  // Recomputes pendingRevisionCount + the derived verificationStatus for a
  // page, inside the caller's transaction - called after every revision
  // insert/approve/reject so the two never drift apart.
  private async recomputeStatus(
    tx: Prisma.TransactionClient,
    pageId: string,
    hasUpheldReport = false,
  ): Promise<void> {
    const page = await tx.adventurePage.findUniqueOrThrow({
      where: { id: pageId },
      select: { approvedRevisionId: true },
    });
    const latest = await tx.pageRevision.findFirst({
      where: { adventurePageId: pageId },
      orderBy: { version: 'desc' },
    });
    const pending = await tx.pageRevision.findMany({
      where: { adventurePageId: pageId, approvalStatus: 'PENDING' },
      select: { isSafetyCriticalEdit: true },
    });
    const verificationStatus = deriveVerificationStatus(page.approvedRevisionId, latest!.id, pending, hasUpheldReport);
    await tx.adventurePage.update({
      where: { id: pageId },
      data: { pendingRevisionCount: pending.length, verificationStatus },
    });
  }

  // MILESTONE_3.md §8: called from ReportsService when an upheld
  // PAGE_REVISION/ADVENTURE_PAGE report reverts the live page to whatever
  // was approved before the reported revision. Unlike Trail/Spot, a page's
  // live row carries no content of its own (see submitRevision's comment) -
  // "reverting" is just repointing approvedRevisionId, or clearing it back
  // to null if the reported revision was v1 and nothing earlier was ever
  // approved. Returns the reported revision's editor/id so the caller can
  // charge the PAGE_REPORT_UPHELD penalty.
  async revertToPreviousApproved(pageId: string): Promise<{ reportedRevisionId: string; reportedEditorId: string; reportedWasCreate: boolean }> {
    const page = await this.prisma.adventurePage.findUniqueOrThrow({
      where: { id: pageId },
      select: { approvedRevisionId: true },
    });
    if (!page.approvedRevisionId) {
      throw new BadRequestException('This page has no approved revision to revert');
    }
    const reported = await this.prisma.pageRevision.findUniqueOrThrow({
      where: { id: page.approvedRevisionId },
    });
    const previous = await this.prisma.pageRevision.findFirst({
      where: { adventurePageId: pageId, approvalStatus: 'APPROVED', version: { lt: reported.version } },
      orderBy: { version: 'desc' },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.adventurePage.update({
        where: { id: pageId },
        data: { approvedRevisionId: previous?.id ?? null },
      });
      await this.recomputeStatus(tx, pageId, true);
    });

    return { reportedRevisionId: reported.id, reportedEditorId: reported.editorId, reportedWasCreate: reported.version === 1 };
  }

  async like(pageId: string, userId: string) {
    await this.ensureExists(pageId);
    await this.prisma.adventurePageLike.upsert({
      where: { adventurePageId_userId: { adventurePageId: pageId, userId } },
      create: { adventurePageId: pageId, userId },
      update: {},
    });
    return this.likeCount(pageId);
  }

  async unlike(pageId: string, userId: string) {
    await this.prisma.adventurePageLike.deleteMany({ where: { adventurePageId: pageId, userId } });
    return this.likeCount(pageId);
  }

  // Deliberately its own endpoint, called client-side on actual render, not
  // logged inside getBySlug/get - those back the route *loader*, which
  // TanStack Router also runs on hover/touch "intent" preload (see
  // apps/public/src/router.tsx's defaultPreload), so counting there would
  // inflate "trending" every time a card is merely hovered, not visited.
  async recordView(pageId: string) {
    await this.ensureExists(pageId);
    await this.prisma.adventurePageView.create({ data: { adventurePageId: pageId } });
    return { success: true };
  }

  async addMedia(pageId: string, uploadedById: string, dto: AddMediaDto) {
    await this.ensureExists(pageId);
    const media = await this.prisma.media.create({
      data: {
        adventurePageId: pageId,
        url: dto.url,
        caption: dto.caption,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        uploadedById,
      },
    });

    await this.contributions.award({
      userId: uploadedById,
      reason: ContributionReason.MEDIA_UPLOAD,
      targetType: ContributionTargetType.MEDIA,
      targetId: media.id,
    });

    return media;
  }

  async removeMedia(pageId: string, mediaId: string, currentUser: AuthenticatedUser) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.adventurePageId !== pageId) {
      throw new NotFoundException('Media not found on this page');
    }
    if (media.uploadedById !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the uploader or an admin can remove this photo');
    }
    await this.prisma.media.delete({ where: { id: mediaId } });
    await this.uploads.deleteFile(media.url);
    return { success: true };
  }

  // MILESTONE_3.md §8: soft delete for an upheld MEDIA report - unlike
  // removeMedia (owner/admin, hard delete + file removal), this keeps the
  // row and file as evidence and just stops it from rendering.
  async deactivateMedia(mediaId: string) {
    return this.prisma.media.update({ where: { id: mediaId }, data: { isActive: false } });
  }

  // symmetric - "see also" makes sense from either page, so a suggestion
  // made on A shows up on B's page too, not just A's
  async addRelatedPage(pageId: string, relatedPageId: string) {
    if (pageId === relatedPageId) {
      throw new ForbiddenException('A page cannot be related to itself');
    }
    await this.ensureExists(pageId);
    await this.ensureExists(relatedPageId);

    await this.prisma.$transaction([
      this.prisma.relatedAdventurePage.upsert({
        where: { pageId_relatedPageId: { pageId, relatedPageId } },
        create: { pageId, relatedPageId },
        update: {},
      }),
      this.prisma.relatedAdventurePage.upsert({
        where: { pageId_relatedPageId: { pageId: relatedPageId, relatedPageId: pageId } },
        create: { pageId: relatedPageId, relatedPageId: pageId },
        update: {},
      }),
    ]);

    return { success: true };
  }

  async removeRelatedPage(pageId: string, relatedPageId: string) {
    await this.prisma.$transaction([
      this.prisma.relatedAdventurePage.deleteMany({ where: { pageId, relatedPageId } }),
      this.prisma.relatedAdventurePage.deleteMany({ where: { pageId: relatedPageId, relatedPageId: pageId } }),
    ]);
    return { success: true };
  }

  private async likeCount(pageId: string) {
    const count = await this.prisma.adventurePageLike.count({ where: { adventurePageId: pageId } });
    return { likeCount: count };
  }

  async markVisited(pageId: string, userId: string) {
    await this.ensureExists(pageId);
    await this.prisma.adventurePageVisit.upsert({
      where: { adventurePageId_userId: { adventurePageId: pageId, userId } },
      create: { adventurePageId: pageId, userId },
      update: {},
    });
    return this.visitCount(pageId);
  }

  async unmarkVisited(pageId: string, userId: string) {
    await this.prisma.adventurePageVisit.deleteMany({ where: { adventurePageId: pageId, userId } });
    return this.visitCount(pageId);
  }

  private async visitCount(pageId: string) {
    const count = await this.prisma.adventurePageVisit.count({ where: { adventurePageId: pageId } });
    return { visitCount: count };
  }

  private async ensureExists(id: string) {
    const page = await this.prisma.adventurePage.findUnique({ where: { id }, select: { id: true } });
    if (!page) {
      throw new NotFoundException(`Adventure page ${id} not found`);
    }
  }
}
