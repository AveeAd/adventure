import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  upsertForUser(
    userId: string,
    data: { name?: string; avatarUrl?: string },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // GET /auth/me (AuthController) needs avatarUrl to show the signed-in
  // user's own photo - the JWT payload it otherwise builds its response
  // from only carries userId/email/username/role, never avatarUrl (kept
  // out on purpose, so avatar changes don't require re-issuing tokens).
  // Null (no row yet, or no avatar on it) rather than throwing - a missing
  // Profile just means no avatar to show, not an error.
  async getAvatarUrl(userId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { avatarUrl: true } });
    return profile?.avatarUrl ?? null;
  }
}
