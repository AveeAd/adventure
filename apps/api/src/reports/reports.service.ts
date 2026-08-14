import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, NotificationType, ReportStatus, ReportTargetType, Role } from '@prisma/client';
import { isApprovalEligible } from '../approvals/approval-rules.util';
import { AdventurePagesService } from '../adventure-pages/adventure-pages.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContributionsService } from '../contributions/contributions.service';
import { SpotsService } from '../geodata/spots.service';
import { TrailsService } from '../geodata/trails.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly contributions: ContributionsService,
    private readonly notifications: NotificationsService,
    private readonly adventurePages: AdventurePagesService,
    private readonly trails: TrailsService,
    private readonly spots: SpotsService,
  ) {}

  // §8: "at most reports.maxOpenPerUser PENDING reports per user, and one
  // open report per (reporter, target)".
  async file(reporterId: string, dto: CreateReportDto) {
    const openCount = await this.prisma.contentReport.count({
      where: { reporterId, status: 'PENDING' },
    });
    const maxOpen = this.settings.getNumber('reports.maxOpenPerUser');
    if (openCount >= maxOpen) {
      throw new BadRequestException(`You already have ${maxOpen} open reports - resolve those before filing more`);
    }

    const duplicate = await this.prisma.contentReport.findFirst({
      where: { reporterId, targetType: dto.targetType, targetId: dto.targetId, status: 'PENDING' },
    });
    if (duplicate) {
      throw new BadRequestException('You already have an open report for this content');
    }

    return this.prisma.contentReport.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  async listMine(reporterId: string, page = 1, pageSize = 20) {
    const where = { reporterId };
    const [data, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contentReport.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // §9.1: resolution eligibility mirrors approval-vote eligibility - "one
  // level-10 guide, moderator or admin" - reusing isApprovalEligible rather
  // than inventing a parallel rule.
  async assertCanResolve(user: AuthenticatedUser): Promise<void> {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      return;
    }
    const profile = await this.prisma.guideProfile.findUnique({
      where: { userId: user.userId },
      select: { guideLevel: true },
    });
    const minGuideLevel = this.settings.getNumber('approval.minGuideLevel');
    if (!isApprovalEligible(user.role, profile?.guideLevel ?? 1, minGuideLevel)) {
      throw new ForbiddenException(`Guide level ${minGuideLevel}+ is required to resolve reports`);
    }
  }

  async listQueue(user: AuthenticatedUser, status: ReportStatus = 'PENDING', page = 1, pageSize = 20) {
    await this.assertCanResolve(user);
    const where = { status };
    const [data, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { reporter: { include: { profile: true } } },
      }),
      this.prisma.contentReport.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async resolve(reportId: string, resolver: AuthenticatedUser, dto: ResolveReportDto) {
    await this.assertCanResolve(resolver);

    const report = await this.prisma.contentReport.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    if (report.status !== 'PENDING') {
      throw new BadRequestException('This report has already been resolved');
    }
    if (report.reporterId === resolver.userId) {
      throw new ForbiddenException('You cannot resolve your own report');
    }

    const authorId = await this.resolveAuthorId(report.targetType, report.targetId);
    if (authorId === resolver.userId) {
      throw new ForbiddenException('You cannot resolve a report against your own content');
    }

    if (dto.decision === 'UPHELD') {
      await this.applyUphold(report.targetType, report.targetId, resolver.userId);
    }

    const resolved = await this.prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: dto.decision,
        resolvedById: resolver.userId,
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
    });

    await this.notifications.notify(
      report.reporterId,
      resolver.userId,
      NotificationType.REPORT_RESOLVED,
      dto.decision === 'UPHELD' ? 'A report you filed was upheld' : 'A report you filed was reviewed and rejected',
    );

    return resolved;
  }

  // MILESTONE_3.md §8: "who wrote/owns this" per reportable type, resolved
  // lazily (targetId carries no FK - see ContentReport's doc comment) so a
  // hard-deleted target degrades to null rather than throwing.
  private async resolveAuthorId(targetType: ReportTargetType, targetId: string): Promise<string | null> {
    switch (targetType) {
      case 'ADVENTURE_PAGE': {
        const v1 = await this.prisma.pageRevision.findFirst({
          where: { adventurePageId: targetId, version: 1 },
          select: { editorId: true },
        });
        return v1?.editorId ?? null;
      }
      case 'PAGE_REVISION': {
        const revision = await this.prisma.pageRevision.findUnique({ where: { id: targetId }, select: { editorId: true } });
        return revision?.editorId ?? null;
      }
      case 'TRAIL': {
        const trail = await this.prisma.trail.findUnique({ where: { id: targetId }, select: { createdById: true } });
        return trail?.createdById ?? null;
      }
      case 'TRAIL_REVISION': {
        const revision = await this.prisma.trailRevision.findUnique({ where: { id: targetId }, select: { editorId: true } });
        return revision?.editorId ?? null;
      }
      case 'SPOT': {
        const spot = await this.prisma.spot.findUnique({ where: { id: targetId }, select: { createdById: true } });
        return spot?.createdById ?? null;
      }
      case 'SPOT_REVISION': {
        const revision = await this.prisma.spotRevision.findUnique({ where: { id: targetId }, select: { editorId: true } });
        return revision?.editorId ?? null;
      }
      case 'MEDIA': {
        const media = await this.prisma.media.findUnique({ where: { id: targetId }, select: { uploadedById: true } });
        return media?.uploadedById ?? null;
      }
      case 'TRIP_REPORT': {
        const tripReport = await this.prisma.tripReport.findUnique({ where: { id: targetId }, select: { authorId: true } });
        return tripReport?.authorId ?? null;
      }
      case 'COMMENT': {
        const comment = await this.prisma.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
        return comment?.authorId ?? null;
      }
      case 'THREAD': {
        const thread = await this.prisma.thread.findUnique({ where: { id: targetId }, select: { authorId: true } });
        return thread?.authorId ?? null;
      }
      case 'THREAD_REPLY': {
        const reply = await this.prisma.threadReply.findUnique({ where: { id: targetId }, select: { authorId: true } });
        return reply?.authorId ?? null;
      }
    }
  }

  // §8's "upheld consequences" table, one branch per target type. Every
  // branch tolerates the target already being gone (an admin hard-deleted
  // it separately) - the report still resolves, just with no enforcement
  // action left to take.
  private async applyUphold(targetType: ReportTargetType, targetId: string, resolverId: string): Promise<void> {
    switch (targetType) {
      case 'MEDIA':
        return this.upholdMedia(targetId, resolverId);
      case 'TRAIL':
        return this.upholdTrail(targetId, resolverId);
      case 'TRAIL_REVISION': {
        const revision = await this.prisma.trailRevision.findUnique({ where: { id: targetId }, select: { trailId: true } });
        if (revision) {
          await this.upholdTrail(revision.trailId, resolverId);
        }
        return;
      }
      case 'SPOT':
        return this.upholdSpot(targetId, resolverId);
      case 'SPOT_REVISION': {
        const revision = await this.prisma.spotRevision.findUnique({ where: { id: targetId }, select: { spotId: true } });
        if (revision) {
          await this.upholdSpot(revision.spotId, resolverId);
        }
        return;
      }
      case 'ADVENTURE_PAGE':
        return this.upholdPage(targetId, resolverId);
      case 'PAGE_REVISION': {
        const revision = await this.prisma.pageRevision.findUnique({ where: { id: targetId }, select: { adventurePageId: true } });
        if (revision) {
          await this.upholdPage(revision.adventurePageId, resolverId);
        }
        return;
      }
      case 'TRIP_REPORT':
        return this.upholdTripReport(targetId, resolverId);
      case 'COMMENT':
        return this.upholdComment(targetId, resolverId);
      case 'THREAD':
        return this.upholdThread(targetId, resolverId);
      case 'THREAD_REPLY':
        return this.upholdThreadReply(targetId, resolverId);
    }
  }

  private async upholdMedia(mediaId: string, resolverId: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      return;
    }
    await this.adventurePages.deactivateMedia(mediaId);
    await this.contributions.award({
      userId: media.uploadedById,
      reason: ContributionReason.MEDIA_REPORT_UPHELD,
      targetType: ContributionTargetType.MEDIA,
      targetId: mediaId,
    });
    await this.notifications.notify(
      media.uploadedById,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'One of your photos was removed after a report was upheld',
    );
  }

  private async upholdTrail(trailId: string, resolverId: string): Promise<void> {
    const { reportedRevisionId, reportedEditorId } = await this.trails.revertToPreviousApproved(trailId);
    await this.contributions.award({
      userId: reportedEditorId,
      reason: ContributionReason.GEO_REPORT_UPHELD,
      targetType: ContributionTargetType.TRAIL_REVISION,
      targetId: reportedRevisionId,
    });
    await this.notifications.notify(
      reportedEditorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'A trail edit of yours was reverted after a report was upheld',
    );
  }

  private async upholdSpot(spotId: string, resolverId: string): Promise<void> {
    const { reportedRevisionId, reportedEditorId } = await this.spots.revertToPreviousApproved(spotId);
    await this.contributions.award({
      userId: reportedEditorId,
      reason: ContributionReason.GEO_REPORT_UPHELD,
      targetType: ContributionTargetType.SPOT_REVISION,
      targetId: reportedRevisionId,
    });
    await this.notifications.notify(
      reportedEditorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'A spot edit of yours was reverted after a report was upheld',
    );
  }

  // §3.1: PAGE_REPORT_UPHELD "reverses the original award" rather than
  // paying a fixed value - v1 paid PAGE_CREATE, anything later paid
  // PAGE_UPDATE, so the reversal looks up whichever setting applies and
  // negates it.
  private async upholdPage(pageId: string, resolverId: string): Promise<void> {
    const { reportedRevisionId, reportedEditorId, reportedWasCreate } = await this.adventurePages.revertToPreviousApproved(pageId);
    const originalPoints = this.settings.getNumber(reportedWasCreate ? 'points.pageCreate' : 'points.pageUpdate');
    await this.contributions.award({
      userId: reportedEditorId,
      reason: ContributionReason.PAGE_REPORT_UPHELD,
      targetType: ContributionTargetType.PAGE_REVISION,
      targetId: reportedRevisionId,
      points: -originalPoints,
    });
    await this.notifications.notify(
      reportedEditorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'A page edit of yours was reverted after a report was upheld',
    );
  }

  // §8: "Trip report / comment -> soft delete; no point change beyond
  // reversing STORY_CREATE if the story is removed." There's no dedicated
  // ContributionReason for this reversal (only MEDIA/GEO/PAGE_REPORT_UPHELD
  // exist), so it goes through ADMIN_ADJUSTMENT with an explanatory note,
  // per that reason's "requires a note" convention.
  private async upholdTripReport(tripReportId: string, resolverId: string): Promise<void> {
    const tripReport = await this.prisma.tripReport.findUnique({ where: { id: tripReportId } });
    if (!tripReport) {
      return;
    }
    await this.prisma.tripReport.update({ where: { id: tripReportId }, data: { isActive: false } });
    if (tripReport.isActive) {
      const storyPoints = this.settings.getNumber('points.storyCreate');
      await this.contributions.award({
        userId: tripReport.authorId,
        reason: ContributionReason.ADMIN_ADJUSTMENT,
        targetType: ContributionTargetType.TRIP_REPORT,
        targetId: tripReportId,
        points: -storyPoints,
        note: 'Reversal of STORY_CREATE - story removed via upheld report',
      });
    }
    await this.notifications.notify(
      tripReport.authorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'One of your stories was removed after a report was upheld',
    );
  }

  private async upholdComment(commentId: string, resolverId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return;
    }
    await this.prisma.comment.update({ where: { id: commentId }, data: { isActive: false } });
    await this.notifications.notify(
      comment.authorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'One of your comments was removed after a report was upheld',
    );
  }

  private async upholdThread(threadId: string, resolverId: string): Promise<void> {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) {
      return;
    }
    await this.prisma.thread.update({ where: { id: threadId }, data: { isActive: false } });
    await this.notifications.notify(
      thread.authorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'One of your threads was removed after a report was upheld',
    );
  }

  private async upholdThreadReply(replyId: string, resolverId: string): Promise<void> {
    const reply = await this.prisma.threadReply.findUnique({ where: { id: replyId } });
    if (!reply) {
      return;
    }
    await this.prisma.threadReply.update({ where: { id: replyId }, data: { isActive: false } });
    await this.notifications.notify(
      reply.authorId,
      resolverId,
      NotificationType.REPORT_UPHELD_AGAINST_YOU,
      'One of your replies was removed after a report was upheld',
    );
  }
}
