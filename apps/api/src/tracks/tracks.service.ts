import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityTrackSource, ActivityTrackVisibility, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { TrailsService } from '../geodata/trails.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertWithinNepal, buildActivityTrackSamples, computeAggregates, haversineMeters, simplifyPoints } from './track-geometry.util';
import { CreateActivityTrackDto } from './dto/create-activity-track.dto';
import { ImportActivityTrackDto } from './dto/import-activity-track.dto';
import { ParsedTrackPoint } from './parsers/types';
import { PromoteToTrailDto } from './dto/promote-to-trail.dto';
import { ProposeTrailUpdateDto } from './dto/propose-trail-update.dto';
import { UpdateActivityTrackDto } from './dto/update-activity-track.dto';

// Trims both ends of the served geometry/samples for non-owner reads - the
// real hazard being that a track's endpoints reveal where someone lives.
// A fixed default rather than user-configurable, kept simple per
// ACTIVITY_TRACKS.md's deliberately minimal privacy model.
const DEFAULT_PRIVACY_TRIM_METERS = 150;

export interface ActivityTrackRow {
  id: string;
  userId: string;
  adventurePageId: string | null;
  tripReportId: string | null;
  activityTypeId: string;
  name: string | null;
  notes: string | null;
  geometry: unknown;
  samples: unknown;
  sampleCount: number;
  startedAt: Date;
  finishedAt: Date;
  elapsedSeconds: number;
  movingSeconds: number | null;
  distanceMeters: number;
  ascentMeters: number | null;
  descentMeters: number | null;
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
  source: ActivityTrackSource;
  visibility: ActivityTrackVisibility;
  privacyTrimMeters: number | null;
  clientUuid: string | null;
  originalFileUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ROW_COLUMNS = `
  id, "userId", "adventurePageId", "tripReportId", "activityTypeId", name, notes,
  ST_AsGeoJSON(geometry)::json AS geometry, samples, "sampleCount",
  "startedAt", "finishedAt", "elapsedSeconds", "movingSeconds", "distanceMeters",
  "ascentMeters", "descentMeters", "minElevationMeters", "maxElevationMeters",
  source, visibility, "privacyTrimMeters", "clientUuid", "originalFileUrl",
  "isActive", "createdAt", "updatedAt"
`;

// Same column list, qualified with the "t" alias - needed for the admin
// listing's join against users, where an unqualified "id" would be ambiguous.
const ROW_COLUMNS_T = `
  t.id, t."userId", t."adventurePageId", t."tripReportId", t."activityTypeId", t.name, t.notes,
  ST_AsGeoJSON(t.geometry)::json AS geometry, t.samples, t."sampleCount",
  t."startedAt", t."finishedAt", t."elapsedSeconds", t."movingSeconds", t."distanceMeters",
  t."ascentMeters", t."descentMeters", t."minElevationMeters", t."maxElevationMeters",
  t.source, t.visibility, t."privacyTrimMeters", t."clientUuid", t."originalFileUrl",
  t."isActive", t."createdAt", t."updatedAt"
`;

@Injectable()
export class TracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trails: TrailsService,
  ) {}

  // Shared by both write paths (file import and JSON-body create) - one
  // pipeline from raw points to a persisted ActivityTrack row.
  private async persist(
    userId: string,
    points: ParsedTrackPoint[],
    source: ActivityTrackSource,
    fields: {
      activityTypeId: string;
      name?: string;
      notes?: string;
      visibility?: ActivityTrackVisibility;
      clientUuid?: string;
      originalFileUrl?: string;
    },
  ): Promise<ActivityTrackRow> {
    assertWithinNepal(points);

    const timestamped = points.filter((p) => p.t);
    // A file with no timestamps at all (plain KML/GeoJSON) still needs a
    // startedAt/finishedAt - fall back to upload time rather than reject
    // the import; elapsedSeconds is simply 0 in that case.
    const startedAt = timestamped.length ? new Date(Math.min(...timestamped.map((p) => p.t!.getTime()))) : new Date();
    const finishedAt = timestamped.length ? new Date(Math.max(...timestamped.map((p) => p.t!.getTime()))) : startedAt;

    const simplified = simplifyPoints(points, 5);
    const geometry = { type: 'LineString' as const, coordinates: simplified.map((p) => [p.lng, p.lat]) };
    const geojson = JSON.stringify(geometry);
    const samples = buildActivityTrackSamples(points, startedAt);
    const aggregates = computeAggregates(points);

    const id = randomUUID();
    const now = new Date();

    await this.prisma.$executeRaw`
      INSERT INTO activity_tracks (
        id, "userId", "adventurePageId", "tripReportId", "activityTypeId", name, notes,
        geometry, samples, "sampleCount", "startedAt", "finishedAt", "elapsedSeconds",
        "movingSeconds", "distanceMeters", "ascentMeters", "descentMeters",
        "minElevationMeters", "maxElevationMeters", source, visibility,
        "privacyTrimMeters", "clientUuid", "originalFileUrl", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${userId}, NULL, NULL, ${fields.activityTypeId}, ${fields.name ?? null}, ${fields.notes ?? null},
        ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), ${JSON.stringify(samples)}::jsonb, ${samples.length},
        ${startedAt}, ${finishedAt}, ${Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)},
        NULL, ${aggregates.distanceMeters}, ${aggregates.ascentMeters}, ${aggregates.descentMeters},
        ${aggregates.minElevationMeters}, ${aggregates.maxElevationMeters},
        ${source}::"ActivityTrackSource", ${fields.visibility ?? 'PRIVATE'}::"ActivityTrackVisibility",
        ${DEFAULT_PRIVACY_TRIM_METERS}, ${fields.clientUuid ?? null}, ${fields.originalFileUrl ?? null},
        true, ${now}, ${now}
      )
      ON CONFLICT ("userId", "clientUuid") DO NOTHING
    `;

    // clientUuid idempotency: a retried upload with the same key returns the
    // existing row rather than erroring or silently returning nothing.
    if (fields.clientUuid) {
      const existing = await this.prisma.activityTrack.findUnique({
        where: { userId_clientUuid: { userId, clientUuid: fields.clientUuid } },
        select: { id: true },
      });
      if (existing) return this.get(existing.id, userId);
    }

    return this.get(id, userId);
  }

  async importFile(
    userId: string,
    points: ParsedTrackPoint[],
    dto: ImportActivityTrackDto,
    originalFileUrl?: string,
  ): Promise<ActivityTrackRow> {
    return this.persist(userId, points, ActivityTrackSource.IMPORTED, { ...dto, originalFileUrl });
  }

  async create(userId: string, dto: CreateActivityTrackDto): Promise<ActivityTrackRow> {
    const points: ParsedTrackPoint[] = dto.points.map((p) => ({ lng: p.lng, lat: p.lat, ele: p.ele, t: new Date(p.t) }));
    return this.persist(userId, points, ActivityTrackSource.RECORDED, dto);
  }

  // viewerRole bypasses both the visibility gate and the trim - admin
  // moderation (list/show/delete on someone else's PRIVATE track) needs the
  // real row, not what a stranger would see.
  async get(id: string, viewerId: string | undefined, viewerRole?: Role): Promise<ActivityTrackRow> {
    const rows = await this.prisma.$queryRawUnsafe<ActivityTrackRow[]>(
      `SELECT ${ROW_COLUMNS} FROM activity_tracks WHERE id = $1 AND "isActive" = true`,
      id,
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Activity track ${id} not found`);
    }
    const row = rows[0];
    const isOwner = viewerId === row.userId;
    const isAdmin = viewerRole === Role.ADMIN;

    if (!isOwner && !isAdmin && row.visibility !== ActivityTrackVisibility.PUBLIC) {
      throw new NotFoundException(`Activity track ${id} not found`);
    }
    if (isOwner || isAdmin) {
      return row;
    }
    return this.trimForNonOwner(row);
  }

  // End-trimmed for non-owners - drop samples/geometry within
  // privacyTrimMeters of either end, per ACTIVITY_TRACKS.md's Privacy section.
  private trimForNonOwner(row: ActivityTrackRow): ActivityTrackRow {
    const trim = row.privacyTrimMeters ?? DEFAULT_PRIVACY_TRIM_METERS;
    const samples = row.samples as Array<{ d: number; e?: number; t?: number }>;
    const totalDistance = row.distanceMeters;
    const kept = samples.filter((s) => s.d >= trim && s.d <= totalDistance - trim);

    const geometry = row.geometry as { type: 'LineString'; coordinates: [number, number][] };
    const trimmedCoords = trimLineStringByDistance(geometry.coordinates, trim, totalDistance);

    return {
      ...row,
      samples: kept.map(({ t: _t, ...rest }) => rest), // timestamps are the owner's private data
      geometry: { type: 'LineString', coordinates: trimmedCoords },
    };
  }

  async update(id: string, currentUser: AuthenticatedUser, dto: UpdateActivityTrackDto): Promise<ActivityTrackRow> {
    const track = await this.requireOwnerOrAdmin(id, currentUser);
    await this.prisma.activityTrack.update({
      where: { id: track.id },
      data: { name: dto.name, notes: dto.notes, visibility: dto.visibility },
    });
    return this.get(id, currentUser.userId);
  }

  async delete(id: string, currentUser: AuthenticatedUser): Promise<{ success: true }> {
    const track = await this.requireOwnerOrAdmin(id, currentUser);
    await this.prisma.activityTrack.update({ where: { id: track.id }, data: { isActive: false } });
    return { success: true };
  }

  // Cursor-paginated - a deliberate first divergence from the repo's
  // offset-only convention, wrong for an infinite activity feed with no
  // pageSize cap. Cursor = base64("<startedAt ISO>|<id>"), ordered newest first.
  async listForUser(targetUserId: string, viewerId: string | undefined, cursor?: string, limit = 20) {
    const capped = Math.min(Math.max(limit, 1), 100);
    const isOwner = viewerId === targetUserId;
    const cursorClause = cursor ? decodeCursor(cursor) : null;

    const rows = await this.prisma.$queryRawUnsafe<ActivityTrackRow[]>(
      `SELECT ${ROW_COLUMNS} FROM activity_tracks
       WHERE "userId" = $1 AND "isActive" = true
         AND ($2::boolean OR visibility = 'PUBLIC'::"ActivityTrackVisibility")
         AND ($3::timestamp IS NULL OR ("startedAt", id) < ($3::timestamp, $4))
       ORDER BY "startedAt" DESC, id DESC
       LIMIT $5`,
      targetUserId,
      isOwner,
      cursorClause?.startedAt ?? null,
      cursorClause?.id ?? null,
      capped + 1,
    );

    const hasMore = rows.length > capped;
    const page = rows.slice(0, capped);
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    return { data: isOwner ? page : page.map((r) => this.trimForNonOwner(r)), nextCursor };
  }

  // Delta sync for apps/mobile (MOBILE_PLAN.md Phase 0 fixed two bugs here):
  //  - tombstones: deletes are soft (isActive=false), so a naive
  //    "isActive = true" filter meant a track deleted on one device never
  //    disappeared on another. Deleted rows now come back trimmed to the
  //    minimal {id, isActive, updatedAt} shape a client needs to evict its
  //    local copy - full geometry/samples serve no purpose for a tombstone.
  //  - bounded: unpaginated was fine for a small delta, but unbounded on a
  //    fresh install where since=epoch. Cursor-paginated like
  //    listForUser, ordered by (updatedAt, id) so ties don't drop rows.
  async listSince(userId: string, since?: string, cursor?: string, limit = 200) {
    const capped = Math.min(Math.max(limit, 1), 500);
    const sinceDate = since ? new Date(since) : new Date(0);
    const cursorClause = cursor ? decodeSyncCursor(cursor) : null;

    const rows = await this.prisma.$queryRawUnsafe<ActivityTrackRow[]>(
      `SELECT ${ROW_COLUMNS} FROM activity_tracks
       WHERE "userId" = $1 AND "updatedAt" > $2
         AND ($3::timestamp IS NULL OR ("updatedAt", id) > ($3::timestamp, $4))
       ORDER BY "updatedAt" ASC, id ASC
       LIMIT $5`,
      userId,
      sinceDate,
      cursorClause?.updatedAt ?? null,
      cursorClause?.id ?? null,
      capped + 1,
    );

    const hasMore = rows.length > capped;
    const page = rows.slice(0, capped);
    const nextCursor = hasMore ? encodeSyncCursor(page[page.length - 1]) : null;

    return { data: page.map((r) => (r.isActive ? r : toTombstone(r))), nextCursor };
  }

  // admin-only flat listing across all users, for the read + moderate admin
  // area - mirrors TrailsService.listAll/SpotsService.listAll's offset
  // pagination (an admin table, not an infinite feed, so cursor pagination
  // isn't needed here the way it is for listForUser).
  async listAllForAdmin(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [data, totalRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<(ActivityTrackRow & { userEmail: string })[]>(
        `SELECT ${ROW_COLUMNS_T}, u.email AS "userEmail"
         FROM activity_tracks t JOIN users u ON u.id = t."userId"
         WHERE t."isActive" = true
         ORDER BY t."createdAt" DESC
         LIMIT $1 OFFSET $2`,
        pageSize,
        offset,
      ),
      this.prisma.activityTrack.count({ where: { isActive: true } }),
    ]);
    return { data, total: totalRows, page, pageSize };
  }

  // Creates a new Trail, source: RECORDED_ACTIVITY - a raw GPS trace is a
  // poor canonical trail (noise, switchback jitter, stop clusters), so
  // promotion re-simplifies via TrailsService's own create() path rather
  // than copying the track's geometry verbatim.
  async promoteToTrail(id: string, userId: string, dto: PromoteToTrailDto) {
    const track = await this.get(id, userId);
    if (track.userId !== userId) {
      throw new ForbiddenException('Only the track owner can promote it to a trail');
    }
    return this.trails.create(
      dto.adventurePageId,
      userId,
      { name: dto.name ?? track.name ?? undefined, geometry: track.geometry as never },
      'RECORDED_ACTIVITY',
    );
  }

  // Routes through the existing TrailsService.update() rather than a
  // parallel write path - once GEODATA_HISTORY.md's revision history is in
  // play (it is, as of Phase 15), this becomes a TrailRevision with
  // editSummary: "From recorded activity" for free.
  async proposeTrailUpdate(id: string, userId: string, dto: ProposeTrailUpdateDto) {
    const track = await this.get(id, userId);
    if (track.userId !== userId) {
      throw new ForbiddenException('Only the track owner can propose a trail update');
    }
    return this.trails.update(dto.trailId, userId, {
      geometry: track.geometry as never,
      editSummary: 'From recorded activity',
    });
  }

  private async requireOwnerOrAdmin(id: string, currentUser: AuthenticatedUser): Promise<ActivityTrackRow> {
    const track = await this.get(id, currentUser.userId, currentUser.role);
    if (track.userId !== currentUser.userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the owner or an admin can modify this activity track');
    }
    return track;
  }
}

function trimLineStringByDistance(coords: [number, number][], trimMeters: number, totalMeters: number): [number, number][] {
  if (coords.length < 2) return coords;
  const withDistance: { coord: [number, number]; d: number }[] = [{ coord: coords[0], d: 0 }];
  for (let i = 1; i < coords.length; i++) {
    const prev = withDistance[i - 1];
    const d = prev.d + haversineMeters({ lng: coords[i - 1][0], lat: coords[i - 1][1] }, { lng: coords[i][0], lat: coords[i][1] });
    withDistance.push({ coord: coords[i], d });
  }
  const kept = withDistance.filter((p) => p.d >= trimMeters && p.d <= totalMeters - trimMeters);
  return kept.length >= 2 ? kept.map((p) => p.coord) : coords;
}

function encodeCursor(row: ActivityTrackRow): string {
  return Buffer.from(`${row.startedAt.toISOString()}|${row.id}`).toString('base64');
}

function decodeCursor(cursor: string): { startedAt: Date; id: string } {
  const [startedAt, id] = Buffer.from(cursor, 'base64').toString('utf-8').split('|');
  return { startedAt: new Date(startedAt), id };
}

// Deleted rows carry no useful geometry/samples for a sync client - just
// enough to evict the local copy.
function toTombstone(row: ActivityTrackRow): Pick<ActivityTrackRow, 'id' | 'isActive' | 'updatedAt'> {
  return { id: row.id, isActive: row.isActive, updatedAt: row.updatedAt };
}

function encodeSyncCursor(row: ActivityTrackRow): string {
  return Buffer.from(`${row.updatedAt.toISOString()}|${row.id}`).toString('base64');
}

function decodeSyncCursor(cursor: string): { updatedAt: Date; id: string } {
  const [updatedAt, id] = Buffer.from(cursor, 'base64').toString('utf-8').split('|');
  return { updatedAt: new Date(updatedAt), id };
}
