import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { AdventurePagesController } from './adventure-pages.controller';
import { AdventurePagesService } from './adventure-pages.service';

@Module({
  imports: [UploadsModule],
  controllers: [AdventurePagesController],
  providers: [AdventurePagesService],
  // Reused by ReportsModule for revert-on-uphold and media deactivation
  // (MILESTONE_3.md §8).
  exports: [AdventurePagesService],
})
export class AdventurePagesModule {}
