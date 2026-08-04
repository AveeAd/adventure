import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { parseTrackFile } from './parsers/parse-track-file';
import { CreateActivityTrackDto } from './dto/create-activity-track.dto';
import { ImportActivityTrackDto } from './dto/import-activity-track.dto';
import { PromoteToTrailDto } from './dto/promote-to-trail.dto';
import { ProposeTrailUpdateDto } from './dto/propose-trail-update.dto';
import { UpdateActivityTrackDto } from './dto/update-activity-track.dto';
import { TracksService } from './tracks.service';

// Same "Multer needs its options at decorator-evaluation time" pattern as
// uploads.controller.ts and the trail GPX-import endpoint.
const uploadDir = process.env.UPLOAD_DIR ?? '/app/uploads';
const maxTrackUploadSizeMb = Number(process.env.MAX_TRACK_UPLOAD_SIZE_MB ?? 25);

@Controller('activity-tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly configService: ConfigService,
  ) {}

  // Retained (ActivityTrack.originalFileUrl) for re-parsing, unlike the
  // trail GPX-import endpoint which discards the file after parsing.
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: maxTrackUploadSizeMb * 1024 * 1024 },
    }),
  )
  async importTrack(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportActivityTrackDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const { readFileSync } = await import('fs');
    const buffer = readFileSync(file.path);
    const parsed = parseTrackFile(file.originalname, file.mimetype, buffer);
    const track = parsed.tracks[0];
    if (!track || track.points.length === 0) {
      throw new BadRequestException('File contains no track points');
    }
    const publicApiUrl = this.configService.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000';
    return this.tracksService.importFile(user.userId, track.points, dto, `${publicApiUrl}/uploads/${file.filename}`);
  }

  // JSON body, for a future client that recorded points itself.
  @Post()
  create(@Body() dto: CreateActivityTrackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tracksService.create(user.userId, dto);
  }

  // admin-only flat listing across all users, for the read + moderate admin
  // area - mirrors TrailsController/SpotsController's listAll.
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get()
  listAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.tracksService.listAllForAdmin(Number(page) || 1, Number(pageSize) || 20);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.tracksService.get(id, user?.userId, user?.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityTrackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tracksService.update(id, user, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tracksService.delete(id, user);
  }

  @Post(':id/promote-to-trail')
  promoteToTrail(@Param('id') id: string, @Body() dto: PromoteToTrailDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tracksService.promoteToTrail(id, user.userId, dto);
  }

  @Post(':id/propose-trail-update')
  proposeTrailUpdate(@Param('id') id: string, @Body() dto: ProposeTrailUpdateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tracksService.proposeTrailUpdate(id, user.userId, dto);
  }
}

@Controller('users/:userId/activity-tracks')
export class UserActivityTracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Public()
  @Get()
  list(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.tracksService.listForUser(userId, user?.userId, cursor, Number(limit) || 20);
  }
}

// Delta sync for a future client (MOBILE_CLIENT.md) - a distinct top-level
// path from /activity-tracks, matching ACTIVITY_TRACKS.md's endpoint table.
@Controller('me/activity-tracks')
export class MyActivityTracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser, @Query('since') since?: string) {
    return this.tracksService.listSince(user.userId, since);
  }
}
