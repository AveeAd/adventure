// One-off data-import script for Nepal's real administrative geography
// (Country -> Province -> District -> Municipality), per DATABASE.md's
// documented exception to the "no seed script" rule: this is static public
// reference data, not user-curated content, so entering it row-by-row
// through admin CRUD isn't reasonable. Source fixture: seed-data/nepal-locations.json
// (derived from the `nepal-places` npm package). Idempotent - safe to re-run.
import { MunicipalityType, PrismaClient } from '@prisma/client';
import locations from '../seed-data/nepal-locations.json';

const prisma = new PrismaClient();

// Districts covering the restricted regions named in IDEA.md (Annapurna's
// Nar-Phu/restricted area, Manaslu, Upper Mustang) - trekking here requires
// a licensed agency, not just any local guide.
const RESTRICTED_AGENCY_DISTRICTS = new Set(['manang', 'mustang', 'gorkha']);

async function main() {
  const country = await prisma.country.upsert({
    where: { isoCode: 'NP' },
    update: {},
    create: { name: 'Nepal', isoCode: 'NP' },
  });

  const provinceIdByLocalId = new Map<number, string>();
  for (const p of locations.provinces) {
    const row = await prisma.province.upsert({
      where: { countryId_slug: { countryId: country.id, slug: p.slug } },
      update: { name: p.name },
      create: { countryId: country.id, name: p.name, slug: p.slug },
    });
    provinceIdByLocalId.set(p.id, row.id);
  }

  const districtIdByLocalId = new Map<number, string>();
  for (const d of locations.districts) {
    const provinceId = provinceIdByLocalId.get(d.province_id);
    if (!provinceId) throw new Error(`Unknown province_id ${d.province_id} for district ${d.name}`);
    const row = await prisma.district.upsert({
      where: { provinceId_slug: { provinceId, slug: d.slug } },
      update: { name: d.name },
      create: {
        provinceId,
        name: d.name,
        slug: d.slug,
        requiresRegisteredAgency: RESTRICTED_AGENCY_DISTRICTS.has(d.slug),
      },
    });
    districtIdByLocalId.set(d.id, row.id);
  }

  for (const m of locations.municipalities) {
    const districtId = districtIdByLocalId.get(m.district_id);
    if (!districtId) throw new Error(`Unknown district_id ${m.district_id} for municipality ${m.name}`);
    await prisma.municipality.upsert({
      where: { districtId_slug: { districtId, slug: m.slug } },
      update: { name: m.name, type: m.type as MunicipalityType },
      create: { districtId, name: m.name, slug: m.slug, type: m.type as MunicipalityType },
    });
  }

  console.log(
    `Imported ${locations.provinces.length} provinces, ${locations.districts.length} districts, ${locations.municipalities.length} municipalities.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
