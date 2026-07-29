import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Public contributor page (PUBLIC_PAGES.md /users/$id) - derived counts
  // across the tables a contributor leaves a trace in, not stored anywhere.
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const [editedPages, tripReportCount, trailConfirmationCount, spotConfirmationCount] = await Promise.all([
      this.prisma.pageRevision.findMany({
        where: { editorId: id },
        select: { adventurePageId: true },
        distinct: ['adventurePageId'],
      }),
      this.prisma.tripReport.count({ where: { authorId: id, isActive: true } }),
      this.prisma.trailConfirmation.count({ where: { userId: id } }),
      this.prisma.spotConfirmation.count({ where: { userId: id } }),
    ]);

    return {
      id: user.id,
      displayName: user.profile?.name ?? user.email,
      avatarUrl: user.profile?.avatarUrl ?? null,
      pagesEditedCount: editedPages.length,
      tripReportCount,
      confirmationsGivenCount: trailConfirmationCount + spotConfirmationCount,
    };
  }

  // role only applies on create - an existing user's role is never touched here
  upsertGoogleUser(params: { email: string; googleId: string; roleOnCreate: Role }) {
    return this.prisma.user.upsert({
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
