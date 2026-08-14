import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BboxQueryDto } from './dto/bbox-query.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateSpotDto } from './dto/create-spot.dto';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { UpdateGeoVerificationStatusDto } from './dto/update-verification-status.dto';
import { SpotsService } from './spots.service';

@Controller('adventure-pages/:pageId/spots')
export class AdventurePageSpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Public()
  @Get()
  list(@Param('pageId') pageId: string) {
    return this.spotsService.listForPage(pageId);
  }

  @Post()
  create(
    @Param('pageId') pageId: string,
    @Body() dto: CreateSpotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.spotsService.create(pageId, user.userId, dto);
  }
}

@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get()
  listAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.spotsService.listAll(Number(page) || 1, Number(pageSize) || 20);
  }

  // must come before ':id' - otherwise Nest would match "search" as an :id
  @Public()
  @Get('search')
  search(@Query('q') q: string) {
    return this.spotsService.search(q ?? '');
  }

  // must come before ':id' - otherwise Nest would match "bbox" as an :id
  @Public()
  @Get('bbox')
  bbox(@Query(new ValidationPipe({ transform: true })) query: BboxQueryDto) {
    return this.spotsService.inBoundingBox(query.minLng, query.minLat, query.maxLng, query.maxLat);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.spotsService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSpotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.spotsService.update(id, user.userId, dto);
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.spotsService.delete(id);
  }

  @Post(':id/revisions/:version/votes')
  voteOnRevision(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.spotsService.voteOnRevision(id, version, user.userId, user.role, dto);
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id/verification-status')
  updateVerificationStatus(@Param('id') id: string, @Body() dto: UpdateGeoVerificationStatusDto) {
    return this.spotsService.updateVerificationStatus(id, dto.status);
  }

  @Public()
  @Get(':id/revisions')
  listRevisions(@Param('id') id: string, @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.spotsService.listRevisions(id, status);
  }

  @Public()
  @Get(':id/revisions/:version')
  getRevision(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.spotsService.getRevision(id, version);
  }

  @Public()
  @Get(':id/diff')
  diff(@Param('id') id: string, @Query('from', ParseIntPipe) from: number, @Query('to', ParseIntPipe) to: number) {
    return this.spotsService.diff(id, from, to);
  }

  @Post(':id/revisions/:version/revert')
  revert(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.spotsService.revert(id, user.userId, version);
  }
}
