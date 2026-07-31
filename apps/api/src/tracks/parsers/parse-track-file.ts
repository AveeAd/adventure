import { BadRequestException } from '@nestjs/common';
import { parseGeoJson } from './geojson.parser';
import { parseGpx } from './gpx.parser';
import { parseKml, parseKmz } from './kml.parser';
import { ParsedTrackFile } from './types';

// Phones and browsers send inconsistent MIME types for these formats, so
// sniff by extension and magic bytes too, not just the declared mimetype -
// per TRAIL_ELEVATION.md/ACTIVITY_TRACKS.md's guardrails.
export function parseTrackFile(originalName: string, mimetype: string, buffer: Buffer): ParsedTrackFile {
  const lowerName = originalName.toLowerCase();

  if (lowerName.endsWith('.kmz') || isZipMagicBytes(buffer)) {
    return parseKmz(buffer);
  }
  if (lowerName.endsWith('.kml') || mimetype === 'application/vnd.google-earth.kml+xml') {
    return parseKml(buffer.toString('utf-8'));
  }
  if (lowerName.endsWith('.geojson') || lowerName.endsWith('.json') || mimetype === 'application/geo+json') {
    return parseGeoJson(buffer.toString('utf-8'));
  }
  if (lowerName.endsWith('.gpx') || mimetype === 'application/gpx+xml') {
    return parseGpx(buffer.toString('utf-8'));
  }

  throw new BadRequestException('Unrecognized track file format - expected .gpx, .kml, .kmz, or .geojson');
}

function isZipMagicBytes(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}
