import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, TripGroupRole, TripGroupStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { UpdateTripGroupDto } from './dto/update-trip-group.dto';
import { UpdateTripGroupStatusDto } from './dto/update-trip-group-status.dto';

const MEMBER_INCLUDE = {
  members: { include: { user: { select: { id: true, username: true } } } },
} as const;

type DisplayStatus = 'UPCOMING' | 'ONGOING' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';

// COMPLETED/CANCELLED are organizer-set and always win; otherwise the badge
// is purely derived from dateStart/dateEnd vs now - never stored, so it
// can't drift out of sync with "now" the way a cached value could.
function withDisplayStatus<T extends { status: TripGroupStatus; dateStart: Date; dateEnd: Date }>(
  group: T,
): T & { displayStatus: DisplayStatus } {
  if (group.status === TripGroupStatus.COMPLETED) {
    return { ...group, displayStatus: 'COMPLETED' };
  }
  if (group.status === TripGroupStatus.CANCELLED) {
    return { ...group, displayStatus: 'CANCELLED' };
  }
  const now = new Date();
  const displayStatus: DisplayStatus = now < group.dateStart ? 'UPCOMING' : now > group.dateEnd ? 'EXPIRED' : 'ONGOING';
  return { ...group, displayStatus };
}

@Injectable()
export class TripGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPage(pageId: string, page = 1, pageSize = 20, upcoming?: boolean) {
    const where = {
      adventurePageId: pageId,
      isActive: true,
      ...(upcoming !== undefined && { dateEnd: upcoming ? { gte: new Date() } : { lt: new Date() } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.tripGroup.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dateStart: 'asc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.tripGroup.count({ where }),
    ]);
    return { data: data.map(withDisplayStatus), total, page, pageSize };
  }

  // admin-only flat listing across all pages
  async listAll(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.tripGroup.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          adventurePage: { select: { title: true, slug: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.tripGroup.count({ where }),
    ]);
    return { data: data.map(withDisplayStatus), total, page, pageSize };
  }

  async get(id: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id }, include: MEMBER_INCLUDE });
    if (!group) {
      throw new NotFoundException(`Trip group ${id} not found`);
    }
    return withDisplayStatus(group);
  }

  // creating a group and joining it as ORGANIZER happen together - a group
  // with no members would be meaningless, same "compound operation" pattern
  // as AdventurePage+PageRevision
  create(pageId: string, userId: string, dto: CreateTripGroupDto) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.tripGroup.create({
        data: {
          adventurePageId: pageId,
          title: dto.title,
          description: dto.description,
          dateStart: new Date(dto.dateStart),
          dateEnd: new Date(dto.dateEnd),
          createdById: userId,
        },
      });
      await tx.tripGroupMember.create({
        data: { tripGroupId: group.id, userId, role: TripGroupRole.ORGANIZER },
      });
      const created = await tx.tripGroup.findUniqueOrThrow({ where: { id: group.id }, include: MEMBER_INCLUDE });
      return withDisplayStatus(created);
    });
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateTripGroupDto) {
    await this.ensureOrganizerOrAdmin(id, currentUser);
    const group = await this.prisma.tripGroup.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dateStart: dto.dateStart ? new Date(dto.dateStart) : undefined,
        dateEnd: dto.dateEnd ? new Date(dto.dateEnd) : undefined,
      },
      include: MEMBER_INCLUDE,
    });
    return withDisplayStatus(group);
  }

  // Organizer-only lifecycle action (COMPLETED/CANCELLED, no way back to
  // ACTIVE yet) - deliberately separate from delete()'s isActive flag below,
  // which stays a pure admin-moderation soft-delete, not something an
  // organizer marking their own trip "done" should touch.
  async updateStatus(id: string, currentUser: AuthenticatedUser, dto: UpdateTripGroupStatusDto) {
    await this.ensureOrganizerOrAdmin(id, currentUser);
    const group = await this.prisma.tripGroup.update({
      where: { id },
      data: { status: dto.status as TripGroupStatus },
      include: MEMBER_INCLUDE,
    });
    return withDisplayStatus(group);
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOrganizerOrAdmin(id, currentUser);
    return this.prisma.tripGroup.update({ where: { id }, data: { isActive: false } });
  }

  async join(id: string, userId: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!group) {
      throw new NotFoundException(`Trip group ${id} not found`);
    }
    if (group.status !== TripGroupStatus.ACTIVE) {
      throw new ConflictException('This trip group is no longer accepting members');
    }
    const existing = await this.prisma.tripGroupMember.findUnique({
      where: { tripGroupId_userId: { tripGroupId: id, userId } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this trip group');
    }
    await this.prisma.tripGroupMember.create({
      data: { tripGroupId: id, userId, role: TripGroupRole.MEMBER },
    });
    return this.get(id);
  }

  async leave(id: string, userId: string) {
    await this.ensureExists(id);
    await this.prisma.tripGroupMember.deleteMany({ where: { tripGroupId: id, userId } });
    return this.get(id);
  }

  private async ensureExists(id: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id }, select: { id: true } });
    if (!group) {
      throw new NotFoundException(`Trip group ${id} not found`);
    }
  }

  private async ensureOrganizerOrAdmin(id: string, currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.ADMIN) {
      await this.ensureExists(id);
      return;
    }
    const membership = await this.prisma.tripGroupMember.findUnique({
      where: { tripGroupId_userId: { tripGroupId: id, userId: currentUser.userId } },
    });
    if (!membership) {
      await this.ensureExists(id);
      throw new ForbiddenException('Trip group not found');
    }
    if (membership.role !== TripGroupRole.ORGANIZER) {
      throw new ForbiddenException('Only the organizer or an admin can modify this trip group');
    }
  }
}
