import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AddTripReportMediaDto } from './dto/add-trip-report-media.dto';
import { CreateTripReportDto } from './dto/create-trip-report.dto';
import { UpdateTripReportDto } from './dto/update-trip-report.dto';

@Injectable()
export class TripReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPage(pageId: string, page = 1, pageSize = 20) {
    const where = { adventurePageId: pageId, isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.tripReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dateCompleted: 'desc' },
      }),
      this.prisma.tripReport.count({ where }),
    ]);
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

  create(pageId: string, authorId: string, dto: CreateTripReportDto) {
    return this.prisma.tripReport.create({
      data: {
        adventurePageId: pageId,
        authorId,
        title: dto.title,
        description: dto.description,
        dateCompleted: new Date(dto.dateCompleted),
        durationDays: dto.durationDays,
        actualCostAmount: dto.actualCostAmount,
        currency: dto.currency,
      },
    });
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateTripReportDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.tripReport.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dateCompleted: dto.dateCompleted ? new Date(dto.dateCompleted) : undefined,
        durationDays: dto.durationDays,
        actualCostAmount: dto.actualCostAmount,
        currency: dto.currency,
      },
    });
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.tripReport.update({ where: { id }, data: { isActive: false } });
  }

  async addMedia(id: string, currentUser: AuthenticatedUser, dto: AddTripReportMediaDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.tripReportMedia.create({
      data: {
        tripReportId: id,
        url: dto.url,
        caption: dto.caption,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
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
    await this.ensureExists(id);
    // self-kudos isn't blocked, only capped at one per user - see
    // TRIP_REPORTS.md's TripReportKudos note
    await this.prisma.tripReportKudos.upsert({
      where: { tripReportId_userId: { tripReportId: id, userId } },
      create: { tripReportId: id, userId },
      update: {},
    });
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
