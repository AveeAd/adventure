import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { parseTrackFile } from '../tracks/parsers/parse-track-file';
import { BboxQueryDto } from './dto/bbox-query.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateTrailDto } from './dto/create-trail.dto';
import { UpdateTrailDto } from './dto/update-trail.dto';
import { UpdateGeoVerificationStatusDto } from './dto/update-verification-status.dto';
import { TrailsService } from './trails.service';

// Multer needs its limit at decorator-evaluation time - same pattern
// uploads.controller.ts already establishes for MAX_UPLOAD_SIZE_MB.
const maxTrackUploadSizeMb = Number(process.env.MAX_TRACK_UPLOAD_SIZE_MB ?? 25);

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

  // Parse server-side, never client-side - the client uploads raw bytes,
  // the server produces geometry/samples/aggregates. <time> is discarded
  // (destination-scoped privacy rule, see TRAIL_ELEVATION.md) by simply not
  // forwarding parsed timestamps past this controller.
  @Post('import-gpx')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxTrackUploadSizeMb * 1024 * 1024 } }))
  importGpx(
    @Param('pageId') pageId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const parsed = parseTrackFile(file.originalname, file.mimetype, file.buffer);
    const track = parsed.tracks[0];
    if (!track || track.points.length === 0) {
      throw new BadRequestException('File contains no track points');
    }
    return this.trailsService.importGpx(pageId, user.userId, track.points, name ?? track.name);
  }
}

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get()
  listAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.trailsService.listAll(Number(page) || 1, Number(pageSize) || 20);
  }

  // must come before ':id' - otherwise Nest would match "bbox" as an :id.
  // Parameter-scoped ValidationPipe({transform:true}) rather than flipping
  // the app-wide pipe - see BboxQueryDto.
  @Public()
  @Get('bbox')
  bbox(@Query(new ValidationPipe({ transform: true })) query: BboxQueryDto) {
    return this.trailsService.inBoundingBox(query.minLng, query.minLat, query.maxLng, query.maxLat, query.zoom);
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

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.trailsService.delete(id);
  }

  @Post(':id/revisions/:version/votes')
  voteOnRevision(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trailsService.voteOnRevision(id, version, user.userId, user.role, dto);
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id/verification-status')
  updateVerificationStatus(@Param('id') id: string, @Body() dto: UpdateGeoVerificationStatusDto) {
    return this.trailsService.updateVerificationStatus(id, dto.status);
  }

  @Public()
  @Get(':id/revisions')
  listRevisions(@Param('id') id: string, @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.trailsService.listRevisions(id, status);
  }

  @Public()
  @Get(':id/revisions/:version')
  getRevision(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.trailsService.getRevision(id, version);
  }

  @Public()
  @Get(':id/diff')
  diff(@Param('id') id: string, @Query('from', ParseIntPipe) from: number, @Query('to', ParseIntPipe) to: number) {
    return this.trailsService.diff(id, from, to);
  }

  @Post(':id/revisions/:version/revert')
  revert(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trailsService.revert(id, user.userId, version);
  }

  // admin-only escape hatch for a bad import
  @Roles(Role.ADMIN)
  @Delete(':id/elevation-profile')
  deleteElevationProfile(@Param('id') id: string) {
    return this.trailsService.deleteElevationProfile(id);
  }
}
