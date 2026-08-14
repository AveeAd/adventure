import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { levelProgress } from '../contributions/guide-level.util';
import { sanitizeUsernameSeed } from '../common/username';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';

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
      username: user.username,
      displayName: user.profile?.name ?? user.username,
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

  // role only applies on create - an existing user's role is never touched
  // here. Explicit find-then-create (not a Prisma upsert) so an existing
  // user's login is a single lookup, not a wasted username-collision check
  // on every sign-in - only a brand-new account needs one.
  async upsertGoogleUser(
    params: { email: string; googleId: string; roleOnCreate: Role; usernameSeed: string },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existing = await tx.user.findUnique({ where: { email: params.email } });
    if (existing) {
      return existing;
    }
    const username = await this.generateUniqueUsername(params.usernameSeed, tx);
    return tx.user.create({
      data: {
        email: params.email,
        googleId: params.googleId,
        role: params.roleOnCreate,
        username,
      },
    });
  }

  // Same slugify-then-collision-loop shape as AdventurePagesService's
  // generateUniqueSlug / base-crud.service.ts's generic version - the
  // charset and NOT-a-slug format differ (USERNAME_PATTERN, not URL slugs),
  // so it can't reuse those directly.
  async generateUniqueUsername(seed: string, tx: Prisma.TransactionClient | PrismaService = this.prisma): Promise<string> {
    const base = sanitizeUsernameSeed(seed);
    const existing = await tx.user.findMany({
      where: { username: { startsWith: base } },
      select: { username: true },
      take: 1000,
    });
    const taken = new Set(existing.map((u) => u.username));
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base}_${i}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  // One self-service edit, only while the current username is still the
  // auto-generated one - see the Prisma schema comment on
  // User.usernameIsAutoGenerated for why this is a single boolean flag
  // rather than tracking an edit count or comparing against a stored
  // original value.
  async updateOwnUsername(userId: string, dto: UpdateUsernameDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usernameIsAutoGenerated: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (!user.usernameIsAutoGenerated) {
      throw new ForbiddenException('Username has already been changed once and cannot be changed again');
    }
    const taken = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (taken) {
      throw new ConflictException('This username is already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { username: dto.username, usernameIsAutoGenerated: false },
      select: { id: true, username: true, usernameIsAutoGenerated: true },
    });
  }
}
