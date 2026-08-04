// MILESTONE_3.md §3.1/§2.2: "a recompute command exists for drift" - the
// GuideProfile.contributionPoints/guideLevel columns are caches over
// ContributionEvent, incrementally maintained by ContributionsService.award().
// This re-derives both from scratch by summing the ledger, for whenever the
// cache and ledger have drifted (a failed incremental update, a manual DB
// fix, an admin adjustment applied outside the service). Safe to re-run at
// any time - it's a pure recomputation, not a replay like
// backfill-contributions.ts.
import { PrismaClient } from '@prisma/client';
import { levelForPoints } from '../../src/contributions/guide-level.util';

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.guideProfile.findMany({ select: { userId: true } });
  let changed = 0;

  for (const { userId } of profiles) {
    const { _sum } = await prisma.contributionEvent.aggregate({ where: { userId }, _sum: { points: true } });
    const contributionPoints = Math.max(0, _sum.points ?? 0);
    const guideLevel = levelForPoints(contributionPoints);

    const before = await prisma.guideProfile.findUniqueOrThrow({
      where: { userId },
      select: { contributionPoints: true, guideLevel: true },
    });
    if (before.contributionPoints !== contributionPoints || before.guideLevel !== guideLevel) {
      changed += 1;
      console.log(
        `${userId}: points ${before.contributionPoints} -> ${contributionPoints}, level ${before.guideLevel} -> ${guideLevel}`,
      );
    }
    await prisma.guideProfile.update({ where: { userId }, data: { contributionPoints, guideLevel } });
  }

  console.log(`Recomputed ${profiles.length} guide profiles, ${changed} had drifted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
