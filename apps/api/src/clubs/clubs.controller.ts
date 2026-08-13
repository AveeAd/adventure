import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { DecideClubJoinRequestDto } from './dto/decide-club-join-request.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  // Static route, registered before the dynamic ":id" route below so Nest
  // doesn't try to match "admin" as an :id param.
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('admin/all')
  listAdmin(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.clubsService.listAdmin(Number(page) || 1, Number(pageSize) || 20);
  }

  @Public()
  @Get()
  list(@CurrentUser() user: AuthenticatedUser | undefined, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.clubsService.list(Number(page) || 1, Number(pageSize) || 20, user?.userId);
  }

  // Static route, registered before ":id" for the same reason as "admin/all".
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.listMine(user.userId);
  }

  @Post()
  create(@Body() dto: CreateClubDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.create(user.userId, dto);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.clubsService.get(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClubDto, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.delete(id, user);
  }

  @Post(':id/members')
  join(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.join(id, user.userId);
  }

  @Delete(':id/members')
  leave(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.leave(id, user.userId);
  }

  @Post(':id/join-requests')
  requestToJoin(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.requestToJoin(id, user.userId);
  }

  @Get(':id/join-requests')
  listJoinRequests(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.listJoinRequests(id, user);
  }

  @Patch(':id/join-requests/:requestId')
  decideJoinRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: DecideClubJoinRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clubsService.decideJoinRequest(id, requestId, user, dto);
  }

  @Public()
  @Get(':id/trip-reports')
  listTripReports(@Param('id') id: string) {
    return this.clubsService.listTripReports(id);
  }
}
