import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTripReport(tripReportId: string) {
    return this.prisma.comment.findMany({
      where: { tripReportId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(tripReportId: string, authorId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: { tripReportId, authorId, content: dto.content },
    });
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateCommentDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.comment.update({ where: { id }, data: { content: dto.content } });
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.comment.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureOwnerOrAdmin(id: string, currentUser: AuthenticatedUser) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    if (comment.authorId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the author or an admin can modify this comment');
    }
  }
}
