// Fake demo content for a fresh local dev DB - users, adventure pages (with
// revisions/districts/seasons/tags), trails/spots, trip reports (with
// media/kudos/comments), a trip group, a club (with threads/replies), and
// guide profiles - so the app doesn't feel empty during local development.
// Not a source of truth for anything; safe to run against an empty DB after
// seed-master-data and import-locations. Re-running upserts by unique keys
// where practical, but this is dev-only fixture data, not idempotent
// production seeding.
//
// Users here have fake `googleId`s since there's no way to pre-create a real
// Google-authenticated account (see ARCHITECTURE.md Sec 8) - fine for local
// dev, never something to run against a real environment.
import { PrismaClient } from '@prisma/client';
import { sanitizeUsernameSeed } from '../../src/common/username';

const prisma = new PrismaClient();

// Same collision-loop shape as UsersService.generateUniqueUsername - this
// script runs standalone (tsx, no Nest DI container), so it can't inject
// that service directly.
async function generateUniqueUsername(seed: string): Promise<string> {
  const base = sanitizeUsernameSeed(seed);
  const existing = await prisma.user.findMany({ where: { username: { startsWith: base } }, select: { username: true } });
  const taken = new Set(existing.map((u) => u.username));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function requireByKey<T extends { id: string }, K extends keyof T>(
  rows: T[],
  key: K,
  value: T[K],
  label: string,
): T {
  const row = rows.find((r) => r[key] === value);
  if (!row) {
    throw new Error(`Missing ${label} "${String(value)}" - run seed-master-data.ts (and import-locations.ts) first.`);
  }
  return row;
}

async function upsertDemoUser(email: string, googleId: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { email, googleId, role: 'USER', username: await generateUniqueUsername(name) },
    }));
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { name },
    create: { userId: user.id, name },
  });
  // MILESTONE_3.md §2.2: GuideProfile is universal since Phase 19 (every
  // real user gets one via AuthService.handleGoogleLogin) - this script
  // bypasses that login flow, so it has to create the row itself or these
  // demo users would never accumulate contribution points/level.
  await prisma.guideProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  return user;
}

async function main() {
  const [activityTypes, difficultyLevels, seasons, tags, spotTypes, districts, languages] = await Promise.all([
    prisma.activityType.findMany(),
    prisma.difficultyLevel.findMany(),
    prisma.season.findMany(),
    prisma.tag.findMany(),
    prisma.spotType.findMany(),
    prisma.district.findMany(),
    prisma.language.findMany(),
  ]);

  const teahouseTrekking = requireByKey(activityTypes, 'slug', 'teahouse-trekking', 'activity type');
  const restrictedTrekking = requireByKey(activityTypes, 'slug', 'restricted-area-trekking', 'activity type');
  const moderate = requireByKey(difficultyLevels, 'slug', 'moderate', 'difficulty level');
  const strenuous = requireByKey(difficultyLevels, 'slug', 'strenuous', 'difficulty level');
  const autumn = requireByKey(seasons, 'slug', 'autumn', 'season');
  const spring = requireByKey(seasons, 'slug', 'spring', 'season');
  const himalayanViews = requireByKey(tags, 'slug', 'himalayan-views', 'tag');
  const unescoSite = requireByKey(tags, 'slug', 'unesco-site', 'tag');
  const viewpoint = requireByKey(spotTypes, 'slug', 'viewpoint', 'spot type');
  const teahouseSpot = requireByKey(spotTypes, 'slug', 'teahouse', 'spot type');
  const kaski = requireByKey(districts, 'slug', 'kaski', 'district');
  const gorkha = requireByKey(districts, 'slug', 'gorkha', 'district');
  const soluDistrict = districts.find((d) => d.slug === 'solukhumbu') ?? kaski;
  const english = requireByKey(languages, 'isoCode', 'en', 'language');
  const nepali = requireByKey(languages, 'isoCode', 'ne', 'language');

  const alice = await upsertDemoUser('alice.trekker@example.com', 'seed-google-alice', 'Alice Sharma');
  const bob = await upsertDemoUser('bob.explorer@example.com', 'seed-google-bob', 'Bob Gurung');
  const carol = await upsertDemoUser('carol.guide@example.com', 'seed-google-carol', 'Carol Tamang');
  const dawa = await upsertDemoUser('dawa.guide@example.com', 'seed-google-dawa', 'Dawa Sherpa');

  // --- Adventure page: Annapurna Base Camp Trek ---
  const abc = await prisma.$transaction(async (tx) => {
    const page = await tx.adventurePage.upsert({
      where: { slug: 'annapurna-base-camp-trek' },
      update: {},
      create: {
        title: 'Annapurna Base Camp Trek',
        slug: 'annapurna-base-camp-trek',
        summary: 'A classic teahouse trek through rhododendron forests to the Annapurna Sanctuary at 4,130m.',
        activityTypeId: teahouseTrekking.id,
        difficultyLevelId: moderate.id,
        durationMinDays: 7,
        durationMaxDays: 12,
        maxAltitudeMeters: 4130,
        districts: { create: [{ districtId: kaski.id }] },
        seasons: { create: [{ seasonId: autumn.id }, { seasonId: spring.id }] },
        tags: { create: [{ tagId: himalayanViews.id }] },
      },
    });
    await tx.pageRevision.upsert({
      where: { adventurePageId_version: { adventurePageId: page.id, version: 1 } },
      update: {},
      create: {
        adventurePageId: page.id,
        version: 1,
        editorId: alice.id,
        content:
          '# Annapurna Base Camp Trek\n\nA 7-12 day teahouse trek from Nayapul through Ghandruk and the Modi Khola gorge ' +
          'up to Annapurna Base Camp (4,130m), with 360-degree views of Annapurna I, Machapuchare, and Hiunchuli.',
      },
    });
    return page;
  });

  // --- Adventure page: Manaslu Circuit Trek (restricted, needs registered agency) ---
  const manaslu = await prisma.$transaction(async (tx) => {
    const page = await tx.adventurePage.upsert({
      where: { slug: 'manaslu-circuit-trek' },
      update: {},
      create: {
        title: 'Manaslu Circuit Trek',
        slug: 'manaslu-circuit-trek',
        summary: 'A remote circuit around Mt. Manaslu (8,163m) crossing Larkya La pass at 5,106m. Restricted area - a licensed agency and special permit are required.',
        activityTypeId: restrictedTrekking.id,
        difficultyLevelId: strenuous.id,
        durationMinDays: 14,
        durationMaxDays: 18,
        maxAltitudeMeters: 5106,
        districts: { create: [{ districtId: gorkha.id }] },
        seasons: { create: [{ seasonId: autumn.id }] },
        tags: { create: [{ tagId: himalayanViews.id }, { tagId: unescoSite.id }] },
      },
    });
    await tx.pageRevision.upsert({
      where: { adventurePageId_version: { adventurePageId: page.id, version: 1 } },
      update: {},
      create: {
        adventurePageId: page.id,
        version: 1,
        editorId: bob.id,
        content:
          '# Manaslu Circuit Trek\n\nA remote, restricted-area circuit around Mt. Manaslu, crossing the Larkya La pass ' +
          '(5,106m). Requires a Manaslu Restricted Area Permit (MRAP), issued only through a licensed trekking agency.',
      },
    });
    return page;
  });

  // --- Trails (LineString geometry - raw SQL, see geodata/trails.service.ts) ---
  async function upsertTrail(pageId: string, name: string, coords: [number, number][], distanceMeters: number) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM trails WHERE "adventurePageId" = ${pageId} AND name = ${name} LIMIT 1
    `;
    if (existing.length > 0) return existing[0].id;
    const geojson = JSON.stringify({ type: 'LineString', coordinates: coords });
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO trails (id, "adventurePageId", name, geometry, "distanceMeters", "verificationStatus", "isActive", "createdById", "lastEditedById", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${pageId}, ${name}, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), ${distanceMeters}, 'VERIFIED', true, ${alice.id}, ${alice.id}, now(), now())
      RETURNING id
    `;
    return rows[0].id;
  }

  const abcTrailId = await upsertTrail(
    abc.id,
    'Nayapul to ABC',
    [
      [83.5967, 28.2989],
      [83.7167, 28.3833],
      [83.8333, 28.4667],
      [83.88, 28.53],
    ],
    58000,
  );

  await upsertTrail(
    manaslu.id,
    'Soti Khola to Larkya La',
    [
      [84.8333, 28.15],
      [84.75, 28.35],
      [84.63, 28.56],
      [84.52, 28.63],
    ],
    150000,
  );

  // --- Spots (Point geometry) ---
  async function upsertSpot(
    pageId: string,
    spotTypeId: string,
    name: string,
    coord: [number, number],
    elevationMeters: number,
  ) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM spots WHERE "adventurePageId" = ${pageId} AND name = ${name} LIMIT 1
    `;
    if (existing.length > 0) return existing[0].id;
    const geojson = JSON.stringify({ type: 'Point', coordinates: coord });
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO spots (id, "adventurePageId", "spotTypeId", name, description, geometry, "elevationMeters", "verificationStatus", "isActive", "createdById", "lastEditedById", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${pageId}, ${spotTypeId}, ${name}, NULL, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), ${elevationMeters}, 'VERIFIED', true, ${alice.id}, ${alice.id}, now(), now())
      RETURNING id
    `;
    return rows[0].id;
  }

  const abcViewpointId = await upsertSpot(abc.id, viewpoint.id, 'Annapurna Base Camp Viewpoint', [83.88, 28.53], 4130);
  await upsertSpot(abc.id, teahouseSpot.id, 'Machhapuchhre Base Camp Teahouse', [83.87, 28.52], 3700);
  await upsertSpot(manaslu.id, viewpoint.id, 'Larkya La Pass', [84.52, 28.63], 5106);

  // --- Trip reports (no verification tier - personal accounts, see CLAUDE.md) ---
  // No natural unique key on trip reports/groups/comments, so re-runs guard
  // on (adventurePageId, title) to stay idempotent like the rest of this script.
  async function getOrCreateTripReport(data: Parameters<typeof prisma.tripReport.create>[0]['data']) {
    const existing = await prisma.tripReport.findFirst({
      where: { adventurePageId: data.adventurePageId as string, title: data.title as string },
    });
    if (existing) return { report: existing, created: false };
    return { report: await prisma.tripReport.create({ data }), created: true };
  }

  const { report: abcReport, created: abcReportCreated } = await getOrCreateTripReport({
    adventurePageId: abc.id,
    authorId: bob.id,
    title: 'Perfect autumn weather on the ABC trail',
    description: 'Did this over 9 days in October. Clear skies the whole way, teahouses were not too crowded.',
    dateCompleted: new Date('2026-10-15'),
    durationDays: 9,
    actualCostAmount: 450,
    currency: 'USD',
    media: {
      create: [{ url: 'https://example.com/media/abc-sanctuary.jpg', caption: 'Sunrise at the sanctuary' }],
    },
  });
  if (abcReportCreated) {
    await prisma.tripReportKudos.upsert({
      where: { tripReportId_userId: { tripReportId: abcReport.id, userId: alice.id } },
      update: {},
      create: { tripReportId: abcReport.id, userId: alice.id },
    });
    const abcTopComment = await prisma.comment.create({
      data: { tripReportId: abcReport.id, authorId: alice.id, content: 'Great write-up! Did you need microspikes in October?' },
    });
    await prisma.comment.create({
      data: {
        tripReportId: abcReport.id,
        authorId: bob.id,
        content: 'Not this time, trail was dry above Deurali too.',
        parentCommentId: abcTopComment.id,
      },
    });
  }

  await getOrCreateTripReport({
    adventurePageId: manaslu.id,
    authorId: carol.id,
    title: 'Larkya La in perfect conditions',
    description: 'Went with a licensed agency out of Kathmandu. Crossed the pass early morning, no wind.',
    dateCompleted: new Date('2026-04-05'),
    durationDays: 16,
    actualCostAmount: 1400,
    currency: 'USD',
  });

  // --- Trip group (companion-finding, see TRIP_GROUPS.md) ---
  const existingGroup = await prisma.tripGroup.findFirst({
    where: { title: 'ABC in November - looking for 2-3 companions' },
  });
  if (!existingGroup) {
    await prisma.tripGroup.create({
      data: {
        adventurePageId: abc.id,
        title: 'ABC in November - looking for 2-3 companions',
        description: 'Planning a 9-day trip starting Nov 10. Moderate pace, budget teahouses.',
        dateStart: new Date('2026-11-10'),
        dateEnd: new Date('2026-11-19'),
        createdById: bob.id,
        members: {
          create: [
            { userId: bob.id, role: 'ORGANIZER' },
            { userId: alice.id, role: 'MEMBER' },
          ],
        },
      },
    });
  }

  // --- Club, with threads and replies ---
  // No natural unique key on Club (name isn't unique), so re-runs guard on
  // name, same pattern as the trip-group block above.
  async function getOrCreateClub(data: Parameters<typeof prisma.club.create>[0]['data'] & { name: string }) {
    const existing = await prisma.club.findFirst({ where: { name: data.name } });
    if (existing) return { club: existing, created: false };
    return { club: await prisma.club.create({ data }), created: true };
  }

  const { club: hikersClub, created: hikersClubCreated } = await getOrCreateClub({
    name: 'Kathmandu Hikers Club',
    description: 'Weekend hikers and trekkers based in and around Kathmandu Valley.',
    visibility: 'PUBLIC',
    createdById: alice.id,
  });
  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId: hikersClub.id, userId: alice.id } },
    update: {},
    create: { clubId: hikersClub.id, userId: alice.id, role: 'OWNER', status: 'APPROVED' },
  });
  await prisma.clubMember.upsert({
    where: { clubId_userId: { clubId: hikersClub.id, userId: carol.id } },
    update: {},
    create: { clubId: hikersClub.id, userId: carol.id, role: 'MODERATOR', status: 'APPROVED' },
  });
  for (const member of [bob, dawa]) {
    await prisma.clubMember.upsert({
      where: { clubId_userId: { clubId: hikersClub.id, userId: member.id } },
      update: {},
      create: { clubId: hikersClub.id, userId: member.id, role: 'MEMBER', status: 'APPROVED' },
    });
  }

  async function getOrCreateThread(data: Parameters<typeof prisma.thread.create>[0]['data']) {
    const existing = await prisma.thread.findFirst({
      where: { clubId: data.clubId as string, authorId: data.authorId as string, content: data.content as string },
    });
    if (existing) return { thread: existing, created: false };
    return { thread: await prisma.thread.create({ data }), created: true };
  }

  async function getOrCreateThreadReply(data: Parameters<typeof prisma.threadReply.create>[0]['data']) {
    const existing = await prisma.threadReply.findFirst({
      where: { threadId: data.threadId as string, authorId: data.authorId as string, content: data.content as string },
    });
    if (existing) return { reply: existing, created: false };
    return { reply: await prisma.threadReply.create({ data }), created: true };
  }

  const { thread: abcShareThread, created: abcShareThreadCreated } = await getOrCreateThread({
    clubId: hikersClub.id,
    authorId: bob.id,
    content: 'Just posted my trip report from ABC - weather was perfect, highly recommend October!',
    tag: 'TRIP_SHARE',
    isPinned: true,
    tripReportId: abcReport.id,
  });
  if (abcShareThreadCreated) {
    const { reply: abcShareReply } = await getOrCreateThreadReply({
      threadId: abcShareThread.id,
      authorId: alice.id,
      content: 'Amazing photos! Did you need microspikes anywhere?',
    });
    await getOrCreateThreadReply({
      threadId: abcShareThread.id,
      authorId: bob.id,
      content: 'Not this time, trail was dry the whole way up.',
      parentReplyId: abcShareReply.id,
    });
  }

  const { thread: manasluQuestionThread, created: manasluQuestionThreadCreated } = await getOrCreateThread({
    clubId: hikersClub.id,
    authorId: carol.id,
    content: 'Anyone been to Manaslu recently? How far ahead do you need to sort the restricted-area permit?',
    tag: 'QUESTION',
    adventurePageId: manaslu.id,
  });
  if (manasluQuestionThreadCreated) {
    await getOrCreateThreadReply({
      threadId: manasluQuestionThread.id,
      authorId: dawa.id,
      content: 'At least a week - your agency needs your passport details to file the MRAP in advance.',
    });
  }

  await getOrCreateThread({
    clubId: hikersClub.id,
    authorId: dawa.id,
    content: 'Scouted the Nayapul trail and the base camp viewpoint again this week - both in great shape for the season.',
    tag: 'DISCUSSION',
    trailId: abcTrailId,
    spotId: abcViewpointId,
  });

  await getOrCreateThread({
    clubId: hikersClub.id,
    authorId: alice.id,
    content: 'Random question - does anyone have a spare 4-season sleeping bag they could lend out for a Manaslu trip?',
    tag: 'RANDOM',
  });

  if (hikersClubCreated) {
    console.log('Seeded club "Kathmandu Hikers Club" with 4 members, 4 threads, 3 replies.');
  }

  // --- Guide profiles (manual-review-only trust, see CLAUDE.md) ---
  // update mirrors create: upsertDemoUser() above already created an empty
  // GuideProfile row for every demo user (MILESTONE_3.md §2.2 - the row is
  // universal now), so this upsert always takes the update branch, not create.
  const carolGuideFields = {
    isListed: true,
    bio: 'Licensed trekking guide with 10 years of experience across the Annapurna region.',
    rateMin: 30,
    rateMax: 45,
    rateUnit: 'PER_DAY' as const,
    verificationStatus: 'VERIFIED' as const,
  };
  const carolGuide = await prisma.guideProfile.upsert({
    where: { userId: carol.id },
    update: carolGuideFields,
    create: {
      userId: carol.id,
      ...carolGuideFields,
      specialties: { create: [{ activityTypeId: teahouseTrekking.id }] },
      regions: { create: [{ districtId: kaski.id }] },
      languages: { create: [{ languageId: english.id }, { languageId: nepali.id }] },
    },
  });
  await Promise.all([
    prisma.guideSpecialty.upsert({
      where: { guideProfileId_activityTypeId: { guideProfileId: carolGuide.id, activityTypeId: teahouseTrekking.id } },
      update: {},
      create: { guideProfileId: carolGuide.id, activityTypeId: teahouseTrekking.id },
    }),
    prisma.guideRegion.upsert({
      where: { guideProfileId_districtId: { guideProfileId: carolGuide.id, districtId: kaski.id } },
      update: {},
      create: { guideProfileId: carolGuide.id, districtId: kaski.id },
    }),
    prisma.guideLanguage.upsert({
      where: { guideProfileId_languageId: { guideProfileId: carolGuide.id, languageId: english.id } },
      update: {},
      create: { guideProfileId: carolGuide.id, languageId: english.id },
    }),
    prisma.guideLanguage.upsert({
      where: { guideProfileId_languageId: { guideProfileId: carolGuide.id, languageId: nepali.id } },
      update: {},
      create: { guideProfileId: carolGuide.id, languageId: nepali.id },
    }),
  ]);

  const dawaGuideFields = {
    isListed: true,
    licenseNumber: 'NTB-2026-00042',
    bio: 'Specializes in restricted-area treks (Manaslu, Upper Mustang) with a registered agency.',
    rateMin: 40,
    rateUnit: 'PER_DAY' as const,
    verificationStatus: 'PENDING_LICENSE_REVIEW' as const,
  };
  const dawaGuide = await prisma.guideProfile.upsert({
    where: { userId: dawa.id },
    update: dawaGuideFields,
    create: {
      userId: dawa.id,
      ...dawaGuideFields,
      specialties: { create: [{ activityTypeId: restrictedTrekking.id }] },
      regions: { create: [{ districtId: gorkha.id }, { districtId: soluDistrict.id }] },
      languages: { create: [{ languageId: english.id }] },
    },
  });
  await Promise.all([
    prisma.guideSpecialty.upsert({
      where: { guideProfileId_activityTypeId: { guideProfileId: dawaGuide.id, activityTypeId: restrictedTrekking.id } },
      update: {},
      create: { guideProfileId: dawaGuide.id, activityTypeId: restrictedTrekking.id },
    }),
    prisma.guideRegion.upsert({
      where: { guideProfileId_districtId: { guideProfileId: dawaGuide.id, districtId: gorkha.id } },
      update: {},
      create: { guideProfileId: dawaGuide.id, districtId: gorkha.id },
    }),
    prisma.guideRegion.upsert({
      where: { guideProfileId_districtId: { guideProfileId: dawaGuide.id, districtId: soluDistrict.id } },
      update: {},
      create: { guideProfileId: dawaGuide.id, districtId: soluDistrict.id },
    }),
    prisma.guideLanguage.upsert({
      where: { guideProfileId_languageId: { guideProfileId: dawaGuide.id, languageId: english.id } },
      update: {},
      create: { guideProfileId: dawaGuide.id, languageId: english.id },
    }),
  ]);

  async function getOrCreateNotification(data: Parameters<typeof prisma.notification.create>[0]['data']) {
    const existing = await prisma.notification.findFirst({
      where: { userId: data.userId as string, message: data.message as string },
    });
    if (!existing) await prisma.notification.create({ data });
  }

  await getOrCreateNotification({
    userId: bob.id,
    type: 'KUDOS',
    message: 'Alice Sharma gave kudos on your trip report "Perfect autumn weather on the ABC trail".',
    linkUrl: `/trip-reports/${abcReport.id}`,
  });
  await getOrCreateNotification({
    userId: carol.id,
    type: 'GUIDE_VERIFIED',
    message: 'Your guide profile has been verified.',
    linkUrl: `/guides/${carolGuide.id}`,
  });

  console.log(
    'Dev data seeded: 4 users, 2 adventure pages, trails/spots, trip reports, 1 trip group, 1 club (4 members, 4 threads, 3 replies), 2 guide profiles.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
