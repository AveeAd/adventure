import { Module } from '@nestjs/common';
import { CommentsController, TripReportCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { AdventurePageTripReportsController, TripReportsController } from './trip-reports.controller';
import { TripReportsService } from './trip-reports.service';

@Module({
  controllers: [
    AdventurePageTripReportsController,
    TripReportsController,
    TripReportCommentsController,
    CommentsController,
  ],
  providers: [TripReportsService, CommentsService],
})
export class TripReportsModule {}
