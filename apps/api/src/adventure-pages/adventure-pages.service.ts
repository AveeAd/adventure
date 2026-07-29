import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PageVerificationStatus, Role } from '@prisma/client';
import { diffLines } from 'diff';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AddMediaDto } from './dto/add-media.dto';
import { CreateAdventurePageDto } from './dto/create-adventure-page.dto';
import { SubmitRevisionDto } from './dto/submit-revision.dto';
import { UpdateAdventurePageMetadataDto } from './dto/update-adventure-page-metadata.dto';

// "a few confirmations," per IDEA.md - a config value, not a schema concept
const CONFIRMATION_THRESHOLD = 2;

@Injectable()
export class AdventurePagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.adventurePage.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          activityType: true,
          difficultyLevel: true,
          media: { take: 1, orderBy: { sortOrder: 'asc' } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.adventurePage.count({ where }),
    ]);
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
        media: { orderBy: { sortOrder: 'asc' } },
        tags: { include: { tag: true } },
        relatedTo: {
          include: {
            relatedPage: {
              select: { id: true, title: true, slug: true, summary: true },
            },
          },
        },
        _count: { select: { likes: true } },
      },
    });
    if (!page) {
      throw new NotFoundException(`Adventure page ${id} not found`);
    }

    const currentRevision = await this.prisma.pageRevision.findFirst({
      where: { adventurePageId: id },
      orderBy: { version: 'desc' },
    });

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

    const { _count, relatedTo, ...rest } = page;
    return {
      ...rest,
      currentRevision,
      contributorIds: contributorRows.map((row) => row.editorId),
      likeCount: _count.likes,
      likedByMe,
      relatedPages: relatedTo.map((r) => r.relatedPage),
    };
  }

  async create(authorId: string, dto: CreateAdventurePageDto) {
    return this.prisma.$transaction(async (tx) => {
      const page = await tx.adventurePage.create({
        data: {
          title: dto.title,
          slug: dto.slug,
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

      return { ...page, currentRevision: revision };
    });
  }

  async updateMetadata(id: string, dto: UpdateAdventurePageMetadataDto) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.districtIds) {
        await tx.adventurePageDistrict.deleteMany({ where: { adventurePageId: id } });
        if (dto.districtIds.length) {
          await tx.adventurePageDistrict.createMany({
            data: dto.districtIds.map((districtId) => ({ adventurePageId: id, districtId })),
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

  async listRevisions(pageId: string) {
    await this.ensureExists(pageId);
    return this.prisma.pageRevision.findMany({
      where: { adventurePageId: pageId },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        editorId: true,
        editSummary: true,
        isSafetyCriticalEdit: true,
        createdAt: true,
      },
    });
  }

  async getRevision(pageId: string, version: number) {
    const revision = await this.prisma.pageRevision.findUnique({
      where: { adventurePageId_version: { adventurePageId: pageId, version } },
    });
    if (!revision) {
      throw new NotFoundException(`Revision ${version} not found for this page`);
    }
    return revision;
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

      // a stale confirmation from before this edit shouldn't vouch for
      // content that's since changed
      await tx.adventurePage.update({
        where: { id: pageId },
        data: {
          verificationStatus: dto.isSafetyCriticalEdit ? 'NEEDS_REVIEW' : 'UNVERIFIED',
        },
      });

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

  async confirm(pageId: string, userId: string) {
    const latest = await this.prisma.pageRevision.findFirst({
      where: { adventurePageId: pageId },
      orderBy: { version: 'desc' },
    });
    if (!latest) {
      throw new NotFoundException('This page has no revisions to confirm');
    }

    await this.prisma.pageConfirmation.upsert({
      where: { revisionId_userId: { revisionId: latest.id, userId } },
      create: { revisionId: latest.id, userId },
      update: {},
    });

    const confirmationCount = await this.prisma.pageConfirmation.count({
      where: { revisionId: latest.id },
    });

    if (confirmationCount >= CONFIRMATION_THRESHOLD) {
      await this.prisma.adventurePage.update({
        where: { id: pageId },
        data: { verificationStatus: 'VERIFIED' },
      });
    }

    return { revisionId: latest.id, confirmationCount, threshold: CONFIRMATION_THRESHOLD };
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

  async addMedia(pageId: string, uploadedById: string, dto: AddMediaDto) {
    await this.ensureExists(pageId);
    return this.prisma.media.create({
      data: {
        adventurePageId: pageId,
        url: dto.url,
        caption: dto.caption,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        uploadedById,
      },
    });
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
    return { success: true };
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

  private async ensureExists(id: string) {
    const page = await this.prisma.adventurePage.findUnique({ where: { id }, select: { id: true } });
    if (!page) {
      throw new NotFoundException(`Adventure page ${id} not found`);
    }
  }
}
