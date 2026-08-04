import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateModeratorApplicationDto } from './dto/create-moderator-application.dto';
import { DecideModeratorApplicationDto } from './dto/decide-moderator-application.dto';

@Injectable()
export class ModeratorApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  // §7: "Submitting requires guideLevel >= moderator.minGuideLevel and no
  // existing PENDING application."
  async submit(user: AuthenticatedUser, dto: CreateModeratorApplicationDto) {
    if (user.role === Role.ADMIN || user.role === Role.MODERATOR) {
      throw new BadRequestException('You already have admin-site access');
    }

    const profile = await this.prisma.guideProfile.findUnique({
      where: { userId: user.userId },
      select: { guideLevel: true },
    });
    const minGuideLevel = this.settings.getNumber('moderator.minGuideLevel');
    if ((profile?.guideLevel ?? 1) < minGuideLevel) {
      throw new ForbiddenException(`Guide level ${minGuideLevel}+ is required to apply for moderation`);
    }

    const existingPending = await this.prisma.moderatorApplication.findFirst({
      where: { userId: user.userId, status: 'PENDING' },
    });
    if (existingPending) {
      throw new BadRequestException('You already have a pending moderator application');
    }

    return this.prisma.moderatorApplication.create({
      data: { userId: user.userId, statement: dto.statement },
    });
  }

  async getMine(userId: string) {
    return this.prisma.moderatorApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // §2.1/§7: "Only ADMIN reviews" - enforced with @Roles(Role.ADMIN) on the
  // controller, not re-checked here.
  async listQueue(status: string | undefined, page = 1, pageSize = 20) {
    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {};
    const [data, total] = await Promise.all([
      this.prisma.moderatorApplication.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { include: { profile: { select: { name: true } }, guideProfile: { select: { guideLevel: true } } } } },
      }),
      this.prisma.moderatorApplication.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // §7: "Approval sets user.role = MODERATOR in the same transaction and
  // notifies."
  async decide(applicationId: string, reviewer: AuthenticatedUser, dto: DecideModeratorApplicationDto) {
    const application = await this.prisma.moderatorApplication.findUnique({ where: { id: applicationId } });
    if (!application) {
      throw new NotFoundException(`Moderator application ${applicationId} not found`);
    }
    if (application.status !== 'PENDING') {
      throw new BadRequestException('This application has already been reviewed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moderatorApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.decision,
          reviewedById: reviewer.userId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote,
        },
      });
      if (dto.decision === 'APPROVED') {
        await tx.user.update({ where: { id: application.userId }, data: { role: Role.MODERATOR } });
      }
      return result;
    });

    await this.notifications.notify(
      application.userId,
      reviewer.userId,
      NotificationType.MODERATOR_APPLICATION_DECIDED,
      dto.decision === 'APPROVED'
        ? 'Your moderator application was approved'
        : 'Your moderator application was reviewed and not approved',
    );

    return updated;
  }
}
