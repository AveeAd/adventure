import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { UpdateTripGroupDto } from './dto/update-trip-group.dto';
import { UpdateTripGroupStatusDto } from './dto/update-trip-group-status.dto';
import { TripGroupsService } from './trip-groups.service';

@Controller('adventure-pages/:pageId/trip-groups')
export class AdventurePageTripGroupsController {
  constructor(private readonly tripGroupsService: TripGroupsService) {}

  @Public()
  @Get()
  list(
    @Param('pageId') pageId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    const upcomingFilter = upcoming === undefined ? undefined : upcoming === 'true';
    return this.tripGroupsService.listForPage(pageId, Number(page) || 1, Number(pageSize) || 20, upcomingFilter);
  }

  @Post()
  create(
    @Param('pageId') pageId: string,
    @Body() dto: CreateTripGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripGroupsService.create(pageId, user.userId, dto);
  }
}

@Controller('trip-groups')
export class TripGroupsController {
  constructor(private readonly tripGroupsService: TripGroupsService) {}

  // Static route, registered before the dynamic ":id" route below so Nest
  // doesn't try to match "admin" as an :id param - same convention as
  // clubs.controller.ts/threads.controller.ts.
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('admin/all')
  listAdmin(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.tripGroupsService.listAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Public()
  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.tripGroupsService.listAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.tripGroupsService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tripGroupsService.update(id, user, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTripGroupStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripGroupsService.updateStatus(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripGroupsService.delete(id, user);
  }

  @Post(':id/members')
  join(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripGroupsService.join(id, user.userId);
  }

  @Delete(':id/members')
  leave(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tripGroupsService.leave(id, user.userId);
  }
}
