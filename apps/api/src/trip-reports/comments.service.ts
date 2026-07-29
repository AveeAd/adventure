import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // flat fetch + nest in application code - no recursive SQL needed at this scale
  async listForTripReport(tripReportId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { tripReportId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    type CommentWithReplies = (typeof comments)[number] & { replies: CommentWithReplies[] };
    const byId = new Map<string, CommentWithReplies>(
      comments.map((comment) => [comment.id, { ...comment, replies: [] }]),
    );
    const roots: CommentWithReplies[] = [];

    for (const comment of byId.values()) {
      if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
        byId.get(comment.parentCommentId)!.replies.push(comment);
      } else {
        roots.push(comment);
      }
    }

    return roots;
  }

  async create(tripReportId: string, authorId: string, dto: CreateCommentDto) {
    let parent: { tripReportId: string; authorId: string } | null = null;
    if (dto.parentCommentId) {
      parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentCommentId },
        select: { tripReportId: true, authorId: true },
      });
      if (!parent || parent.tripReportId !== tripReportId) {
        throw new NotFoundException('Parent comment not found on this trip report');
      }
    }

    const comment = await this.prisma.comment.create({
      data: { tripReportId, authorId, content: dto.content, parentCommentId: dto.parentCommentId },
    });

    const tripReport = await this.prisma.tripReport.findUnique({
      where: { id: tripReportId },
      select: { authorId: true, title: true, adventurePage: { select: { slug: true } } },
    });
    const linkUrl = tripReport
      ? `/adventures/${tripReport.adventurePage.slug}/trips/${tripReportId}`
      : undefined;
    const label = tripReport?.title ?? 'your trip report';

    if (parent) {
      await this.notifications.notify(
        parent.authorId,
        authorId,
        NotificationType.REPLY,
        `Someone replied to your comment on "${label}"`,
        linkUrl,
      );
    } else if (tripReport) {
      await this.notifications.notify(
        tripReport.authorId,
        authorId,
        NotificationType.COMMENT,
        `Someone commented on "${label}"`,
        linkUrl,
      );
    }

    return comment;
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
