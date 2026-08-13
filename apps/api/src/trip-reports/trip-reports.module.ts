import { Module } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { CommentsController, TripReportCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { AdventurePageTripReportsController, TripReportsController } from './trip-reports.controller';
import { TripReportsService } from './trip-reports.service';

@Module({
  imports: [ClubsModule],
  controllers: [
    AdventurePageTripReportsController,
    TripReportsController,
    TripReportCommentsController,
    CommentsController,
  ],
  providers: [TripReportsService, CommentsService],
  // Reused by ReportsModule for soft-deleting a reported story/comment
  // (MILESTONE_3.md §8).
  exports: [TripReportsService, CommentsService],
})
export class TripReportsModule {}
