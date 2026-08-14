import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClubMembershipStatus, ClubRole, ClubVisibility, NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { DecideClubJoinRequestDto } from './dto/decide-club-join-request.dto';
import { UpdateClubDto } from './dto/update-club.dto';

type ViewerContext = { userId: string; role?: Role };

export type ClubSort = 'members' | 'newest' | 'active';

function resolveClubOrderBy(sort: ClubSort) {
  switch (sort) {
    case 'newest':
      return { createdAt: 'desc' as const };
    // "Active" reads as "recently active", not "not deactivated" - isActive
    // is already unconditionally filtered, so it can't double as a sort.
    case 'active':
      return { updatedAt: 'desc' as const };
    case 'members':
    default:
      return { members: { _count: 'desc' as const } };
  }
}

const APPROVED_MEMBER_INCLUDE = {
  members: {
    where: { status: ClubMembershipStatus.APPROVED },
    include: { user: { select: { id: true, username: true } } },
  },
} as const;

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Public clubs, plus (for a signed-in caller) private clubs they belong to.
  // Defaults to sorting by member count (most popular first).
  async list(page = 1, pageSize = 20, currentUserId?: string, search?: string, sort: ClubSort = 'members') {
    const where = {
      isActive: true,
      AND: [
        {
          OR: [
            { visibility: ClubVisibility.PUBLIC },
            ...(currentUserId
              ? [{ members: { some: { userId: currentUserId, status: ClubMembershipStatus.APPROVED } } }]
              : []),
          ],
        },
        ...(search?.trim()
          ? [
              {
                OR: [
                  { name: { contains: search.trim(), mode: 'insensitive' as const } },
                  { description: { contains: search.trim(), mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: resolveClubOrderBy(sort),
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.club.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // The clubs a user is an approved member of - used by the trip-report
  // authoring form's club picker, distinct from list() which is the public
  // (visibility-scoped) browse listing.
  async listMine(userId: string) {
    const memberships = await this.prisma.clubMember.findMany({
      where: { userId, status: ClubMembershipStatus.APPROVED, club: { isActive: true } },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => m.club);
  }

  // admin-only flat listing, all clubs regardless of visibility
  async listAdmin(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, email: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.club.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // For a PRIVATE club, a non-member/non-owner/non-staff caller gets a
  // trimmed shape (no member list) rather than a 404 - the club has to stay
  // discoverable enough to request joining.
  async get(id: string, currentUser?: ViewerContext) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        ...APPROVED_MEMBER_INCLUDE,
        _count: { select: { members: true } },
        createdBy: { select: { id: true, username: true } },
      },
    });
    if (!club || !club.isActive) {
      throw new NotFoundException(`Club ${id} not found`);
    }
    if (club.visibility === ClubVisibility.PUBLIC || (await this.isPrivilegedFor(club.id, currentUser))) {
      return club;
    }
    const { members, ...trimmed } = club;
    // Doesn't leak the roster, but the caller can still see their own
    // pending/declined request so the UI can render the right state.
    const viewerMembership = currentUser
      ? await this.prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId: id, userId: currentUser.userId } },
          select: { role: true, status: true },
        })
      : null;
    return { ...trimmed, viewerMembership };
  }

  // creating a club and joining it as OWNER happen together - a club with no
  // members would be meaningless, same "compound operation" pattern as
  // AdventurePage+PageRevision / TripGroup+TripGroupMember
  create(userId: string, dto: CreateClubDto) {
    return this.prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: dto.name,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl,
          visibility: dto.visibility ?? ClubVisibility.PUBLIC,
          createdById: userId,
        },
      });
      await tx.clubMember.create({
        data: { clubId: club.id, userId, role: ClubRole.OWNER, status: ClubMembershipStatus.APPROVED },
      });
      return tx.club.findUniqueOrThrow({ where: { id: club.id }, include: APPROVED_MEMBER_INCLUDE });
    });
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateClubDto) {
    await this.ensureOwnerOrSiteModerator(id, currentUser);
    return this.prisma.club.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        visibility: dto.visibility,
      },
      include: APPROVED_MEMBER_INCLUDE,
    });
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrSiteModerator(id, currentUser);
    return this.prisma.club.update({ where: { id }, data: { isActive: false } });
  }

  // Open join - only valid on PUBLIC clubs. PRIVATE clubs go through
  // requestToJoin() instead.
  async join(id: string, userId: string) {
    const club = await this.ensureExists(id);
    if (club.visibility !== ClubVisibility.PUBLIC) {
      throw new ForbiddenException('This club is private - send a join request instead');
    }
    const existing = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });
    if (existing) {
      throw new ConflictException('You already have a membership record for this club');
    }
    await this.prisma.clubMember.create({
      data: { clubId: id, userId, role: ClubRole.MEMBER, status: ClubMembershipStatus.APPROVED },
    });
    return this.get(id, { userId });
  }

  async leave(id: string, userId: string) {
    await this.ensureExists(id);
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });
    if (!membership || membership.status !== ClubMembershipStatus.APPROVED) {
      throw new NotFoundException('You are not a member of this club');
    }
    if (membership.role === ClubRole.OWNER) {
      throw new ConflictException('The owner cannot leave their own club - delete it instead');
    }
    await this.prisma.clubMember.delete({ where: { id: membership.id } });
    return { success: true };
  }

  // PRIVATE-club join request - notifies the owner after the write commits.
  async requestToJoin(id: string, userId: string) {
    const club = await this.ensureExists(id);
    if (club.visibility !== ClubVisibility.PRIVATE) {
      throw new ForbiddenException('This club is public - join it directly instead');
    }
    const existing = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });
    if (existing && existing.status !== ClubMembershipStatus.DECLINED) {
      throw new ConflictException('You already have a pending or approved membership for this club');
    }
    if (existing) {
      await this.prisma.clubMember.update({
        where: { id: existing.id },
        data: { status: ClubMembershipStatus.PENDING, decidedById: null, decidedAt: null },
      });
    } else {
      await this.prisma.clubMember.create({
        data: { clubId: id, userId, role: ClubRole.MEMBER, status: ClubMembershipStatus.PENDING },
      });
    }

    const owner = await this.prisma.clubMember.findFirst({
      where: { clubId: id, role: ClubRole.OWNER },
      select: { userId: true },
    });
    if (owner) {
      await this.notifications.notify(
        owner.userId,
        userId,
        NotificationType.CLUB_JOIN_REQUESTED,
        `Someone requested to join ${club.name}`,
        `/clubs/${id}`,
      );
    }
    return { success: true };
  }

  async listJoinRequests(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrSiteModerator(id, currentUser);
    return this.prisma.clubMember.findMany({
      where: { clubId: id, status: ClubMembershipStatus.PENDING },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // notifies the requester only after the transaction commits - same
  // convention as ModeratorApplicationsService.decide()
  async decideJoinRequest(id: string, requestId: string, reviewer: AuthenticatedUser, dto: DecideClubJoinRequestDto) {
    await this.ensureOwnerOrSiteModerator(id, reviewer);
    const request = await this.prisma.clubMember.findUnique({ where: { id: requestId } });
    if (!request || request.clubId !== id) {
      throw new NotFoundException(`Join request ${requestId} not found`);
    }
    if (request.status !== ClubMembershipStatus.PENDING) {
      throw new ConflictException('This join request has already been decided');
    }

    const status = dto.decision === 'APPROVED' ? ClubMembershipStatus.APPROVED : ClubMembershipStatus.DECLINED;
    const updated = await this.prisma.$transaction((tx) =>
      tx.clubMember.update({
        where: { id: requestId },
        data: { status, decidedById: reviewer.userId, decidedAt: new Date() },
      }),
    );

    await this.notifications.notify(
      request.userId,
      reviewer.userId,
      NotificationType.CLUB_JOIN_DECIDED,
      status === ClubMembershipStatus.APPROVED
        ? 'Your club join request was approved'
        : 'Your club join request was declined',
      `/clubs/${id}`,
    );

    return updated;
  }

  async listTripReports(id: string) {
    await this.ensureExists(id);
    const reports = await this.prisma.tripReport.findMany({
      where: { clubId: id, isActive: true },
      orderBy: { dateCompleted: 'desc' },
      include: {
        author: { select: { id: true, username: true, profile: { select: { name: true } } } },
        adventurePage: { select: { title: true, slug: true } },
        _count: { select: { kudos: true } },
      },
    });
    return reports.map(({ _count, author, ...rest }) => ({
      ...rest,
      kudosCount: _count.kudos,
      authorName: author.profile?.name ?? author.username,
      authorId: author.id,
    }));
  }

  // Owner or site staff may act on a MODERATOR (or another MEMBER); a club
  // MODERATOR may only act on a plain MEMBER - never the owner or a fellow
  // moderator. Shared by removeMember() and banMember().
  private assertCanActOnTarget(tier: 'STAFF' | 'OWNER' | 'MODERATOR', targetRole: ClubRole) {
    if (targetRole === ClubRole.OWNER) {
      throw new ForbiddenException("The club owner can't be removed or banned");
    }
    if (targetRole === ClubRole.MODERATOR && tier === 'MODERATOR') {
      throw new ForbiddenException('Only the owner or a site admin/moderator can act on a club moderator');
    }
  }

  async removeMember(id: string, targetUserId: string, currentUser: AuthenticatedUser) {
    await this.ensureExists(id);
    const tier = await this.getActingTier(id, currentUser);
    if (!tier) {
      throw new ForbiddenException('Only the owner, a club moderator, or a site admin/moderator can do this');
    }
    const target = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });
    if (!target || target.status !== ClubMembershipStatus.APPROVED) {
      throw new NotFoundException('This user is not a member of this club');
    }
    this.assertCanActOnTarget(tier, target.role);
    await this.prisma.clubMember.delete({ where: { id: target.id } });
    return { success: true };
  }

  // Bans keep the row (status BANNED) rather than deleting it, so join() and
  // requestToJoin() - which both already reject on any existing row - keep
  // a banned user out without needing a separate check.
  async banMember(id: string, targetUserId: string, currentUser: AuthenticatedUser) {
    await this.ensureExists(id);
    const tier = await this.getActingTier(id, currentUser);
    if (!tier) {
      throw new ForbiddenException('Only the owner, a club moderator, or a site admin/moderator can do this');
    }
    const target = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });
    if (!target || target.status !== ClubMembershipStatus.APPROVED) {
      throw new NotFoundException('This user is not a member of this club');
    }
    this.assertCanActOnTarget(tier, target.role);
    await this.prisma.clubMember.update({
      where: { id: target.id },
      data: { status: ClubMembershipStatus.BANNED, role: ClubRole.MEMBER },
    });
    return { success: true };
  }

  // Owner or site staff only - promoting a moderator is a step up in trust,
  // unlike removing/banning a plain member, which a moderator can do too.
  async promoteToModerator(id: string, targetUserId: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrSiteModerator(id, currentUser);
    const target = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });
    if (!target || target.status !== ClubMembershipStatus.APPROVED) {
      throw new NotFoundException('This user is not a member of this club');
    }
    if (target.role !== ClubRole.MEMBER) {
      throw new ConflictException('This member is already an owner or moderator');
    }
    await this.prisma.clubMember.update({ where: { id: target.id }, data: { role: ClubRole.MODERATOR } });
    return { success: true };
  }

  async isMember(clubId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { status: true },
    });
    return membership?.status === ClubMembershipStatus.APPROVED;
  }

  private async ensureExists(id: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club || !club.isActive) {
      throw new NotFoundException(`Club ${id} not found`);
    }
    return club;
  }

  private async isPrivilegedFor(clubId: string, currentUser?: ViewerContext): Promise<boolean> {
    if (!currentUser) {
      return false;
    }
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR) {
      return true;
    }
    return this.isMember(clubId, currentUser.userId);
  }

  // Not private: ThreadsService reuses this for club-thread pin/lock/delete
  // moderation tiering, the same STAFF/OWNER/MODERATOR split used here.
  async getActingTier(id: string, currentUser: AuthenticatedUser): Promise<'STAFF' | 'OWNER' | 'MODERATOR' | null> {
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR) {
      return 'STAFF';
    }
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: currentUser.userId } },
    });
    if (!membership || membership.status !== ClubMembershipStatus.APPROVED) {
      return null;
    }
    if (membership.role === ClubRole.OWNER) return 'OWNER';
    if (membership.role === ClubRole.MODERATOR) return 'MODERATOR';
    return null;
  }

  private async ensureOwnerOrSiteModerator(id: string, currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR) {
      await this.ensureExists(id);
      return;
    }
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: currentUser.userId } },
    });
    if (!membership) {
      await this.ensureExists(id);
      throw new ForbiddenException('Club not found');
    }
    if (membership.role !== ClubRole.OWNER || membership.status !== ClubMembershipStatus.APPROVED) {
      throw new ForbiddenException('Only the owner or a site admin/moderator can do this');
    }
  }
}
