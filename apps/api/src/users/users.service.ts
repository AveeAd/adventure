import { Injectable } from '@nestjs/common';
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
