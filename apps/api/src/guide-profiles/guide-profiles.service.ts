import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuideVerificationStatus, NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuideProfileDto } from './dto/create-guide-profile.dto';
import { UpdateGuideProfileDto } from './dto/update-guide-profile.dto';

const PROFILE_INCLUDE = {
  specialties: { include: { activityType: true } },
  regions: { include: { district: true } },
  languages: { include: { language: true } },
} as const;

@Injectable()
export class GuideProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    page = 1,
    pageSize = 20,
    filters: { activityTypeId?: string; districtId?: string; languageId?: string } = {},
  ) {
    const where = {
      isActive: true,
      ...(filters.activityTypeId && { specialties: { some: { activityTypeId: filters.activityTypeId } } }),
      ...(filters.districtId && { regions: { some: { districtId: filters.districtId } } }),
      ...(filters.languageId && { languages: { some: { languageId: filters.languageId } } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.guideProfile.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: PROFILE_INCLUDE,
      }),
      this.prisma.guideProfile.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async get(id: string) {
    const profile = await this.prisma.guideProfile.findUnique({
      where: { id },
      include: PROFILE_INCLUDE,
    });
    if (!profile) {
      throw new NotFoundException(`Guide profile ${id} not found`);
    }
    return profile;
  }

  async getByUserId(userId: string) {
    const profile = await this.prisma.guideProfile.findUnique({
      where: { userId },
      include: PROFILE_INCLUDE,
    });
    if (!profile) {
      throw new NotFoundException('You do not have a guide profile yet');
    }
    return profile;
  }

  async create(userId: string, dto: CreateGuideProfileDto) {
    const existing = await this.prisma.guideProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('You already have a guide profile');
    }

    const profile = await this.prisma.guideProfile.create({
      data: {
        userId,
        licenseNumber: dto.licenseNumber,
        bio: dto.bio,
        rateMin: dto.rateMin,
        rateMax: dto.rateMax,
        rateUnit: dto.rateUnit,
        specialties: dto.specialtyActivityTypeIds?.length
          ? { create: dto.specialtyActivityTypeIds.map((activityTypeId) => ({ activityTypeId })) }
          : undefined,
        regions: dto.regionDistrictIds?.length
          ? { create: dto.regionDistrictIds.map((districtId) => ({ districtId })) }
          : undefined,
        languages: dto.languageIds?.length
          ? { create: dto.languageIds.map((languageId) => ({ languageId })) }
          : undefined,
      },
    });

    return this.get(profile.id);
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateGuideProfileDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);

    await this.prisma.$transaction(async (tx) => {
      if (dto.specialtyActivityTypeIds) {
        await tx.guideSpecialty.deleteMany({ where: { guideProfileId: id } });
        if (dto.specialtyActivityTypeIds.length) {
          await tx.guideSpecialty.createMany({
            data: dto.specialtyActivityTypeIds.map((activityTypeId) => ({ guideProfileId: id, activityTypeId })),
          });
        }
      }

      if (dto.regionDistrictIds) {
        await tx.guideRegion.deleteMany({ where: { guideProfileId: id } });
        if (dto.regionDistrictIds.length) {
          await tx.guideRegion.createMany({
            data: dto.regionDistrictIds.map((districtId) => ({ guideProfileId: id, districtId })),
          });
        }
      }

      if (dto.languageIds) {
        await tx.guideLanguage.deleteMany({ where: { guideProfileId: id } });
        if (dto.languageIds.length) {
          await tx.guideLanguage.createMany({
            data: dto.languageIds.map((languageId) => ({ guideProfileId: id, languageId })),
          });
        }
      }

      await tx.guideProfile.update({
        where: { id },
        data: {
          licenseNumber: dto.licenseNumber,
          bio: dto.bio,
          rateMin: dto.rateMin,
          rateMax: dto.rateMax,
          rateUnit: dto.rateUnit,
        },
      });
    });

    return this.get(id);
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    await this.prisma.guideProfile.update({ where: { id }, data: { isActive: false } });
    return this.get(id);
  }

  async updateVerificationStatus(id: string, status: GuideVerificationStatus) {
    const profile = await this.prisma.guideProfile.findUnique({
      where: { id },
      include: { regions: { include: { district: true } } },
    });
    if (!profile) {
      throw new NotFoundException(`Guide profile ${id} not found`);
    }

    const coversRestrictedRegion = profile.regions.some((region) => region.district.requiresRegisteredAgency);

    // the legal gate: a restricted-region guide can only reach VERIFIED by
    // having already passed through PENDING_LICENSE_REVIEW - never a
    // shortcut straight from UNVERIFIED, per GUIDES.md
    if (
      coversRestrictedRegion &&
      status === GuideVerificationStatus.VERIFIED &&
      profile.verificationStatus !== GuideVerificationStatus.PENDING_LICENSE_REVIEW
    ) {
      throw new BadRequestException(
        'This guide covers a restricted-agency district and must pass through PENDING_LICENSE_REVIEW before being verified',
      );
    }

    await this.prisma.guideProfile.update({ where: { id }, data: { verificationStatus: status } });

    if (status === GuideVerificationStatus.VERIFIED) {
      await this.notifications.notify(
        profile.userId,
        undefined,
        NotificationType.GUIDE_VERIFIED,
        'Your guide profile was verified',
        '/account/guide-profile',
      );
    }

    return this.get(id);
  }

  private async ensureOwnerOrAdmin(id: string, currentUser: AuthenticatedUser) {
    const profile = await this.prisma.guideProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!profile) {
      throw new NotFoundException(`Guide profile ${id} not found`);
    }
    if (profile.userId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the guide or an admin can modify this profile');
    }
  }
}
