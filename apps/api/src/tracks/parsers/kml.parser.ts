import { BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { ParsedTrack, ParsedTrackFile, ParsedWaypoint, toArray } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

interface RawPlacemark {
  name?: string;
  LineString?: { coordinates?: string };
  Point?: { coordinates?: string };
}

// "lng,lat[,ele] lng,lat[,ele] ..." - whitespace/newline separated tuples.
// No per-point time in plain KML (gx:Track's <when> extension isn't
// supported here) - acceptable for what maps.me/Google Earth typically export.
function parseCoordinates(raw: string): { lng: number; lat: number; ele?: number }[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const [lng, lat, ele] = tuple.split(',').map(Number);
      return { lng, lat, ele: Number.isFinite(ele) ? ele : undefined };
    });
}

function parseKmlText(xml: string): ParsedTrackFile {
  let doc: { kml?: { Document?: { Placemark?: RawPlacemark | RawPlacemark[] }; Placemark?: RawPlacemark | RawPlacemark[] } };
  try {
    doc = parser.parse(xml);
  } catch {
    throw new BadRequestException('Could not parse KML file');
  }
  const kml = doc.kml;
  if (!kml) {
    throw new BadRequestException('Not a valid KML file');
  }

  const placemarks = toArray(kml.Document?.Placemark ?? kml.Placemark);

  const tracks: ParsedTrack[] = [];
  const waypoints: ParsedWaypoint[] = [];

  for (const placemark of placemarks) {
    if (placemark.LineString?.coordinates) {
      tracks.push({ name: placemark.name, points: parseCoordinates(placemark.LineString.coordinates) });
    } else if (placemark.Point?.coordinates) {
      const [point] = parseCoordinates(placemark.Point.coordinates);
      if (point) {
        waypoints.push({ ...point, name: placemark.name });
      }
    }
  }

  return { tracks, waypoints };
}

export function parseKml(xml: string): ParsedTrackFile {
  return parseKmlText(xml);
}

// KMZ is a zip - what maps.me actually exports. Guard decompressed size
// against zip bombs before extracting.
const MAX_KMZ_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

export function parseKmz(buffer: Buffer): ParsedTrackFile {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new BadRequestException('Could not read KMZ archive');
  }

  const entries = zip.getEntries();
  const totalUncompressed = entries.reduce((sum, entry) => sum + entry.header.size, 0);
  if (totalUncompressed > MAX_KMZ_UNCOMPRESSED_BYTES) {
    throw new BadRequestException('KMZ archive is too large once decompressed');
  }

  const kmlEntry = entries.find((entry) => entry.entryName.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) {
    throw new BadRequestException('KMZ archive contains no .kml file');
  }

  return parseKmlText(kmlEntry.getData().toString('utf-8'));
}
