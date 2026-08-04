import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportsService } from './reports.service';

const VALID_STATUSES: ReportStatus[] = ['PENDING', 'UPHELD', 'REJECTED'];

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  file(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.file(user.userId, dto);
  }

  @Get('mine')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reportsService.listMine(user.userId, Number(page) || 1, Number(pageSize) || 20);
  }

  // MILESTONE_3.md §9.1: eligibility (level-10+/mod/admin) is checked inside
  // the service, same pattern as ApprovalsController/listPending - it
  // depends on GuideProfile.guideLevel, not just Role.
  @Get()
  listQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const validStatus = VALID_STATUSES.includes(status as ReportStatus) ? (status as ReportStatus) : 'PENDING';
    return this.reportsService.listQueue(user, validStatus, Number(page) || 1, Number(pageSize) || 20);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ResolveReportDto) {
    return this.reportsService.resolve(id, user, dto);
  }
}
