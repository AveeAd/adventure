import { Global, Module } from '@nestjs/common';
import { MinVersionMiddleware } from './min-version.middleware';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

// global like PrismaModule/NotificationsModule - read from many unrelated
// feature modules (approval eligibility, point awards, report limits)
@Global()
@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService, MinVersionMiddleware],
  exports: [SettingsService, MinVersionMiddleware],
})
export class SettingsModule {}
