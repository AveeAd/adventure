import { Module } from '@nestjs/common';
import { AdventurePageSpotsController, SpotsController } from './spots.controller';
import { SpotsService } from './spots.service';
import { AdventurePageTrailsController, TrailsController } from './trails.controller';
import { TrailsService } from './trails.service';

@Module({
  controllers: [AdventurePageTrailsController, TrailsController, AdventurePageSpotsController, SpotsController],
  providers: [TrailsService, SpotsService],
  // TrailsService is reused by TracksModule's promote-to-trail / propose-
  // trail-update flows, which route through it rather than adding a
  // parallel write path - see ACTIVITY_TRACKS.md.
  exports: [TrailsService],
})
export class GeodataModule {}
