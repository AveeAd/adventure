import { NotificationType } from '@prisma/client';

// Phase 6: the four push preference categories a user can mute
// independently. Deliberately smaller/coarser than NotificationType itself
// - see NotificationPreference in schema.prisma for the flat boolean per
// category.
export enum NotificationCategory {
  SOCIAL = 'SOCIAL',
  CONTRIBUTIONS = 'CONTRIBUTIONS',
  MODERATION = 'MODERATION',
  CLUBS = 'CLUBS',
}

// Record over the full enum so adding a NotificationType without
// categorizing it here is a compile error, not a silent "never gets muted"
// bug.
const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  COMMENT: NotificationCategory.SOCIAL,
  REPLY: NotificationCategory.SOCIAL,
  KUDOS: NotificationCategory.SOCIAL,
  THREAD_REPLY: NotificationCategory.SOCIAL,

  CHANGE_APPROVED: NotificationCategory.CONTRIBUTIONS,
  CHANGE_REJECTED: NotificationCategory.CONTRIBUTIONS,
  PAGE_VERIFIED: NotificationCategory.CONTRIBUTIONS,
  TRAIL_VERIFIED: NotificationCategory.CONTRIBUTIONS,
  SPOT_VERIFIED: NotificationCategory.CONTRIBUTIONS,
  GUIDE_VERIFIED: NotificationCategory.CONTRIBUTIONS,
  LEVEL_UP: NotificationCategory.CONTRIBUTIONS,

  REPORT_RESOLVED: NotificationCategory.MODERATION,
  REPORT_UPHELD_AGAINST_YOU: NotificationCategory.MODERATION,
  MODERATOR_APPLICATION_DECIDED: NotificationCategory.MODERATION,

  CLUB_JOIN_REQUESTED: NotificationCategory.CLUBS,
  CLUB_JOIN_DECIDED: NotificationCategory.CLUBS,
};

export function categoryForType(type: NotificationType): NotificationCategory {
  return CATEGORY_BY_TYPE[type];
}

// Short push titles - Notification has no title field (message/linkUrl
// only), so this supplies the one push notifications need. Body stays the
// existing message string unchanged.
const PUSH_TITLE_BY_TYPE: Record<NotificationType, string> = {
  COMMENT: 'New comment',
  REPLY: 'New reply',
  KUDOS: 'New kudos',
  THREAD_REPLY: 'New thread reply',
  CHANGE_APPROVED: 'Edit approved',
  CHANGE_REJECTED: 'Edit rejected',
  PAGE_VERIFIED: 'Page verified',
  TRAIL_VERIFIED: 'Trail verified',
  SPOT_VERIFIED: 'Spot verified',
  GUIDE_VERIFIED: 'Guide profile verified',
  LEVEL_UP: 'Level up!',
  REPORT_RESOLVED: 'Report resolved',
  REPORT_UPHELD_AGAINST_YOU: 'Content report upheld',
  MODERATOR_APPLICATION_DECIDED: 'Moderator application decided',
  CLUB_JOIN_REQUESTED: 'Club join request',
  CLUB_JOIN_DECIDED: 'Club join request decided',
};

export function pushTitleForType(type: NotificationType): string {
  return PUSH_TITLE_BY_TYPE[type];
}
