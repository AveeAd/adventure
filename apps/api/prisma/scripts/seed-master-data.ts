// Seeds the small hand-picked master-data lookup tables (activity types,
// difficulty levels, seasons, spot types, tags, languages) so a fresh dev DB
// has realistic rows to build content against, instead of an empty admin
// dashboard. Idempotent (upsert by unique name/slug) - safe to re-run.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedActivityTypes() {
  const top = [
    { name: 'Trekking', slug: 'trekking' },
    { name: 'Peak Climbing', slug: 'peak-climbing' },
    { name: 'Cycling', slug: 'cycling' },
    { name: 'Rafting', slug: 'rafting' },
    { name: 'Cultural Tour', slug: 'cultural-tour' },
  ];
  const children: Record<string, { name: string; slug: string }[]> = {
    trekking: [
      { name: 'Teahouse Trekking', slug: 'teahouse-trekking' },
      { name: 'Camping Trekking', slug: 'camping-trekking' },
      { name: 'Restricted-Area Trekking', slug: 'restricted-area-trekking' },
    ],
    'peak-climbing': [
      { name: 'Trekking Peak', slug: 'trekking-peak' },
      { name: 'Expedition Peak', slug: 'expedition-peak' },
    ],
  };

  for (const [i, t] of top.entries()) {
    const row = await prisma.activityType.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: { name: t.name, slug: t.slug, sortOrder: i },
    });
    const kids = children[t.slug] ?? [];
    for (const [j, k] of kids.entries()) {
      await prisma.activityType.upsert({
        where: { slug: k.slug },
        update: { name: k.name, parentId: row.id },
        create: { name: k.name, slug: k.slug, sortOrder: j, parentId: row.id },
      });
    }
  }
}

async function seedDifficultyLevels() {
  const levels = ['Easy', 'Moderate', 'Challenging', 'Strenuous', 'Extreme'];
  for (const [i, name] of levels.entries()) {
    const slug = name.toLowerCase();
    await prisma.difficultyLevel.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, sortOrder: i },
    });
  }
}

async function seedSeasons() {
  const seasons = [
    { name: 'Spring (Mar-May)', slug: 'spring' },
    { name: 'Summer/Monsoon (Jun-Aug)', slug: 'summer-monsoon' },
    { name: 'Autumn (Sep-Nov)', slug: 'autumn' },
    { name: 'Winter (Dec-Feb)', slug: 'winter' },
  ];
  for (const [i, s] of seasons.entries()) {
    await prisma.season.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: { name: s.name, slug: s.slug, sortOrder: i },
    });
  }
}

async function seedSpotTypes() {
  const types = [
    'Viewpoint',
    'Teahouse',
    'Campsite',
    'Water Source',
    'Monastery/Temple',
    'Danger Zone',
    'Checkpoint/Permit Office',
  ];
  for (const [i, name] of types.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await prisma.spotType.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, sortOrder: i },
    });
  }
}

async function seedTags() {
  const tags = [
    'Family-Friendly',
    'Off the Beaten Path',
    'Himalayan Views',
    'UNESCO Site',
    'Wildlife',
    'Hot Springs',
    'High Altitude',
    'Budget-Friendly',
    'Hidden Gem',
    'Pet-Friendly',
  ];
  for (const [i, name] of tags.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, sortOrder: i },
    });
  }
}

async function seedLanguages() {
  const languages = [
    { name: 'Nepali', isoCode: 'ne' },
    { name: 'English', isoCode: 'en' },
    { name: 'Hindi', isoCode: 'hi' },
    { name: 'Newari', isoCode: 'new' },
    { name: 'Tibetan', isoCode: 'bo' },
    { name: 'Sherpa', isoCode: 'xsr' },
    { name: 'Chinese (Mandarin)', isoCode: 'zh' },
    { name: 'French', isoCode: 'fr' },
    { name: 'German', isoCode: 'de' },
    { name: 'Japanese', isoCode: 'ja' },
  ];
  for (const [i, l] of languages.entries()) {
    await prisma.language.upsert({
      where: { isoCode: l.isoCode },
      update: { name: l.name },
      create: { name: l.name, isoCode: l.isoCode, sortOrder: i },
    });
  }
}

async function main() {
  await seedActivityTypes();
  await seedDifficultyLevels();
  await seedSeasons();
  await seedSpotTypes();
  await seedTags();
  await seedLanguages();
  console.log('Master data seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
