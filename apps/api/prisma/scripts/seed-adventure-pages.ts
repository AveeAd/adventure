// Bulk-imports adventure pages from a spreadsheet export
// (prisma/seed-data/adventure-pages.csv). Each row becomes an AdventurePage + its v1
// PageRevision, matching seed-dev-data.ts's "page and first revision in one
// transaction" convention. Requires seed-master-data.ts, import-locations.ts,
// and seed-dev-data.ts (for the demo users/GuideProfiles used as editors) to
// have already run. Idempotent by page slug - safe to re-run.
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const CSV_PATH = join(__dirname, '../seed-data/adventure-pages.csv');

type Row = {
  title: string;
  slug: string;
  summary: string;
  activityType: string;
  difficultyLevel: string;
  durationMinDays: string;
  durationMaxDays: string;
  maxAltitudeMeters: string;
  districts: string;
  seasons: string;
  tags: string;
  editorEmail: string;
  content: string;
  approvalStatus: string;
};

// Minimal RFC4180 parser (quoted fields with embedded commas/newlines/"" escapes)
// - no csv-parsing dependency exists in apps/api today, and this is a one-off
// import script, not something worth adding a package for.
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map((cols) => {
    const obj = {} as Row;
    header.forEach((key, i) => {
      (obj as unknown as Record<string, string>)[key] = (cols[i] ?? '').trim();
    });
    return obj;
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

// The sheet used "summer" as shorthand; the actual seeded Season slug is
// "summer-monsoon" (seed-master-data.ts).
const SEASON_SLUG_ALIASES: Record<string, string> = {
  summer: 'summer-monsoon',
};

// The sheet predates Nepal's 2017 split of Rukum into Rukum East (Province 5)
// and Rukum West (Karnali) - import-locations.ts only has the two split
// districts. Dhorpatan Hunting Reserve sits mostly in Rukum East.
const DISTRICT_SLUG_ALIASES: Record<string, string> = {
  rukum: 'rukum-east',
};

function requireByKey<T extends { id: string }, K extends keyof T>(
  rows: T[],
  key: K,
  value: T[K],
  label: string,
): T {
  const found = rows.find((r) => r[key] === value);
  if (!found) {
    throw new Error(`Missing ${label} "${String(value)}" - run seed-master-data.ts / import-locations.ts first.`);
  }
  return found;
}

async function main() {
  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(csvText);

  const [activityTypes, difficultyLevels, seasons, tags, districts] = await Promise.all([
    prisma.activityType.findMany(),
    prisma.difficultyLevel.findMany(),
    prisma.season.findMany(),
    prisma.tag.findMany(),
    prisma.district.findMany(),
  ]);

  // Demo users created by seed-dev-data.ts - round-robin as editors.
  const editorEmails = [
    'alice.trekker@example.com',
    'bob.explorer@example.com',
    'carol.guide@example.com',
    'dawa.guide@example.com',
  ];
  const editors = await Promise.all(
    editorEmails.map((email) =>
      prisma.user.findUniqueOrThrow({
        where: { email },
      }).catch(() => {
        throw new Error(`Missing demo user "${email}" - run seed-dev-data.ts first.`);
      }),
    ),
  );

  let created = 0;
  let skipped = 0;

  for (const [i, row] of rows.entries()) {
    if (!row.title) continue;

    const slug = row.slug || slugify(row.title);
    const activityType = requireByKey(activityTypes, 'slug', row.activityType, 'activity type');
    const difficultyLevel = row.difficultyLevel
      ? requireByKey(difficultyLevels, 'slug', row.difficultyLevel, 'difficulty level')
      : null;
    const districtRows = splitList(row.districts).map((d) => {
      const canonical = DISTRICT_SLUG_ALIASES[d] ?? d;
      return requireByKey(districts, 'slug', canonical, 'district');
    });
    const seasonRows = splitList(row.seasons).map((s) => {
      const canonical = SEASON_SLUG_ALIASES[s] ?? s;
      return requireByKey(seasons, 'slug', canonical, 'season');
    });
    const tagRows = splitList(row.tags).map((t) => requireByKey(tags, 'slug', slugify(t), 'tag'));

    const editor = editors[i % editors.length];
    const content = row.content || `# ${row.title}\n\n${row.summary}`;
    const approvalStatus = (row.approvalStatus || 'APPROVED') as 'APPROVED' | 'PENDING' | 'REJECTED';

    const existing = await prisma.adventurePage.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const page = await tx.adventurePage.create({
        data: {
          title: row.title,
          slug,
          summary: row.summary || null,
          activityTypeId: activityType.id,
          difficultyLevelId: difficultyLevel?.id,
          durationMinDays: row.durationMinDays ? Number(row.durationMinDays) : null,
          durationMaxDays: row.durationMaxDays ? Number(row.durationMaxDays) : null,
          maxAltitudeMeters: row.maxAltitudeMeters ? Number(row.maxAltitudeMeters) : null,
          districts: { create: districtRows.map((d) => ({ districtId: d.id })) },
          seasons: { create: seasonRows.map((s) => ({ seasonId: s.id })) },
          tags: { create: tagRows.map((t) => ({ tagId: t.id })) },
        },
      });

      const now = new Date();
      const revision = await tx.pageRevision.create({
        data: {
          adventurePageId: page.id,
          version: 1,
          editorId: editor.id,
          content,
          approvalStatus,
          ...(approvalStatus === 'APPROVED' ? { resolvedAt: now, resolvedById: editor.id } : {}),
        },
      });

      if (approvalStatus === 'APPROVED') {
        await tx.adventurePage.update({
          where: { id: page.id },
          data: { approvedRevisionId: revision.id, verificationStatus: 'VERIFIED' },
        });
      }
    });
    created++;
  }

  console.log(`Adventure pages: ${created} created, ${skipped} skipped (already existed).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
