// MILESTONE_3.md §6: seeded SystemSetting keys, one per runtime-tunable
// threshold plus one per point value in §3.1, so the contribution economy
// is tunable without a deploy. `value` here is the seed/fallback default;
// the DB row (once seeded) is the live source of truth.
export const SETTING_DEFAULTS: Record<string, { value: string; description: string; public?: boolean }> = {
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

  // Phase 6: admin-only kill switch for the Expo push delivery channel -
  // in-app Notification rows keep writing regardless, this only gates the
  // push send.
  'push.enabled': { value: 'true', description: 'Master kill switch for push notification delivery' },

  // Phase 7: minimum apps/mobile version allowed to talk to the API.
  // MinVersionMiddleware compares this against the X-Client-Version header
  // apps/mobile sends on every request (see apps/mobile/src/lib/api.ts) and
  // 426s anything older, so a store rejection/security fix can force an
  // update without a native force-update SDK. Public so a stale client can
  // still resolve it without auth. Web/admin never send the header, so this
  // has no effect on them.
  'mobile.minVersion': {
    value: '1.0.0',
    description: 'Minimum apps/mobile version (semver) allowed to call the API',
    public: true,
  },

  // Public branding keys - readable via GET /settings/public (no auth) so
  // apps/public and apps/admin can render the app's name/tagline without
  // hardcoding it, and it can be changed later without a deploy.
  // "Hipppie" is a placeholder codename, not the final brand - the user
  // hasn't settled on a real app name yet. Every place that used to
  // hardcode "Adventure Nepal" now reads this setting instead (see
  // apps/admin/src/hooks/useAppConfig.ts, apps/public/src/lib/app-config.ts)
  // specifically so renaming the app later is a one-value change here, not
  // a grep-and-replace across three codebases again.
  'app.name': {
    value: 'Hipppie',
    description: 'Public-facing app name (header, titles, login screens)',
    public: true,
  },
  'app.tagline': {
    value: 'Hipppie — a non-commercial map, wiki, and activity log for Nepal, built by contributors.',
    description: 'Short tagline shown in the public site footer',
    public: true,
  },
  'app.description': {
    value: 'Hipppie — a non-commercial map, wiki, and activity log for Nepal, built by contributors.',
    description: 'Longer description for future meta/SEO use',
    public: true,
  },
  // Sourced from CONTACT_EMAIL directly (not ConfigService - this module is
  // a plain constant object evaluated before Nest's DI container exists, so
  // there's no injection point available yet) so the privacy policy
  // (docs/privacy.md) and the App Store/Play Store listings' support email
  // can all point at one changeable value instead of being hand-edited in
  // three places whenever it changes.
  'app.contactEmail': {
    value: process.env.CONTACT_EMAIL ?? '',
    description: 'Public/support contact email (privacy policy, store listings)',
    public: true,
  },
  'app.social.twitter': { value: '', description: 'Twitter/X profile URL (not yet rendered)', public: true },
  'app.social.instagram': { value: '', description: 'Instagram profile URL (not yet rendered)', public: true },
  'app.social.github': { value: '', description: 'GitHub org/repo URL (not yet rendered)', public: true },
};
