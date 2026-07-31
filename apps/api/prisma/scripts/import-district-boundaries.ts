// One-off data-import script for Nepal district boundary polygons, per
// FEATURE.md §4's documented exception to the "no seed script" rule (same
// exception import-locations.ts already uses): static public reference
// data, not user-curated content, so entering it row-by-row through admin
// CRUD isn't reasonable.
//
// Source fixture: seed-data/nepal-district-boundaries.geojson - built from
// the `nepal-geojson` npm package's per-district municipality-level
// polygons, unioned and simplified (ST_SimplifyPreserveTopology, ~0.003deg
// tolerance) down to one MultiPolygon per district. That package is not an
// app dependency - it was installed in a throwaway directory purely to
// extract this fixture, the same "commit a pre-simplified fixture" pattern
// FEATURE.md §4 calls for (full-resolution polygons run to tens of MB;
// tagging needs "which district is this trail in," not cartographic
// precision).
//
// Matched to existing districts by slug. Idempotent - safe to re-run; a
// district with no matching feature in the fixture (partial import, or a
// district added to the DB later) is silently skipped, not an error.
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BoundaryFeature {
  type: 'Feature';
  properties: { slug: string };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

async function main() {
  // .geojson, not .json - resolveJsonModule only recognizes .json, so this
  // reads as text rather than a TS module import (unlike import-locations.ts's
  // nepal-locations.json).
  const raw = readFileSync(join(__dirname, '../seed-data/nepal-district-boundaries.geojson'), 'utf-8');
  const featureCollection = JSON.parse(raw) as { features: BoundaryFeature[] };
  let updated = 0;
  let skipped = 0;

  for (const feature of featureCollection.features) {
    const slug = feature.properties.slug;
    const geojson = JSON.stringify(feature.geometry);

    const result = await prisma.$executeRaw`
      UPDATE districts
      SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)),
          "updatedAt" = now()
      WHERE slug = ${slug}
    `;

    if (result === 0) {
      skipped++;
      console.warn(`No district found for slug "${slug}" - skipped`);
    } else {
      updated++;
    }
  }

  console.log(`District boundaries: ${updated} updated, ${skipped} skipped (no matching district row)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
