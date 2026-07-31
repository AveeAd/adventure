import { BadRequestException } from '@nestjs/common';
import { ParsedTrack, ParsedTrackFile, ParsedWaypoint } from './types';

interface GeoJsonFeature {
  type: 'Feature';
  properties?: { name?: string; coordTimes?: string[] | string[][] };
  geometry:
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'MultiLineString'; coordinates: number[][][] }
    | { type: 'Point'; coordinates: number[] };
}

function toPoint([lng, lat, ele]: number[], t?: string) {
  return { lng, lat, ele: typeof ele === 'number' ? ele : undefined, t: t ? new Date(t) : undefined };
}

function featureToTrack(feature: GeoJsonFeature): ParsedTrack | null {
  const name = feature.properties?.name;

  if (feature.geometry.type === 'LineString') {
    const coordTimes = (feature.properties?.coordTimes as string[] | undefined) ?? [];
    return { name, points: feature.geometry.coordinates.map((c, i) => toPoint(c, coordTimes[i])) };
  }

  // MultiLineString parts join into one track, same rule as GPX <trkseg>
  // segments - a gap between parts is a data artifact, not a new activity.
  if (feature.geometry.type === 'MultiLineString') {
    const coordTimesPerLine = (feature.properties?.coordTimes as string[][] | undefined) ?? [];
    const points = feature.geometry.coordinates.flatMap((line, lineIndex) =>
      line.map((c, i) => toPoint(c, coordTimesPerLine[lineIndex]?.[i])),
    );
    return { name, points };
  }

  return null;
}

interface GeoJsonDoc {
  type: 'FeatureCollection' | 'Feature';
  features?: GeoJsonFeature[];
  properties?: GeoJsonFeature['properties'];
  geometry?: GeoJsonFeature['geometry'];
}

export function parseGeoJson(text: string): ParsedTrackFile {
  let doc: GeoJsonDoc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new BadRequestException('Could not parse GeoJSON file');
  }

  const features: GeoJsonFeature[] =
    doc.type === 'FeatureCollection' ? (doc.features ?? []) : doc.type === 'Feature' ? [doc as GeoJsonFeature] : [];

  if (features.length === 0) {
    throw new BadRequestException('GeoJSON file contains no usable features');
  }

  const tracks: ParsedTrack[] = [];
  const waypoints: ParsedWaypoint[] = [];

  for (const feature of features) {
    if (feature.geometry?.type === 'Point') {
      const [lng, lat, ele] = feature.geometry.coordinates;
      waypoints.push({ lng, lat, ele: typeof ele === 'number' ? ele : undefined, name: feature.properties?.name });
      continue;
    }
    const track = featureToTrack(feature);
    if (track) tracks.push(track);
  }

  return { tracks, waypoints };
}
