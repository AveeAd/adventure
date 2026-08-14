import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ClubsService } from '../clubs/clubs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ModerateThreadDto } from './dto/moderate-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';

const AUTHOR_SELECT = { id: true, email: true, profile: { select: { name: true } } } as const;

const THREAD_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  club: { select: { id: true, name: true } },
  tripReport: { select: { id: true, title: true, isActive: true } },
  trail: { select: { id: true, name: true, isActive: true } },
  spot: { select: { id: true, name: true, isActive: true } },
  adventurePage: { select: { id: true, title: true, slug: true, isActive: true } },
  _count: { select: { replies: true } },
} as const;

type ThreadWithIncludes = {
  author: { id: string; email: string; profile: { name: string | null } | null };
  tripReport: { id: string; title: string | null; isActive: boolean } | null;
  trail: { id: string; name: string | null; isActive: boolean } | null;
  spot: { id: string; name: string; isActive: boolean } | null;
  adventurePage: { id: string; title: string; slug: string; isActive: boolean } | null;
  _count: { replies: number };
  [key: string]: unknown;
};

// Include queries can't filter a to-one relation by its own isActive column
// without dropping the parent row too - so attachments are always included
// unconditionally and nulled out here for any that have since gone inactive.
// Same "soft delete never enforced at the FK level" convention as elsewhere.
function dropInactiveAttachments<T extends ThreadWithIncludes>(thread: T) {
  const { author, tripReport, trail, spot, adventurePage, _count, ...rest } = thread;
  return {
    ...rest,
    authorId: author.id,
    authorName: author.profile?.name ?? author.email,
    tripReport: tripReport?.isActive ? { id: tripReport.id, title: tripReport.title } : null,
    trail: trail?.isActive ? { id: trail.id, name: trail.name } : null,
    spot: spot?.isActive ? { id: spot.id, name: spot.name } : null,
    adventurePage: adventurePage?.isActive
      ? { id: adventurePage.id, title: adventurePage.title, slug: adventurePage.slug }
      : null,
    replyCount: _count.replies,
  };
}

@Injectable()
export class ThreadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubs: ClubsService,
  ) {}

  async listForClub(clubId: string, page = 1, pageSize = 20) {
    await this.ensureClubExists(clubId);
    const where = { clubId, isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }],
        include: THREAD_INCLUDE,
      }),
      this.prisma.thread.count({ where }),
    ]);
    return { data: data.map(dropInactiveAttachments), total, page, pageSize };
  }

  // admin-only flat listing across all clubs
  async listAdmin(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: THREAD_INCLUDE,
      }),
      this.prisma.thread.count({ where }),
    ]);
    return { data: data.map(dropInactiveAttachments), total, page, pageSize };
  }

  async get(id: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id }, include: THREAD_INCLUDE });
    if (!thread || !thread.isActive) {
      throw new NotFoundException(`Thread ${id} not found`);
    }
    return dropInactiveAttachments(thread);
  }

  async create(clubId: string, authorId: string, dto: CreateThreadDto) {
    await this.ensureClubExists(clubId);
    if (!(await this.clubs.isMember(clubId, authorId))) {
      throw new ForbiddenException('Only approved club members can start a thread');
    }
    await Promise.all([
      this.assertActive('tripReport', dto.tripReportId),
      this.assertActive('trail', dto.trailId),
      this.assertActive('spot', dto.spotId),
      this.assertActive('adventurePage', dto.adventurePageId),
    ]);

    const thread = await this.prisma.thread.create({
      data: {
        clubId,
        authorId,
        content: dto.content,
        tag: dto.tag,
        tripReportId: dto.tripReportId,
        trailId: dto.trailId,
        spotId: dto.spotId,
        adventurePageId: dto.adventurePageId,
      },
      include: THREAD_INCLUDE,
    });
    return dropInactiveAttachments(thread);
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateThreadDto) {
    await this.ensureAuthorOrAdmin(id, currentUser);
    const thread = await this.prisma.thread.update({
      where: { id },
      data: { content: dto.content, tag: dto.tag },
      include: THREAD_INCLUDE,
    });
    return dropInactiveAttachments(thread);
  }

  // Pin/lock only - club MODERATOR or site staff, not the author's own
  // update path. Deliberately narrower than delete()'s tiering: unlike
  // remove/ban-member (and thread deletion), the club OWNER is NOT granted
  // pin rights here on the owner tier alone - only a club moderator or site
  // admin/moderator can pin, per product decision.
  async moderate(id: string, currentUser: AuthenticatedUser, dto: ModerateThreadDto) {
    const thread = await this.prisma.thread.findUnique({ where: { id } });
    if (!thread || !thread.isActive) {
      throw new NotFoundException(`Thread ${id} not found`);
    }
    const tier = await this.clubs.getActingTier(thread.clubId, currentUser);
    if (tier !== 'MODERATOR' && tier !== 'STAFF') {
      throw new ForbiddenException('Only a club moderator or a site admin/moderator can do this');
    }
    const updated = await this.prisma.thread.update({
      where: { id },
      data: { isPinned: dto.isPinned, isActive: dto.isActive },
      include: THREAD_INCLUDE,
    });
    return dropInactiveAttachments(updated);
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    const thread = await this.prisma.thread.findUnique({ where: { id } });
    if (!thread || !thread.isActive) {
      throw new NotFoundException(`Thread ${id} not found`);
    }
    const isAuthor = thread.authorId === currentUser.userId;
    if (!isAuthor) {
      const tier = await this.clubs.getActingTier(thread.clubId, currentUser);
      if (!tier) {
        throw new ForbiddenException('Only the author, a club moderator/owner, or a site admin/moderator can do this');
      }
    }
    return this.prisma.thread.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureClubExists(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true, isActive: true } });
    if (!club || !club.isActive) {
      throw new NotFoundException(`Club ${clubId} not found`);
    }
  }

  private async ensureAuthorOrAdmin(id: string, currentUser: AuthenticatedUser) {
    const thread = await this.prisma.thread.findUnique({ where: { id }, select: { authorId: true, isActive: true } });
    if (!thread || !thread.isActive) {
      throw new NotFoundException(`Thread ${id} not found`);
    }
    if (thread.authorId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the author or an admin can modify this thread');
    }
  }

  private async assertActive(type: 'tripReport' | 'trail' | 'spot' | 'adventurePage', id?: string) {
    if (!id) return;
    const row = await (() => {
      switch (type) {
        case 'tripReport':
          return this.prisma.tripReport.findUnique({ where: { id }, select: { isActive: true } });
        case 'trail':
          return this.prisma.trail.findUnique({ where: { id }, select: { isActive: true } });
        case 'spot':
          return this.prisma.spot.findUnique({ where: { id }, select: { isActive: true } });
        case 'adventurePage':
          return this.prisma.adventurePage.findUnique({ where: { id }, select: { isActive: true } });
      }
    })();
    if (!row || !row.isActive) {
      throw new NotFoundException(`Attached ${type} ${id} not found`);
    }
  }
}
