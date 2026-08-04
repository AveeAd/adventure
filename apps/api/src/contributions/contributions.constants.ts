import { ContributionReason } from '@prisma/client';

// Maps the reasons with a fixed point value (MILESTONE_3.md §3.1's inline
// comments) to their SettingsService key. PAGE_REPORT_UPHELD (reverses
// whatever the original award was), BACKFILL and ADMIN_ADJUSTMENT have no
// fixed value - callers must pass `points` explicitly for those.
export const POINTS_SETTING_KEY: Partial<Record<ContributionReason, string>> = {
  [ContributionReason.PAGE_CREATE]: 'points.pageCreate',
  [ContributionReason.PAGE_UPDATE]: 'points.pageUpdate',
  [ContributionReason.GEO_CREATE]: 'points.geoCreate',
  [ContributionReason.GEO_UPDATE]: 'points.geoUpdate',
  [ContributionReason.MEDIA_UPLOAD]: 'points.mediaUpload',
  [ContributionReason.STORY_CREATE]: 'points.storyCreate',
  [ContributionReason.MEDIA_REPORT_UPHELD]: 'points.mediaReportUpheld',
  [ContributionReason.GEO_REPORT_UPHELD]: 'points.geoReportUpheld',
};
