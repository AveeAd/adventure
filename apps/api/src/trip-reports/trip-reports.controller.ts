import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddTripReportMediaDto } from './dto/add-trip-report-media.dto';
import { CreateTripReportDto } from './dto/create-trip-report.dto';
import { UpdateTripReportDto } from './dto/update-trip-report.dto';
import { TripReportsService } from './trip-reports.service';

@Controller('adventure-pages/:pageId/trip-reports')
export class AdventurePageTripReportsController {
  constructor(private readonly tripReportsService: TripReportsService) {}

  @Get()
  list(@Param('pageId') pageId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.tripReportsService.listForPage(pageId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post()
  create(
    @Param('pageId') pageId: string,
    @Body() dto: CreateTripReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripReportsService.create(pageId, user.userId, dto);
  }
}

@Controller('trip-reports')
export class TripReportsController {
  constructor(private readonly tripReportsService: TripReportsService) {}

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.tripReportsService.get(id, user?.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tripReportsService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripReportsService.delete(id, user);
  }

  @Post(':id/media')
  addMedia(
    @Param('id') id: string,
    @Body() dto: AddTripReportMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripReportsService.addMedia(id, user, dto);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripReportsService.removeMedia(id, mediaId, user);
  }

  @Post(':id/kudos')
  addKudos(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripReportsService.addKudos(id, user.userId);
  }

  @Delete(':id/kudos')
  removeKudos(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripReportsService.removeKudos(id, user.userId);
  }
}
