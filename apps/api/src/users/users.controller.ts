import { Body, Controller, Delete, Get, Param, Patch, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_PATH } from '../auth/refresh-cookie';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContributionsService } from '../contributions/contributions.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly contributions: ContributionsService,
  ) {}

  // moderators may view (Users list gains level/points/role columns per
  // MILESTONE_3.md §9.2) but the PATCH below - role/isActive - stays
  // admin-only per §2.1's moderator restrictions.
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.usersService.list(Number(page) || 1, Number(pageSize) || 20);
  }

  // raw record (role, isActive, email) for the admin edit form - distinct
  // from the derived public profile below, which is a different shape
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.usersService.get(id);
  }

  @Public()
  @Get(':id/profile')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  // "me/username" is two segments (unlike the admin-only, single-segment
  // ":id" PATCH below), so it can't collide with it regardless of
  // registration order - no route-ordering gotcha here. One self-service
  // edit, only while the username is still auto-generated - see UsersService.
  @Patch('me/username')
  updateOwnUsername(@Body() dto: UpdateUsernameDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.updateOwnUsername(user.userId, dto);
  }

  // MILESTONE_3.md §9.1: "Profile pages ... the point ledger" - a
  // paginated view of ContributionEvent, public like the rest of the
  // contributor profile (this site has no private-profile concept).
  @Public()
  @Get(':id/contributions')
  listContributions(@Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.contributions.list(id, Number(page) || 1, Number(pageSize) || 20);
  }

  // Single-segment route, but registered after "me/username" above and
  // there's no other DELETE route to collide with anyway. Clears the
  // refresh cookie itself (not just the DB rows behind it) for the same
  // reason AuthController.logout does - a web caller's browser should stop
  // sending a now-pointless cookie immediately, not just fail silently on
  // the next refresh attempt.
  @Delete('me')
  async deleteOwnAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.deleteOwnAccount(user.userId);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_PATH });
    return { success: true };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.updateAdmin(id, user.userId, dto);
  }
}
