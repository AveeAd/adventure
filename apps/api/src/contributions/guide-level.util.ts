// MILESTONE_3.md §3.3: escalating level curve. Cumulative points required
// to *hold* level n is threshold(n) = 10 * n * (n - 1), i.e. the step cost
// from level n to n+1 grows by 20 each time (20, 40, 60, ... 480).
//
// | Level | 2  | 3  | 5   | 10  | 15    | 25    |
// | Points| 20 | 60 | 200 | 900 | 2,100 | 6,000 |
//
// Level 10 (900 pts) grants approval rights (§3.3, §5.3); level 25
// (6,000 pts) grants moderator-application eligibility (§7).

export function thresholdForLevel(level: number): number {
  return 10 * level * (level - 1);
}

export function levelForPoints(points: number): number {
  let level = 1;
  while (thresholdForLevel(level + 1) <= points) {
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  pointsInLevel: number;
  pointsToNext: number;
}

export function levelProgress(points: number): LevelProgress {
  const level = levelForPoints(points);
  return {
    level,
    pointsInLevel: points - thresholdForLevel(level),
    pointsToNext: thresholdForLevel(level + 1) - points,
  };
}
