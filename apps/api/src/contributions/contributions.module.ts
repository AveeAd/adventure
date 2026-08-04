import { Global, Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';

// global like SettingsModule/NotificationsModule - awarded from many
// unrelated content-write paths (pages, trails, spots, trip reports)
@Global()
@Module({
  providers: [ContributionsService],
  exports: [ContributionsService],
})
export class ContributionsModule {}
