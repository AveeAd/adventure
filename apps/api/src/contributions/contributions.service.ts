import { Injectable } from '@nestjs/common';
import { ContributionReason, ContributionTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { POINTS_SETTING_KEY } from './contributions.constants';
import { levelForPoints } from './guide-level.util';

export interface AwardParams {
  userId: string;
  reason: ContributionReason;
  targetType: ContributionTargetType;
  targetId: string;
  note?: string;
  // required for reasons with no fixed SettingsService value (PAGE_REPORT_UPHELD,
  // BACKFILL, ADMIN_ADJUSTMENT); ignored (and looked up) for the rest.
  points?: number;
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // MILESTONE_3.md §3.1: "Points are awarded only on approval" is the
  // Phase-21 end state - for now (Phase 20) this runs directly off the
  // existing create/update write paths, per the Phase 20 plan note
  // ("points accrue on the old write path in this phase; the gate arrives
  // in 21"). The @@unique([userId, reason, targetId]) constraint is what
  // makes this idempotent - a retried transaction or a double call just
  // hits P2002 and is silently absorbed rather than double-paying.
  async award(params: AwardParams): Promise<void> {
    const points = params.points ?? this.settingPoints(params.reason);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contributionEvent.create({
          data: {
            userId: params.userId,
            reason: params.reason,
            points,
            targetType: params.targetType,
            targetId: params.targetId,
            note: params.note,
          },
        });
        await this.applyDelta(tx, params.userId, points);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
  }

  private settingPoints(reason: ContributionReason): number {
    const key = POINTS_SETTING_KEY[reason];
    if (!key) {
      throw new Error(`ContributionReason.${reason} has no fixed point value - pass points explicitly`);
    }
    return this.settings.getNumber(key);
  }

  // Negative events never take a user below 0 (§3.2) - the ledger itself
  // keeps the true signed value (recompute() below sums it verbatim), only
  // the GuideProfile cache clamps.
  private async applyDelta(tx: Prisma.TransactionClient, userId: string, delta: number): Promise<void> {
    const profile = await tx.guideProfile.findUnique({ where: { userId } });
    if (!profile) {
      return;
    }
    const contributionPoints = Math.max(0, profile.contributionPoints + delta);
    const guideLevel = levelForPoints(contributionPoints);
    await tx.guideProfile.update({ where: { userId }, data: { contributionPoints, guideLevel } });
    // LEVEL_UP notification is Phase 25 (NotificationType doesn't carry it
    // yet) - see MILESTONE_3.md §9.4.
  }

  // Drift-correction command (§2.2's "recompute command exists for drift"):
  // recomputes the cache from the ledger itself rather than trusting
  // whatever incremental state applyDelta left behind.
  async recompute(userId: string): Promise<void> {
    const { _sum } = await this.prisma.contributionEvent.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    const contributionPoints = Math.max(0, _sum.points ?? 0);
    const guideLevel = levelForPoints(contributionPoints);
    await this.prisma.guideProfile.update({ where: { userId }, data: { contributionPoints, guideLevel } });
  }

  async recomputeAll(): Promise<void> {
    const userIds = await this.prisma.guideProfile.findMany({ select: { userId: true } });
    for (const { userId } of userIds) {
      await this.recompute(userId);
    }
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.contributionEvent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contributionEvent.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }
}
