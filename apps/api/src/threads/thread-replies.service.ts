import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadReplyDto } from './dto/create-thread-reply.dto';
import { UpdateThreadReplyDto } from './dto/update-thread-reply.dto';

@Injectable()
export class ThreadRepliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // flat fetch + nest in application code, mirrors CommentsService.listForTripReport
  async listForThread(threadId: string) {
    const replies = await this.prisma.threadReply.findMany({
      where: { threadId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    type ReplyWithReplies = (typeof replies)[number] & { replies: ReplyWithReplies[] };
    const byId = new Map<string, ReplyWithReplies>(replies.map((reply) => [reply.id, { ...reply, replies: [] }]));
    const roots: ReplyWithReplies[] = [];

    for (const reply of byId.values()) {
      if (reply.parentReplyId && byId.has(reply.parentReplyId)) {
        byId.get(reply.parentReplyId)!.replies.push(reply);
      } else {
        roots.push(reply);
      }
    }

    return roots;
  }

  async create(threadId: string, authorId: string, dto: CreateThreadReplyDto) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { isActive: true, authorId: true, clubId: true },
    });
    if (!thread || !thread.isActive) {
      throw new NotFoundException(`Thread ${threadId} not found`);
    }

    let parent: { threadId: string; authorId: string } | null = null;
    if (dto.parentReplyId) {
      parent = await this.prisma.threadReply.findUnique({
        where: { id: dto.parentReplyId },
        select: { threadId: true, authorId: true },
      });
      if (!parent || parent.threadId !== threadId) {
        throw new NotFoundException('Parent reply not found on this thread');
      }
    }

    const reply = await this.prisma.threadReply.create({
      data: { threadId, authorId, content: dto.content, parentReplyId: dto.parentReplyId },
    });

    const linkUrl = `/clubs/${thread.clubId}/threads/${threadId}`;
    if (parent) {
      await this.notifications.notify(
        parent.authorId,
        authorId,
        NotificationType.THREAD_REPLY,
        'Someone replied to your reply in a club thread',
        linkUrl,
      );
    } else {
      await this.notifications.notify(
        thread.authorId,
        authorId,
        NotificationType.THREAD_REPLY,
        'Someone replied to your thread',
        linkUrl,
      );
    }

    return reply;
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateThreadReplyDto) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.threadReply.update({ where: { id }, data: { content: dto.content } });
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    await this.ensureOwnerOrAdmin(id, currentUser);
    return this.prisma.threadReply.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureOwnerOrAdmin(id: string, currentUser: AuthenticatedUser) {
    const reply = await this.prisma.threadReply.findUnique({ where: { id }, select: { authorId: true } });
    if (!reply) {
      throw new NotFoundException(`Thread reply ${id} not found`);
    }
    if (reply.authorId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the author or an admin can modify this reply');
    }
  }
}
