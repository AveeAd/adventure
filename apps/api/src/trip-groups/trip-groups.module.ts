import { Module } from '@nestjs/common';
import { AdventurePageTripGroupsController, TripGroupsController } from './trip-groups.controller';
import { TripGroupsService } from './trip-groups.service';

@Module({
  controllers: [AdventurePageTripGroupsController, TripGroupsController],
  providers: [TripGroupsService],
})
export class TripGroupsModule {}
