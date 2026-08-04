import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';

// global like PrismaModule/NotificationsModule - read from many unrelated
// feature modules (approval eligibility, point awards, report limits)
@Global()
@Module({
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
