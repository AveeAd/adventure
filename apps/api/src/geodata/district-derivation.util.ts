import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Fires from trail/spot create and geometry-update - never client-driven,
// the same instinct as searchVector/notification side effects applied to a
// third kind of derived state. See FEATURE.md §4's "Derivation rule".
//
// MANUAL always wins: the unique constraint is [adventurePageId, districtId],
// so a derived row can't coexist with a manual one for the same district -
// insert derived rows ON CONFLICT DO NOTHING. This is additive only -
// derivation may add rows; it may never delete or downgrade a MANUAL one,
// so an edit that moves a trail out of a district it used to touch does not
// remove that district's tag (see the doc's open decisions on this).
export async function deriveDistrictTags(
  prisma: PrismaService | Prisma.TransactionClient,
  table: 'trails' | 'spots',
  rowId: string,
  adventurePageId: string,
): Promise<void> {
  const predicate = table === 'trails' ? 'ST_Intersects' : 'ST_Contains';
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO adventure_page_districts (id, "adventurePageId", "districtId", source, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), $1, d.id, 'DERIVED', now(), now()
      FROM districts d, ${table} t
      WHERE t.id = $2 AND d.boundary IS NOT NULL AND ${predicate}(d.boundary, t.geometry)
      ON CONFLICT ("adventurePageId", "districtId") DO NOTHING
    `,
    adventurePageId,
    rowId,
  );
}
