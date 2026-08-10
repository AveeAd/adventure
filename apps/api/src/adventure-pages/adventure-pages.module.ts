import { Module } from '@nestjs/common';
import { GeodataModule } from '../geodata/geodata.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdventurePagesController } from './adventure-pages.controller';
import { AdventurePagesService } from './adventure-pages.service';

@Module({
  // GeodataModule: TrailsService/SpotsService, reused by create() to add an
  // initial trail/spots inside the page's own creation transaction.
  imports: [UploadsModule, GeodataModule],
  controllers: [AdventurePagesController],
  providers: [AdventurePagesService],
  // Reused by ReportsModule for revert-on-uphold and media deactivation
  // (MILESTONE_3.md §8).
  exports: [AdventurePagesService],
})
export class AdventurePagesModule {}
