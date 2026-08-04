// MILESTONE_3.md §6: seeded SystemSetting keys, one per runtime-tunable
// threshold plus one per point value in §3.1, so the contribution economy
// is tunable without a deploy. `value` here is the seed/fallback default;
// the DB row (once seeded) is the live source of truth.
export const SETTING_DEFAULTS: Record<string, { value: string; description: string }> = {
  'approval.threshold': {
    value: '5',
    description: 'APPROVE (or REJECT) votes needed to resolve a pending revision',
  },
  'approval.minGuideLevel': {
    value: '10',
    description: 'Minimum guide level required to vote on a pending revision or resolve a report',
  },
  'moderator.minGuideLevel': {
    value: '25',
    description: 'Minimum guide level required to submit a moderator application',
  },
  'reports.maxOpenPerUser': {
    value: '10',
    description: 'Maximum PENDING content reports a single user may have open at once',
  },
  'points.pageCreate': { value: '10', description: 'Points for PAGE_CREATE' },
  'points.pageUpdate': { value: '20', description: "Points for PAGE_UPDATE (editing someone else's page)" },
  'points.geoCreate': { value: '20', description: 'Points for GEO_CREATE (trail or spot added)' },
  'points.geoUpdate': { value: '25', description: "Points for GEO_UPDATE (editing someone else's trail/spot)" },
  'points.mediaUpload': { value: '2', description: 'Points for MEDIA_UPLOAD, per image' },
  'points.storyCreate': { value: '5', description: 'Points for STORY_CREATE (trip report publish)' },
  'points.mediaReportUpheld': { value: '-3', description: 'Points for MEDIA_REPORT_UPHELD' },
  'points.geoReportUpheld': { value: '-30', description: 'Points for GEO_REPORT_UPHELD' },
};
