import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateModeratorApplicationDto } from './dto/create-moderator-application.dto';
import { DecideModeratorApplicationDto } from './dto/decide-moderator-application.dto';
import { ModeratorApplicationsService } from './moderator-applications.service';

@Controller('moderator-applications')
export class ModeratorApplicationsController {
  constructor(private readonly moderatorApplications: ModeratorApplicationsService) {}

  @Post()
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateModeratorApplicationDto) {
    return this.moderatorApplications.submit(user, dto);
  }

  // must come before ':id' - same reasoning as GuideProfilesController's 'me'
  @Get('mine')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.moderatorApplications.getMine(user.userId);
  }

  // §2.1: "admins decide" - moderators may not approve/reject applications
  @Roles(Role.ADMIN)
  @Get()
  listQueue(@Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.moderatorApplications.listQueue(status, Number(page) || 1, Number(pageSize) || 20);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/decide')
  decide(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DecideModeratorApplicationDto,
  ) {
    return this.moderatorApplications.decide(id, user, dto);
  }
}
