import { BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ParsedTrackFile, ParsedWaypoint, toArray } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true,
});

interface RawPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

function toPoint(raw: RawPoint) {
  return {
    lng: raw.lon,
    lat: raw.lat,
    ele: typeof raw.ele === 'number' ? raw.ele : undefined,
    t: raw.time ? new Date(raw.time) : undefined,
  };
}

// fast-xml-parser dependency-light choice per TRAIL_ELEVATION.md, over
// @tmcw/togeojson (wants a DOM, would need a shim in the API container).
export function parseGpx(xml: string): ParsedTrackFile {
  let doc: { gpx?: { wpt?: RawPoint | RawPoint[]; trk?: unknown } };
  try {
    doc = parser.parse(xml);
  } catch {
    throw new BadRequestException('Could not parse GPX file');
  }
  const gpx = doc.gpx;
  if (!gpx) {
    throw new BadRequestException('Not a valid GPX file');
  }

  const waypoints: ParsedWaypoint[] = toArray(gpx.wpt).map((wpt) => ({
    lng: wpt.lon,
    lat: wpt.lat,
    ele: typeof wpt.ele === 'number' ? wpt.ele : undefined,
    name: (wpt as RawPoint & { name?: string }).name,
  }));

  const rawTrks = toArray(gpx.trk as { name?: string; trkseg?: { trkpt?: RawPoint | RawPoint[] } | Array<{ trkpt?: RawPoint | RawPoint[] }> } | undefined);

  const tracks = rawTrks.map((trk) => {
    // Segments join into one track - a <trkseg> break is GPS signal loss,
    // not a new activity. Separate <trk> elements stay separate tracks.
    const segments = toArray(trk.trkseg);
    const points = segments.flatMap((seg) => toArray(seg.trkpt).map(toPoint));
    return { name: trk.name, points };
  });

  return { tracks, waypoints };
}
