// MILESTONE_3.md §12.7 / Phase 20: one-off replay of pre-Milestone-3 history
// into the contribution ledger. Every pre-M3 revision/media/story is
// treated as already-approved (§5.5's migration-safety rule extended to
// scoring - there was no approval gate to fail), so it's paid the same
// point value the live write path would have paid, but tagged with reason
// BACKFILL (not the live-path reason) so the ledger stays honest about
// which awards came from real-time scoring vs this replay - see the `note`
// on each row for which category it stands in for.
//
// Idempotent (the @@unique([userId, reason, targetId]) constraint on
// ContributionEvent absorbs a re-run as a no-op per row) - safe to re-run,
// e.g. after content created between two runs.
import { ContributionTargetType, PrismaClient } from '@prisma/client';
import { SETTING_DEFAULTS } from '../../src/settings/settings.constants';
import { levelForPoints } from '../../src/contributions/guide-level.util';

const prisma = new PrismaClient();

function points(key: string): number {
  return Number(SETTING_DEFAULTS[key].value);
}

async function awardBackfill(
  userId: string,
  points: number,
  targetType: ContributionTargetType,
  targetId: string,
  note: string,
) {
  await prisma.contributionEvent.upsert({
    where: { userId_reason_targetId: { userId, reason: 'BACKFILL', targetId } },
    create: { userId, reason: 'BACKFILL', points, targetType, targetId, note },
    update: {},
  });
}

async function backfillPages() {
  const pages = await prisma.adventurePage.findMany({ select: { id: true } });
  for (const page of pages) {
    const revisions = await prisma.pageRevision.findMany({
      where: { adventurePageId: page.id },
      orderBy: { version: 'asc' },
      select: { id: true, version: true, editorId: true },
    });
    const [v1, ...rest] = revisions;
    if (!v1) continue;

    await awardBackfill(v1.editorId, points('points.pageCreate'), ContributionTargetType.ADVENTURE_PAGE, page.id, 'PAGE_CREATE');

    for (const revision of rest) {
      if (revision.editorId !== v1.editorId) {
        await awardBackfill(
          revision.editorId,
          points('points.pageUpdate'),
          ContributionTargetType.PAGE_REVISION,
          revision.id,
          'PAGE_UPDATE',
        );
      }
    }
  }
}

async function backfillTrails() {
  const trails = await prisma.trail.findMany({ select: { id: true, createdById: true } });
  for (const trail of trails) {
    const revisions = await prisma.trailRevision.findMany({
      where: { trailId: trail.id },
      orderBy: { version: 'asc' },
      select: { id: true, version: true, editorId: true },
    });
    const [v1, ...rest] = revisions;
    if (!v1) continue;

    await awardBackfill(trail.createdById, points('points.geoCreate'), ContributionTargetType.TRAIL, trail.id, 'GEO_CREATE');

    for (const revision of rest) {
      if (revision.editorId !== trail.createdById) {
        await awardBackfill(
          revision.editorId,
          points('points.geoUpdate'),
          ContributionTargetType.TRAIL_REVISION,
          revision.id,
          'GEO_UPDATE',
        );
      }
    }
  }
}

async function backfillSpots() {
  const spots = await prisma.spot.findMany({ select: { id: true, createdById: true } });
  for (const spot of spots) {
    const revisions = await prisma.spotRevision.findMany({
      where: { spotId: spot.id },
      orderBy: { version: 'asc' },
      select: { id: true, version: true, editorId: true },
    });
    const [v1, ...rest] = revisions;
    if (!v1) continue;

    await awardBackfill(spot.createdById, points('points.geoCreate'), ContributionTargetType.SPOT, spot.id, 'GEO_CREATE');

    for (const revision of rest) {
      if (revision.editorId !== spot.createdById) {
        await awardBackfill(
          revision.editorId,
          points('points.geoUpdate'),
          ContributionTargetType.SPOT_REVISION,
          revision.id,
          'GEO_UPDATE',
        );
      }
    }
  }
}

async function backfillMedia() {
  const media = await prisma.media.findMany({ select: { id: true, uploadedById: true } });
  for (const item of media) {
    await awardBackfill(item.uploadedById, points('points.mediaUpload'), ContributionTargetType.MEDIA, item.id, 'MEDIA_UPLOAD');
  }

  // TripReportMedia has no uploader column of its own - only the report's
  // author (or an admin) can add one, so the story author is credited.
  const tripReportMedia = await prisma.tripReportMedia.findMany({
    select: { id: true, tripReport: { select: { authorId: true } } },
  });
  for (const item of tripReportMedia) {
    await awardBackfill(
      item.tripReport.authorId,
      points('points.mediaUpload'),
      ContributionTargetType.MEDIA,
      item.id,
      'MEDIA_UPLOAD',
    );
  }
}

async function backfillStories() {
  const reports = await prisma.tripReport.findMany({ select: { id: true, authorId: true } });
  for (const report of reports) {
    await awardBackfill(report.authorId, points('points.storyCreate'), ContributionTargetType.TRIP_REPORT, report.id, 'STORY_CREATE');
  }
}

async function recomputeAllCaches() {
  const profiles = await prisma.guideProfile.findMany({ select: { userId: true } });
  for (const { userId } of profiles) {
    const { _sum } = await prisma.contributionEvent.aggregate({ where: { userId }, _sum: { points: true } });
    const contributionPoints = Math.max(0, _sum.points ?? 0);
    const guideLevel = levelForPoints(contributionPoints);
    await prisma.guideProfile.update({ where: { userId }, data: { contributionPoints, guideLevel } });
  }
}

async function main() {
  await backfillPages();
  await backfillTrails();
  await backfillSpots();
  await backfillMedia();
  await backfillStories();
  await recomputeAllCaches();
  console.log('Contribution ledger backfilled.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
