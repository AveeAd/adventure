import { Global, Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

// global like PrismaModule/NotificationsModule - read from many unrelated
// feature modules (approval eligibility, point awards, report limits)
@Global()
@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
