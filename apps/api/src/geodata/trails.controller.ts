import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { TrailsService } from './trails.service';

@Controller('adventure-pages/:pageId/trails')
export class AdventurePageTrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Public()
  @Get()
  list(@Param('pageId') pageId: string) {
    return this.trailsService.listForPage(pageId);
  }

  @Post()
  create(
    @Param('pageId') pageId: string,
    @Body() dto: CreateTrailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trailsService.create(pageId, user.userId, dto);
  }
}

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  // must come before ':id' - otherwise Nest would match "bbox" as an :id
  @Public()
  @Get('bbox')
  bbox(
    @Query('minLng') minLng: string,
    @Query('minLat') minLat: string,
    @Query('maxLng') maxLng: string,
    @Query('maxLat') maxLat: string,
  ) {
    return this.trailsService.inBoundingBox(Number(minLng), Number(minLat), Number(maxLng), Number(maxLat));
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.trailsService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrailDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trailsService.update(id, user.userId, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.trailsService.delete(id);
  }

  @Post(':id/confirmations')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.trailsService.confirm(id, user.userId);
  }
}
