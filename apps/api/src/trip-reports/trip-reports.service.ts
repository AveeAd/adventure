import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, NotificationType, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContributionsService } from '../contributions/contributions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddTripReportMediaDto } from './dto/add-trip-report-media.dto';
import { CreateTripReportDto } from './dto/create-trip-report.dto';
import { UpdateTripReportDto } from './dto/update-trip-report.dto';

type PrismaTransaction = Prisma.TransactionClient;

@Injectable()
export class TripReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly contributions: ContributionsService,
  ) {}

  async listForPage(pageId: string, page = 1, pageSize = 20) {
    const where = { adventurePageId: pageId, isActive: true };
    const [reports, total] = await Promise.all([
      this.prisma.tripReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dateCompleted: 'desc' },
        include: {
          _count: { select: { kudos: true } },
          author: {
            select: { email: true, profile: { select: { name: true } }, guideProfile: { select: { guideLevel: true } } },
          },
        },
      }),
      this.prisma.tripReport.count({ where }),
    ]);
    const data = reports.map(({ _count, author, ...rest }) => ({
      ...rest,
      kudosCount: _count.kudos,
      authorName: author.profile?.name ?? author.email,
      authorGuideLevel: author.guideProfile?.guideLevel ?? 1,
    }));
    return { data, total, page, pageSize };
  }

  // admin-only flat listing across all pages - the public listForPage above
  // is intentionally scoped to one page, this is for the admin moderation view
  async listAll(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.tripReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          adventurePage: { select: { title: true, slug: true } },
          author: { select: { email: true } },
        },
      }),
      this.prisma.tripReport.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async get(id: string, currentUserId?: string) {
    const report = await this.prisma.tripReport.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        activityTracks: { where: { isActive: true }, orderBy: { startedAt: 'asc' } },
        _count: { select: { kudos: true, comments: true } },
      },
    });
    if (!report) {
      throw new NotFoundException(`Trip report ${id} not found`);
    }

    const kudosByMe = currentUserId
      ? !!(await this.prisma.tripReportKudos.findUnique({
          where: { tripReportId_userId: { tripReportId: id, userId: currentUserId } },
        }))
      : false;

    const { _count, ...rest } = report;
    return { ...rest, kudosCount: _count.kudos, commentCount: _count.comments, kudosByMe };
  }

  async create(pageId: string, authorId: string, dto: CreateTripReportDto) {
    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tripReport.create({
        data: {
          adventurePageId: pageId,
          authorId,
          title: dto.title,
          description: dto.description,
          content: dto.content,
          dateCompleted: new Date(dto.dateCompleted),
          durationDays: dto.durationDays,
          actualCostAmount: dto.actualCostAmount,
          currency: dto.currency,
        },
      });
      if (dto.activityTrackIds?.length) {
        await this.attachTracks(tx, created.id, authorId, dto.activityTrackIds);
      }
      return created;
    });

    // MILESTONE_3.md §3.2: stories earn points on publish, never gated.
    await this.contributions.award({
      userId: authorId,
      reason: ContributionReason.STORY_CREATE,
      targetType: ContributionTargetType.TRIP_REPORT,
      targetId: report.id,
    });

    return report;
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateTripReportDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tripReport.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          content: dto.content,
          dateCompleted: dto.dateCompleted ? new Date(dto.dateCompleted) : undefined,
          durationDays: dto.durationDays,
          actualCostAmount: dto.actualCostAmount,
          currency: dto.currency,
        },
      });

      if (dto.activityTrackIds !== undefined) {
        const currentlyAttached = await tx.activityTrack.findMany({
          where: { tripReportId: id },
          select: { id: true },
        });
        const currentIds = new Set(currentlyAttached.map((t) => t.id));
        const nextIds = new Set(dto.activityTrackIds);
        const toDetach = [...currentIds].filter((trackId) => !nextIds.has(trackId));
        const toAttach = [...nextIds].filter((trackId) => !currentIds.has(trackId));

        if (toDetach.length) {
          await tx.activityTrack.updateMany({
            where: { id: { in: toDetach } },
            data: { tripReportId: null },
          });
        }
        if (toAttach.length) {
          await this.attachTracks(tx, id, updated.authorId, toAttach);
        }
      }

      return updated;
    });
  }

  // Sets tripReportId on the given tracks, after confirming every one of
  // them belongs to `ownerId` - a user can only attach their own recordings,
  // even when an admin is the one editing the report.
  private async attachTracks(tx: PrismaTransaction, tripReportId: string, ownerId: string, trackIds: string[]) {
    const tracks = await tx.activityTrack.findMany({
      where: { id: { in: trackIds } },
      select: { id: true, userId: true },
    });
    if (tracks.length !== trackIds.length) {
      throw new NotFoundException('One or more activity tracks not found');
    }
    if (tracks.some((track) => track.userId !== ownerId)) {
      throw new ForbiddenException('You can only attach your own activity tracks');
    }
    await tx.activityTrack.updateMany({
      where: { id: { in: trackIds } },
      data: { tripReportId },
    });
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.tripReport.update({ where: { id }, data: { isActive: false } });
  }

  async addMedia(id: string, currentUser: AuthenticatedUser, dto: AddTripReportMediaDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    const media = await this.prisma.tripReportMedia.create({
      data: {
        tripReportId: id,
        url: dto.url,
        caption: dto.caption,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.contributions.award({
      userId: currentUser.userId,
      reason: ContributionReason.MEDIA_UPLOAD,
      targetType: ContributionTargetType.MEDIA,
      targetId: media.id,
    });

    return media;
  }

  async removeMedia(id: string, mediaId: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    const media = await this.prisma.tripReportMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.tripReportId !== id) {
      throw new NotFoundException('Media not found on this trip report');
    }
    await this.prisma.tripReportMedia.delete({ where: { id: mediaId } });
    return { success: true };
  }

  async addKudos(id: string, userId: string) {
    const report = await this.prisma.tripReport.findUnique({
      where: { id },
      select: { authorId: true, title: true, adventurePage: { select: { slug: true } } },
    });
    if (!report) {
      throw new NotFoundException(`Trip report ${id} not found`);
    }

    const existing = await this.prisma.tripReportKudos.findUnique({
      where: { tripReportId_userId: { tripReportId: id, userId } },
    });

    // self-kudos isn't blocked, only capped at one per user - see
    // TRIP_REPORTS.md's TripReportKudos note
    await this.prisma.tripReportKudos.upsert({
      where: { tripReportId_userId: { tripReportId: id, userId } },
      create: { tripReportId: id, userId },
      update: {},
    });

    if (!existing) {
      await this.notifications.notify(
        report.authorId,
        userId,
        NotificationType.KUDOS,
        `Someone gave kudos to "${report.title ?? 'your trip report'}"`,
        `/adventures/${report.adventurePage.slug}/trips/${id}`,
      );
    }

    return this.kudosCount(id);
  }

  async removeKudos(id: string, userId: string) {
    await this.prisma.tripReportKudos.deleteMany({ where: { tripReportId: id, userId } });
    return this.kudosCount(id);
  }

  private async kudosCount(id: string) {
    const count = await this.prisma.tripReportKudos.count({ where: { tripReportId: id } });
    return { kudosCount: count };
  }

  private async ensureExists(id: string) {
    const report = await this.prisma.tripReport.findUnique({ where: { id }, select: { id: true } });
    if (!report) {
      throw new NotFoundException(`Trip report ${id} not found`);
    }
  }

  private async ensureOwnerOrAdmin(id: string, currentUser: AuthenticatedUser) {
    const report = await this.prisma.tripReport.findUnique({ where: { id }, select: { authorId: true } });
    if (!report) {
      throw new NotFoundException(`Trip report ${id} not found`);
    }
    if (report.authorId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the author or an admin can modify this trip report');
    }
  }
}
