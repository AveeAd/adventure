import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthProvider, Prisma, Role } from '@prisma/client';
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

  // MOBILE_PLAN.md Phase 0: resolves a third-party sign-in to a User via
  // AuthIdentity, replacing the old googleId-only upsert now that a user can
  // hold both a Google and an Apple identity. Lookup order:
  //   1. AuthIdentity(provider, providerId) already exists -> that user.
  //   2. No identity yet, but the provider asserts the email is verified ->
  //      attach a new identity to the existing User with that email
  //      (auto-link). Linking on an *unverified* email is an
  //      account-takeover vector, so emailVerified=false never reaches here.
  //   3. Neither -> create a brand-new User + identity.
  // role only applies on create - an existing user's role is never touched
  // here. Explicit find-then-create (not a Prisma upsert) so an existing
  // user's login is a single lookup, not a wasted username-collision check
  // on every sign-in - only a brand-new account needs one.
  async resolveIdentity(
    params: {
      provider: AuthProvider;
      providerId: string;
      email: string;
      emailVerified: boolean;
      roleOnCreate: Role;
      usernameSeed: string;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const identity = await tx.authIdentity.findUnique({
      where: { provider_providerId: { provider: params.provider, providerId: params.providerId } },
      include: { user: true },
    });
    if (identity) {
      if (identity.email !== params.email) {
        await tx.authIdentity.update({ where: { id: identity.id }, data: { email: params.email } });
      }
      return identity.user;
    }

    const existingByEmail = params.emailVerified
      ? await tx.user.findUnique({ where: { email: params.email } })
      : null;
    if (existingByEmail) {
      await tx.authIdentity.create({
        data: {
          userId: existingByEmail.id,
          provider: params.provider,
          providerId: params.providerId,
          email: params.email,
        },
      });
      return existingByEmail;
    }

    const username = await this.generateUniqueUsername(params.usernameSeed, tx);
    const user = await tx.user.create({
      data: {
        email: params.email,
        role: params.roleOnCreate,
        username,
        authIdentities: {
          create: { provider: params.provider, providerId: params.providerId, email: params.email },
        },
      },
    });
    return user;
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

  // DELETE /users/me - App Store Guideline 5.1.1(v) in-app account deletion
  // (MOBILE_PLAN.md Phase 7). Soft-delete + anonymize, not a hard delete:
  // TripReport.authorId is Restrict and PageRevision/TrailRevision/
  // SpotRevision all carry editorId, so removing the User row would tear
  // holes in the wiki's revision history and block deleting any content the
  // account created. Authorship is retained as "[deleted user]" instead.
  // ActivityTrack is the one exception - it's private personal data with no
  // reason to survive the account that recorded it, so it's hard-deleted
  // here rather than anonymized (its userId FK is Cascade for exactly this).
  async deleteOwnAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Deterministic from the (already-unique) user id rather than a random
    // suffix, so a retried/duplicate call is idempotent instead of leaving
    // orphaned anonymized rows behind.
    const anonSuffix = userId.replace(/-/g, '').slice(0, 22);

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.authIdentity.deleteMany({ where: { userId } }),
      this.prisma.activityTrack.deleteMany({ where: { userId } }),
      this.prisma.profile.updateMany({
        where: { userId },
        data: { name: '[deleted user]', avatarUrl: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted+${anonSuffix}@deleted.local`,
          username: `deleted_${anonSuffix}`,
          isActive: false,
        },
      }),
    ]);
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
