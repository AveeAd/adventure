import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ModerateThreadDto } from './dto/moderate-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ThreadsService } from './threads.service';

@Controller('clubs/:clubId/threads')
export class ClubThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Public()
  @Get()
  list(@Param('clubId') clubId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.threadsService.listForClub(clubId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Post()
  create(@Param('clubId') clubId: string, @Body() dto: CreateThreadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.threadsService.create(clubId, user.userId, dto);
  }
}

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  // Static route, registered before ":id" so Nest doesn't try to match
  // "admin" as an :id param - same convention as clubs.controller.ts.
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('admin/all')
  listAdmin(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.threadsService.listAdmin(Number(page) || 1, Number(pageSize) || 20);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.threadsService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateThreadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.threadsService.update(id, user, dto);
  }

  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateThreadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.threadsService.moderate(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.threadsService.delete(id, user);
  }
}
