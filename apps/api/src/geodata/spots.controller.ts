import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Roles(Role.ADMIN)
  @Get()
  listAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.spotsService.listAll(Number(page) || 1, Number(pageSize) || 20);
  }

  // must come before ':id' - otherwise Nest would match "bbox" as an :id
  @Public()
  @Get('bbox')
  bbox(
    @Query('minLng') minLng: string,
    @Query('minLat') minLat: string,
    @Query('maxLng') maxLng: string,
    @Query('maxLat') maxLat: string,
  ) {
    return this.spotsService.inBoundingBox(Number(minLng), Number(minLat), Number(maxLng), Number(maxLat));
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

  @Roles(Role.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.spotsService.delete(id);
  }

  @Post(':id/confirmations')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.spotsService.confirm(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/verification-status')
  updateVerificationStatus(@Param('id') id: string, @Body() dto: UpdateGeoVerificationStatusDto) {
    return this.spotsService.updateVerificationStatus(id, dto.status);
  }

  @Public()
  @Get(':id/revisions')
  listRevisions(@Param('id') id: string) {
    return this.spotsService.listRevisions(id);
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
