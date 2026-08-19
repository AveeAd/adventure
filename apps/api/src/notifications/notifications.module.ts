import { Global, Module } from '@nestjs/common';
import { DeviceTokensController } from './device-tokens.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

// global like PrismaModule - notifications are fired from many unrelated
// feature modules (comments, kudos, verification events), so every module
// needing NotificationsService would otherwise have to import this one
@Global()
@Module({
  controllers: [NotificationsController, DeviceTokensController, NotificationPreferencesController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
