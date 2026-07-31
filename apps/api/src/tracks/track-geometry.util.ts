import { BadRequestException } from '@nestjs/common';
import { ParsedTrackPoint } from './parsers/types';

// Buffered beyond Nepal's real extent (80.0-88.3E, 26.3-30.5N) so a
// legitimate near-border trail isn't rejected - a rough guard against
// obviously-wrong uploads, not a precise boundary check.
const NEPAL_BBOX = { minLng: 79, maxLng: 89, minLat: 25.5, maxLat: 31 };

export function assertWithinNepal(points: { lng: number; lat: number }[]): void {
  const inBounds = points.some(
    (p) => p.lng >= NEPAL_BBOX.minLng && p.lng <= NEPAL_BBOX.maxLng && p.lat >= NEPAL_BBOX.minLat && p.lat <= NEPAL_BBOX.maxLat,
  );
  if (!inBounds) {
    throw new BadRequestException('This track falls entirely outside Nepal');
  }
}

// Haversine - accurate enough for trek-scale distances, no external
// dependency, matches the repo's hand-rolled-over-imported instinct.
const EARTH_RADIUS_METERS = 6371000;

export function haversineMeters(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Perpendicular distance from point p to the line through a-b, in metres -
// equirectangular approximation (fine at trail scale, avoids a full
// great-circle cross-track-distance formula for a display-only simplification).
function perpendicularDistanceMeters(p: ParsedTrackPoint, a: ParsedTrackPoint, b: ParsedTrackPoint): number {
  const toXY = (pt: ParsedTrackPoint) => ({
    x: pt.lng * Math.cos((a.lat * Math.PI) / 180) * 111320,
    y: pt.lat * 110540,
  });
  const pXY = toXY(p);
  const aXY = toXY(a);
  const bXY = toXY(b);
  const dx = bXY.x - aXY.x;
  const dy = bXY.y - aXY.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(pXY.x - aXY.x, pXY.y - aXY.y);
  const t = ((pXY.x - aXY.x) * dx + (pXY.y - aXY.y) * dy) / lengthSq;
  const projX = aXY.x + Math.max(0, Math.min(1, t)) * dx;
  const projY = aXY.y + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(pXY.x - projX, pXY.y - projY);
}

// Douglas-Peucker - the same algorithm ST_Simplify/ST_SimplifyPreserveTopology
// wrap in PostGIS, hand-rolled here since this runs on parsed points before
// they ever become a PostGIS geometry. ~5m tolerance drops 80-90% of points
// with no visible change at any map zoom (ACTIVITY_TRACKS.md's storage-volume
// mitigation).
export function simplifyPoints(points: ParsedTrackPoint[], toleranceMeters = 5): ParsedTrackPoint[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistanceMeters(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > toleranceMeters) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), toleranceMeters);
    const right = simplifyPoints(points.slice(maxIndex), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

export interface TrackAggregates {
  distanceMeters: number;
  ascentMeters: number;
  descentMeters: number;
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
}

export function computeAggregates(points: ParsedTrackPoint[]): TrackAggregates {
  let distanceMeters = 0;
  let ascentMeters = 0;
  let descentMeters = 0;
  let minElevationMeters: number | null = null;
  let maxElevationMeters: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (typeof point.ele === 'number') {
      minElevationMeters = minElevationMeters === null ? point.ele : Math.min(minElevationMeters, point.ele);
      maxElevationMeters = maxElevationMeters === null ? point.ele : Math.max(maxElevationMeters, point.ele);
    }
    if (i === 0) continue;
    const prev = points[i - 1];
    distanceMeters += haversineMeters(prev, point);
    if (typeof prev.ele === 'number' && typeof point.ele === 'number') {
      const delta = point.ele - prev.ele;
      if (delta > 0) ascentMeters += delta;
      else descentMeters += -delta;
    }
  }

  return {
    distanceMeters: Math.round(distanceMeters),
    ascentMeters: Math.round(ascentMeters),
    descentMeters: Math.round(descentMeters),
    minElevationMeters,
    maxElevationMeters,
  };
}

// [{ d: <metres along path>, e: <metres elevation> }, ...] for
// TrailElevationProfile.samples - points lacking elevation are skipped
// entirely, since an elevation profile with holes in it is meaningless.
// Downsample-adaptively (one point per ~10m), capped hard regardless -
// ACTIVITY_TRACKS.md's storage-volume mitigation, which this doc's samples
// sidecar shares the reasoning with.
const MAX_SAMPLES = 2000;

export function buildSamples(points: ParsedTrackPoint[]): Array<{ d: number; e: number }> {
  const samples: Array<{ d: number; e: number }> = [];
  let cumulativeDistance = 0;
  let lastSampleDistance = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (i > 0) {
      cumulativeDistance += haversineMeters(points[i - 1], point);
    }
    if (typeof point.ele !== 'number') continue;

    const isEndpoint = i === 0 || i === points.length - 1;
    if (!isEndpoint && cumulativeDistance - lastSampleDistance < 10) continue;

    samples.push({ d: Math.round(cumulativeDistance), e: Math.round(point.ele) });
    lastSampleDistance = cumulativeDistance;

    if (samples.length >= MAX_SAMPLES) break;
  }

  return samples;
}

// ActivityTrack's variant: every point contributes (elevation optional,
// never skipped for lacking it), and time is included since - unlike a
// public Trail - a user-owned recording's timestamps are the entire point
// (ACTIVITY_TRACKS.md's privacy note). One point per ~10m or ~5s, whichever
// comes first.
export function buildActivityTrackSamples(
  points: ParsedTrackPoint[],
  startedAt: Date,
): Array<{ d: number; e?: number; t?: number }> {
  const samples: Array<{ d: number; e?: number; t?: number }> = [];
  let cumulativeDistance = 0;
  let lastSampleDistance = -Infinity;
  let lastSampleTime = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (i > 0) {
      cumulativeDistance += haversineMeters(points[i - 1], point);
    }

    const elapsedSeconds = point.t ? (point.t.getTime() - startedAt.getTime()) / 1000 : undefined;
    const dueByDistance = cumulativeDistance - lastSampleDistance >= 10;
    const dueByTime = elapsedSeconds !== undefined && elapsedSeconds - lastSampleTime >= 5;
    const isEndpoint = i === 0 || i === points.length - 1;

    if (!isEndpoint && !dueByDistance && !dueByTime) continue;

    samples.push({
      d: Math.round(cumulativeDistance),
      ...(typeof point.ele === 'number' ? { e: Math.round(point.ele) } : {}),
      ...(elapsedSeconds !== undefined ? { t: Math.round(elapsedSeconds) } : {}),
    });
    lastSampleDistance = cumulativeDistance;
    if (elapsedSeconds !== undefined) lastSampleTime = elapsedSeconds;

    if (samples.length >= MAX_SAMPLES) break;
  }

  return samples;
}
