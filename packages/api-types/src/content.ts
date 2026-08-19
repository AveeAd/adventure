// Content-browsing shapes for apps/mobile Phase 2 (MOBILE_PLAN.md) - read
// from the actual NestJS services, not guessed: none of these responses
// join a display name onto an author/user reference, so every authorId/
// userId below is resolved client-side via GET /users/:id/profile (see
// UserRef.tsx port). Trimmed to only the fields Phase 2 screens render -
// extend as later phases need more.

// GET /activity-types, /districts, /languages - generic master-data list
// items, just enough for filter pickers.
export interface MasterDataOption {
  id: string;
  name: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Media/TripReportMedia's resized WebP variants from the image-processing
// pipeline (apps/api/src/uploads/image-processor.service.ts) - all
// optional since anything uploaded before that pipeline existed only ever
// has `url`. Consumers should build a srcset from whichever of these are
// present and fall back to plain `url` when none are.
export interface MediaSizeUrls {
  smallUrl?: string | null;
  mediumUrl?: string | null;
  largeUrl?: string | null;
}

// GET /adventure-pages, /adventure-pages/search - list item
export interface AdventurePageSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  verificationStatus: string;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  media: ({ url: string; altText: string | null } & MediaSizeUrls)[];
}

// GET /adventure-pages/slug/:slug
export interface AdventurePageDetail extends AdventurePageSummary {
  maxAltitudeMeters: number | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  tags: { tag: { id: string; name: string; slug: string } }[];
  relatedPages: AdventurePageSummary[];
  approvedRevision: { content: string } | null;
  likeCount: number;
  likedByMe: boolean;
  visitCount: number;
  visitedByMe: boolean;
}

// GET /adventure-pages/:pageId/trails (plain array, no envelope) - fields
// confirmed against TrailsService.listForPage's raw SQL (apps/api/src/
// geodata/trails.service.ts). Trail has no difficultyLevel in the schema -
// an incorrect field invented in an earlier pass, removed here.
export interface Trail {
  id: string;
  name: string | null;
  distanceMeters: number | null;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  ascentMeters: number | null;
  descentMeters: number | null;
  elevationSamples: { d: number; e: number }[] | null;
}

// GET /adventure-pages/:pageId/spots (plain array, no envelope) - fields
// confirmed against SpotsService.listForPage's raw SQL. Note `spotTypeName`
// is a flat joined string (`st.name AS "spotTypeName"`), not a nested
// object - an earlier pass had this wrong too. `name` is non-nullable on
// the Spot model.
export interface Spot {
  id: string;
  name: string;
  spotTypeName: string;
  elevationMeters: number | null;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

// GET /adventure-pages/:pageId/trip-reports - list item
export interface TripReportSummary {
  id: string;
  title: string;
  authorId: string;
  dateCompleted: string;
  durationDays: number | null;
  kudosCount: number;
}

// GET /trip-reports/:id
export interface TripReportDetail extends TripReportSummary {
  description: string;
  media: ({ id: string; url: string; altText: string | null } & MediaSizeUrls)[];
  activityTracks: { id: string; distanceMeters: number; ascentMeters: number | null }[];
  club: { id: string; name: string } | null;
  commentCount: number;
  kudosByMe: boolean;
}

// GET /trip-reports/:tripReportId/comments - nested one level server-side
// (CommentsService.listForTripReport flat-fetches then nests in application
// code, same shape as ThreadReply), NOT a flat list.
export interface TripReportComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  replies: TripReportComment[];
}

// GET /guide-profiles, /guide-profiles/:id - both use the same include shape
export interface GuideProfile {
  id: string;
  userId: string;
  bio: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: string | null;
  currency: string | null;
  verificationStatus: string;
  guideLevel: number;
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string } }[];
  languages: { language: { name: string } }[];
}

// GET /clubs - list item
export interface ClubSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
}

// GET /clubs/:id - `members` is present only when the caller is an
// approved member or staff; otherwise it's omitted entirely and
// viewerMembership describes the caller's own (non-)relationship instead,
// so the UI can show "request pending" without leaking the roster.
export interface ClubDetail extends ClubSummary {
  members?: { user: { id: string; username: string }; role: string }[];
  viewerMembership?: { status: string; role: string } | null;
}

// GET /clubs/:clubId/threads - list item
export interface ThreadSummary {
  id: string;
  content: string;
  authorId: string;
  tag: string;
  isPinned: boolean;
  createdAt: string;
  replyCount: number;
}

// GET /threads/:id
export type ThreadDetail = ThreadSummary;

// GET /threads/:threadId/replies - nested one level server-side
// (ThreadRepliesService.listForThread flat-fetches then nests in
// application code), NOT a flat list.
export interface ThreadReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  replies: ThreadReply[];
}

// Phase 5 (MOBILE_PLAN.md "Contribute/write flows") request DTOs - mirrored
// 1:1 off the NestJS DTOs in apps/api/src/{adventure-pages,geodata,
// trip-reports,clubs,threads,uploads}. Response shapes above are read from
// actual service code; these are read from the actual class-validator DTOs,
// same "hand-written, no codegen" convention as the rest of this file.

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface CreateThreadReplyRequest {
  content: string;
  parentReplyId?: string;
}

export type ThreadTag = 'DISCUSSION' | 'TRIP_SHARE' | 'QUESTION' | 'ANNOUNCEMENT' | 'RANDOM';

export interface CreateThreadRequest {
  content: string;
  tag?: ThreadTag;
  tripReportId?: string;
  trailId?: string;
  spotId?: string;
  adventurePageId?: string;
}

export interface CreateClubRequest {
  name: string;
  description?: string;
  coverImageUrl?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export interface DecideClubJoinRequestRequest {
  decision: 'APPROVED' | 'DECLINED';
}

// GET /clubs/:id/join-requests - owner/site-mod only.
export interface ClubJoinRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  user: { id: string; username: string };
}

export interface CreateTripReportRequest {
  title?: string;
  description?: string;
  content?: string;
  dateCompleted: string;
  durationDays?: number;
  actualCostAmount?: number;
  currency?: 'NPR' | 'USD' | 'EUR' | 'INR';
  activityTrackIds?: string[];
  clubId?: string;
}

export interface AddMediaRequest extends MediaSizeUrls {
  url: string;
  caption?: string;
  altText?: string;
  sortOrder?: number;
}

// POST /uploads/images response - smallUrl/mediumUrl/largeUrl always
// present in practice (the pipeline always produces all three), typed via
// MediaSizeUrls' optionality anyway so a caller isn't forced to assume that.
export interface UploadImageResponse extends MediaSizeUrls {
  url: string;
}

// GeoJSON, [lng, lat] order end-to-end - matches apps/api's geometry.dto.ts
// and apps/public's DrawMap.tsx convention.
export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface CreateTrailRequest {
  name?: string;
  geometry: LineStringGeometry;
  distanceMeters?: number;
}

export interface UpdateTrailRequest extends Partial<CreateTrailRequest> {
  isSafetyCriticalEdit?: boolean;
  editSummary?: string;
}

export interface CreateSpotRequest {
  spotTypeId: string;
  name: string;
  description?: string;
  geometry: PointGeometry;
  elevationMeters?: number;
}

export interface UpdateSpotRequest extends Partial<CreateSpotRequest> {
  isSafetyCriticalEdit?: boolean;
  editSummary?: string;
}

export interface CreateAdventurePageRequest {
  title: string;
  summary?: string;
  activityTypeId: string;
  difficultyLevelId?: string;
  durationMinDays?: number;
  durationMaxDays?: number;
  maxAltitudeMeters?: number;
  districtIds?: string[];
  seasonIds?: string[];
  tagIds?: string[];
  content: string;
  trail?: CreateTrailRequest;
  spots?: CreateSpotRequest[];
}

export type UpdateAdventurePageMetadataRequest = Partial<
  Omit<CreateAdventurePageRequest, 'content' | 'trail' | 'spots'>
>;

export interface SubmitRevisionRequest {
  content: string;
  editSummary?: string;
  isSafetyCriticalEdit?: boolean;
}

// POST /adventure-pages/:id/revisions response - the created PageRevision.
export interface PageRevisionSummary {
  id: string;
  version: number;
  content: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isSafetyCriticalEdit: boolean;
  editSummary: string | null;
}
