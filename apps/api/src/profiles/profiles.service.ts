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
}
