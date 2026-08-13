import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClubSort, ClubsService } from './clubs.service';
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
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    const resolvedSort: ClubSort = sort === 'newest' || sort === 'active' ? sort : 'members';
    return this.clubsService.list(Number(page) || 1, Number(pageSize) || 20, user?.userId, search, resolvedSort);
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

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.removeMember(id, userId, user);
  }

  @Post(':id/members/:userId/ban')
  banMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.banMember(id, userId, user);
  }

  @Post(':id/members/:userId/promote')
  promoteToModerator(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clubsService.promoteToModerator(id, userId, user);
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
