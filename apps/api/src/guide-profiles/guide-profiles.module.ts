import { Module } from '@nestjs/common';
import { GuideProfilesController } from './guide-profiles.controller';
import { GuideProfilesService } from './guide-profiles.service';

@Module({
  controllers: [GuideProfilesController],
  providers: [GuideProfilesService],
  exports: [GuideProfilesService],
})
export class GuideProfilesModule {}
