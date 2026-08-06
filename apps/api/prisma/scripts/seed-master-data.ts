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
    { name: 'Day Hike', slug: 'day-hike' },
    { name: 'Jeep Tour', slug: 'jeep-tour' },
    { name: 'Pilgrimage Trek', slug: 'pilgrimage-trek' },
    { name: 'Wildlife Safari', slug: 'wildlife-safari' },
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
    // Below: added for the CSV-driven adventure-page import
    // (seed-adventure-pages.ts) - route/peak/region/culture tags pulled from
    // the sheet's `tags` column, deduped against the curated list above.
    'Ama Dablam',
    'Annapurna',
    'Annapurna Base Camp',
    'Annapurna Circuit',
    'Api Himal',
    'Arun Valley',
    'Australian Camp',
    'Badimalika',
    'Bajhang',
    'Bandipur',
    'Bardia',
    'Base Camp',
    'Begnas Lake',
    'Bhujung',
    'Birding',
    'Buddhist Monasteries',
    'Champadevi',
    'Chandragiri',
    'Chitwan',
    'Cho La',
    'Cho La Pass',
    'Cho Oyu',
    'Circuit Trek',
    'Community Trek',
    'Crampons',
    'Crystal Mountain',
    'Cultural Trek',
    'Day Hike',
    'Desert Landscape',
    'Dhaulagiri',
    'Dhaulagiri Circuit',
    'Dhorpatan',
    'Dolpo',
    'Everest',
    'Everest Base Camp',
    'Fixed Ropes',
    'French Pass',
    'Ganesh Himal',
    'Gauri Shankar',
    'Ghalegaun',
    'Ghandruk',
    'Ghorepani',
    'Glacial Lake',
    'Glacial Lakes',
    'Glacier',
    'Glacier Crossing',
    'Gokyo Lakes',
    'Gokyo Ri',
    'Gosaikunda',
    'Gurja Himal',
    'Gurung Culture',
    'Helambu',
    'Heritage Walk',
    'Himalayas',
    'Hinku Valley',
    'Homestay',
    'Horse Trail',
    'Hunting Reserve',
    'Hyolmo Culture',
    'Ice Axe',
    'Ilam',
    'Imja Tse',
    'Island Peak',
    'Jamacho Gumba',
    'Jeep Tour',
    'Jomsom',
    'Jugal Himal',
    'Jumla',
    'Jungle Safari',
    'Kailash View',
    'Kala Patthar',
    'Kali Gandaki',
    'Kalinchowk',
    'Kanchenjunga',
    'Kanchenjunga Circuit',
    'Kang La',
    'Kapuche Lake',
    'Kathmandu Valley',
    'Khaptad',
    'Khas Culture',
    'Khayer Lake',
    'Khopra Ridge',
    'Khumbu',
    'Khumbu Glacier',
    'Kongma La',
    'Kori Himal',
    'Koshi Tappu',
    'Lake Trek',
    'Lamjung Himal',
    'Langtang',
    'Langtang National Park',
    'Langtang Valley',
    'Larkya La',
    'Laurebina Pass',
    'Lhotse',
    'Limbu Culture',
    'Lo Manthang',
    'Lobuche East',
    'Lower Dolpo',
    'Lumba Sumba',
    'Machhapuchhre',
    'Makalu',
    'Makalu Barun National Park',
    'Makalu Base Camp',
    'Makalu Circuit',
    'Manang',
    'Manaslu',
    'Manaslu Circuit',
    'Mardi Himal',
    'Mera Peak',
    'Milke Danda',
    'Mohare Danda',
    'Mountain Pass',
    'Mountain Views',
    'Mountaineering',
    'Mugu',
    'Muktinath',
    'Mustang',
    'Nagarjun',
    'Nagarkot',
    'Namche Bazaar',
    'Nar Phu Valley',
    'National Park',
    'Newari Culture',
    'Ngozumpa Glacier',
    'North Base Camp',
    'Numbur Cheese Circuit',
    'Panch Pokhari',
    'Pathibhara',
    'Peak Climbing',
    'Phoksundo Lake',
    'Phulchoki',
    'Pikey Peak',
    'Pilgrimage',
    'Pokhara',
    'Poon Hill',
    'Ramaroshan',
    'Rara Lake',
    'Rara National Park',
    'Remote Trek',
    'Renjo La',
    'Renjo La Pass',
    'Restricted Area',
    'Rhino',
    'Rhododendron Forest',
    'Ridge Trek',
    'River Valley',
    'Rolwaling',
    'Rolwaling Valley',
    'Royal Trek',
    'Ruby Valley',
    'Rupa Lake',
    'Rupina La',
    'Sacred Lake',
    'Sacred Lakes',
    'Sacred Site',
    'Sagarmatha National Park',
    'Sailung',
    'Saipal',
    'Sarangkot',
    'Sherpa Culture',
    'Shey Gompa',
    'Shey Phoksundo National Park',
    'Shivapuri',
    'Short Trek',
    'Sikles',
    'Sinja Valley',
    'Sirubari',
    'South Base Camp',
    'Summit',
    'Sunrise Viewpoint',
    'Tamang Culture',
    'Tamang Heritage',
    'Tashi Lapcha',
    'Tea Gardens',
    'Teahouse',
    'Thakali Culture',
    'Thorong La',
    'Three Passes',
    'Tibetan Culture',
    'Tiger',
    'Tilicho Lake',
    'Trans Himalaya',
    'Tsum Valley',
    'Unesco World Heritage',
    'Upper Dolpo',
    'Upper Mustang',
    'Village Trek',
    'Wetlands',
    'Wildlife Safari',
    'Yak Pasture',
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
