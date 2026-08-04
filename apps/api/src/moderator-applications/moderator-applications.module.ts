import { Module } from '@nestjs/common';
import { ModeratorApplicationsController } from './moderator-applications.controller';
import { ModeratorApplicationsService } from './moderator-applications.service';

@Module({
  controllers: [ModeratorApplicationsController],
  providers: [ModeratorApplicationsService],
})
export class ModeratorApplicationsModule {}
