// Shared intermediate consumed by TRAIL_ELEVATION.md's GPX-import endpoint
// and ACTIVITY_TRACKS.md's importer - one parser module, two destinations.
export interface ParsedTrackPoint {
  lng: number;
  lat: number;
  ele?: number;
  t?: Date;
}

export interface ParsedWaypoint {
  lng: number;
  lat: number;
  ele?: number;
  name?: string;
}

export interface ParsedTrack {
  name?: string;
  points: ParsedTrackPoint[];
}

// A file can contain more than one track (separate <trk> elements, separate
// GeoJSON LineString features, ...) - segments within one track join (a
// segment break is GPS signal loss, not a new activity), per
// ACTIVITY_TRACKS.md's resolution of TRAIL_ELEVATION.md's open question.
export interface ParsedTrackFile {
  tracks: ParsedTrack[];
  waypoints: ParsedWaypoint[];
}

export function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
