import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { levelProgress } from '../contributions/guide-level.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Admin user management (list + role/active) - a separate concern from
  // getPublicProfile above, which is the anonymous-safe contributor view.
  async list(page = 1, pageSize = 20) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        // MILESTONE_3.md §9.2: "Existing Users list gains level/points/role
        // columns" - guideProfile is universal since Phase 19, so every row
        // has one.
        include: {
          profile: { select: { name: true } },
          guideProfile: { select: { guideLevel: true, contributionPoints: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, pageSize };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: { select: { name: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async updateAdmin(id: string, currentUserId: string, dto: UpdateUserDto) {
    if (id === currentUserId && (dto.role === Role.USER || dto.isActive === false)) {
      throw new BadRequestException('You cannot demote or deactivate your own account');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
    });
  }

  // Public contributor page (PUBLIC_PAGES.md /users/$id) - derived counts
  // across the tables a contributor leaves a trace in, not stored anywhere.
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, guideProfile: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const [editedPages, tripReportCount, trailConfirmationCount, spotConfirmationCount, contributionsByReason] =
      await Promise.all([
        this.prisma.pageRevision.findMany({
          where: { editorId: id },
          select: { adventurePageId: true },
          distinct: ['adventurePageId'],
        }),
        this.prisma.tripReport.count({ where: { authorId: id, isActive: true } }),
        this.prisma.trailConfirmation.count({ where: { userId: id } }),
        this.prisma.spotConfirmation.count({ where: { userId: id } }),
        // MILESTONE_3.md §9.1: "a contribution breakdown" - grouped by
        // reason rather than a bespoke per-category query, so it stays
        // accurate as new ContributionReasons are added.
        this.prisma.contributionEvent.groupBy({
          by: ['reason'],
          where: { userId: id },
          _count: { _all: true },
          _sum: { points: true },
        }),
      ]);

    const contributionPoints = user.guideProfile?.contributionPoints ?? 0;

    return {
      id: user.id,
      displayName: user.profile?.name ?? user.email,
      avatarUrl: user.profile?.avatarUrl ?? null,
      pagesEditedCount: editedPages.length,
      tripReportCount,
      confirmationsGivenCount: trailConfirmationCount + spotConfirmationCount,
      guideLevel: user.guideProfile?.guideLevel ?? 1,
      contributionPoints,
      approvalsGiven: user.guideProfile?.approvalsGiven ?? 0,
      levelProgress: levelProgress(contributionPoints),
      contributionBreakdown: contributionsByReason.map((row) => ({
        reason: row.reason,
        count: row._count._all,
        points: row._sum.points ?? 0,
      })),
    };
  }

  // role only applies on create - an existing user's role is never touched here
  upsertGoogleUser(
    params: { email: string; googleId: string; roleOnCreate: Role },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.user.upsert({
      where: { email: params.email },
      create: {
        email: params.email,
        googleId: params.googleId,
        role: params.roleOnCreate,
      },
      update: {},
    });
  }
}
