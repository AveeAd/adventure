import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  // one-way system messages - never notifies a user about their own action
  async notify(userId: string, actorId: string | undefined, type: NotificationType, message: string, linkUrl?: string) {
    if (actorId && actorId === userId) {
      return;
    }
    await this.prisma.notification.create({ data: { userId, type, message, linkUrl } });
    this.firePush(userId, type, message, linkUrl);
  }

  async notifyMany(userIds: string[], actorId: string | undefined, type: NotificationType, message: string, linkUrl?: string) {
    const recipients = [...new Set(userIds)].filter((id) => id !== actorId);
    if (!recipients.length) {
      return;
    }
    await this.prisma.notification.createMany({
      data: recipients.map((userId) => ({ userId, type, message, linkUrl })),
    });
    recipients.forEach((userId) => this.firePush(userId, type, message, linkUrl));
  }

  // Fire-and-forget: push delivery must never add latency to, or fail, the
  // caller's own transaction (approval/report/comment flows etc).
  private firePush(userId: string, type: NotificationType, message: string, linkUrl?: string) {
    this.pushService
      .sendToUser(userId, type, message, linkUrl)
      .catch((err) => this.logger.error(`Push delivery failed for user ${userId}`, err instanceof Error ? err.stack : String(err)));
  }

  async listForUser(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, page, pageSize, unreadCount };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id }, select: { userId: true } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { success: true };
  }
}
