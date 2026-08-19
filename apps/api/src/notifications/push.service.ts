import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DevicePlatform, NotificationPreference, NotificationType } from '@prisma/client';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { categoryForType, NotificationCategory, pushTitleForType } from './notification-category';

const DEFAULT_PREFERENCES = {
  socialEnabled: true,
  contributionsEnabled: true,
  moderationEnabled: true,
  clubsEnabled: true,
};

export type NotificationPreferencesPatch = Partial<typeof DEFAULT_PREFERENCES>;

const PREFERENCE_FIELD_BY_CATEGORY: Record<NotificationCategory, 'socialEnabled' | 'contributionsEnabled' | 'moderationEnabled' | 'clubsEnabled'> = {
  [NotificationCategory.SOCIAL]: 'socialEnabled',
  [NotificationCategory.CONTRIBUTIONS]: 'contributionsEnabled',
  [NotificationCategory.MODERATION]: 'moderationEnabled',
  [NotificationCategory.CLUBS]: 'clubsEnabled',
};

// Phase 6: Expo Push Notification Service as the sender (not raw FCM/APNs -
// Expo proxies both, so no Firebase project or APNs auth key is needed).
// Called fire-and-forget from NotificationsService right after the in-app
// Notification row is written - never awaited inline by the caller, so a
// slow/failed Expo call can't add latency to (or break) the approval/report
// flow that triggered it.
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async registerToken(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('Not a valid Expo push token');
    }
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }

  // No row yet = all categories enabled - don't force a row to exist just
  // to read it.
  async getPreferences(userId: string): Promise<typeof DEFAULT_PREFERENCES> {
    const preference = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return preference ? toPreferencesShape(preference) : DEFAULT_PREFERENCES;
  }

  async updatePreferences(userId: string, patch: NotificationPreferencesPatch): Promise<typeof DEFAULT_PREFERENCES> {
    const preference = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...DEFAULT_PREFERENCES, ...patch },
      update: patch,
    });
    return toPreferencesShape(preference);
  }

  async sendToUser(userId: string, type: NotificationType, message: string, linkUrl?: string): Promise<void> {
    if (this.settings.get('push.enabled') !== 'true') {
      return;
    }

    const category = categoryForType(type);
    const preference = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    // no row yet = all categories enabled by default
    if (preference && !preference[PREFERENCE_FIELD_BY_CATEGORY[category]]) {
      return;
    }

    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (!tokens.length) {
      return;
    }

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title: pushTitleForType(type),
        body: message,
        data: { type, linkUrl },
        sound: 'default',
      }));

    const staleTokens: string[] = [];
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        receipts.forEach((receipt, i) => {
          if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            staleTokens.push(chunk[i].to as string);
          }
        });
      } catch (err) {
        this.logger.error(`Push send failed for user ${userId}`, err instanceof Error ? err.stack : String(err));
      }
    }

    if (staleTokens.length) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: staleTokens } } });
    }
  }
}

function toPreferencesShape(preference: NotificationPreference): typeof DEFAULT_PREFERENCES {
  return {
    socialEnabled: preference.socialEnabled,
    contributionsEnabled: preference.contributionsEnabled,
    moderationEnabled: preference.moderationEnabled,
    clubsEnabled: preference.clubsEnabled,
  };
}
