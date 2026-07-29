import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// global like PrismaModule - notifications are fired from many unrelated
// feature modules (comments, kudos, verification events), so every module
// needing NotificationsService would otherwise have to import this one
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
