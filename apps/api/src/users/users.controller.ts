import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContributionsService } from '../contributions/contributions.service';
import { UpdateUserDto } from './dto/update-user.dto';
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

  // MILESTONE_3.md §9.1: "Profile pages ... the point ledger" - a
  // paginated view of ContributionEvent, public like the rest of the
  // contributor profile (this site has no private-profile concept).
  @Public()
  @Get(':id/contributions')
  listContributions(@Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.contributions.list(id, Number(page) || 1, Number(pageSize) || 20);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.updateAdmin(id, user.userId, dto);
  }
}
