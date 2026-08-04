This file consolidates and replaces IDEA.md, ARCHITECTURE.md, FEATURE.md, GEODATA_HISTORY.md, I18N.md, MILESTONE_3.md, MOBILE_CLIENT.md, PLANNING.md, REMAINING_WORK_PLAN.md, TRACKS_AND_MOBILE_PLAN.md, TRAIL_ELEVATION.md, and ACTIVITY_TRACKS.md. See CLAUDE.md for current build status and locked architecture decisions.

## 1. Product vision and trust model (IDEA.md)

**Pitch**: "OpenStreetMap + Wikipedia + Strava, for adventure in Nepal" — a community-run, non-commercial platform covering every kind of adventure (trekking, biking, motorcycle routes, bungee, paragliding, etc). No bookings, no commission, no pay-to-rank, no paywalls. Success = coverage/accuracy of Nepal adventure info, not revenue.

**Why**: existing options are narrow — HoneyGuide (per-route offline trekking apps, trekking-only), Hop Nepal (accommodation booking only), AllTrails (global, generic, no guide layer). Nobody spans multiple activity types + planning + community knowledge + peer connection, non-commercially. A real legal constraint shapes the guide directory: Nepal requires trekkers on restricted routes (Annapurna, Manaslu, Upper Mustang) to go through a **registered trekking agency**.

**Three inherited layers**, unified under one contributor account (mirrors a Wikipedia editor's userpage aggregating all their edits — this combined history is also the natural trust signal):
- **Geodata** (from OSM) — the map itself, trails/spots as editable geodata.
- **Article** (from Wikipedia) — per-adventure info pages, infobox + prose, full revision history.
- **Activity** (from Strava) — logged trips, trip reports, kudos, clubs.

**Core pillars**: Discover (map-first browse) · Plan (day-by-day itinerary + accommodation, flexes per activity type) · Connect (free guide directory, no in-app payment, restricted-region guides need license verification) · Share (Strava-style trip reports — real dates/costs/kudos, the actual differentiator) · Contribute (add new / edit existing) · Community (trip-companion groups around a shared route + date window — genuinely missing from every competitor).

**Adventure page anatomy**: header (title, last-edited-by, edit-history link, edit button) + embedded map snippet + Wikipedia-style infobox (region, difficulty, duration, best season, max altitude) + collaboratively-editable prose + trip-reports feed + "log your trip" CTA.

**Original (pre-Milestone-3) trust model** — now superseded by MILESTONE_3.md for pages/trails/spots, but this is the originating philosophy: new submissions go live immediately tagged unverified; promoted to verified after peer confirmations, or manual review for safety-critical content; full revertable edit history; trust accumulates through activity rather than manual gatekeeping for every change (mirrors how OSM/Wikipedia scale moderation).

**Guide accounts**: free profile (not paid listing) — certifications, languages, specialties, regions, informational rate range. Surfaced from the specific pages/regions they cover. Restricted-region guides require license verification before being marked verified — reflects an actual legal requirement, not optional.

**Personas** (non-gatekeeping reference): The Planner (foreign trekker planning ahead), The Weekend Warrior (Kathmandu-based day trips), The Local Contributor (updates conditions, doesn't travel much), The Adrenaline Tourist (single booking, not itinerary-heavy), The Guide (wants visibility, not commission bookings).

**IDEA.md's original open questions** (mostly resolved by later docs, listed for provenance): governance tiers for auto-publish vs. queue (→ resolved by Milestone 3's guideLevel gating); hosting/sustainability without revenue (still informally open); name/branding (undiscussed); tech stack and MVP scope (deferred at the time, since locked — see CLAUDE.md).

## 2. Architecture notes not already in CLAUDE.md (ARCHITECTURE.md)

CLAUDE.md's "Locked architecture decisions" covers the high-level stack choices. This section holds the mechanical details CLAUDE.md doesn't spell out.

**NestJS module map** (`apps/api/src/`): `config/` (Zod/Joi-validated env), `prisma/` (global module, `PrismaService` wraps connect/disconnect), `auth/` (controller, service, Google + JWT strategies, guards, decorators), `users/` (auth-only fields: id/email/googleId/role/isActive), `profiles/` (everything else: name/avatarUrl), `common/crud/` (generic CRUD factory), `master-data/<type>/` (thin modules reusing common/crud), `health/`. `JwtAuthGuard` is registered globally via `APP_GUARD` — every route requires a valid token unless `@Public()`-marked (safer default: opt out of auth, not in).

**Google OAuth login flow, step by step**:
1. Browser hits `GET /auth/google?redirectUrl=...`; `redirectUrl` must exactly match an entry in `ALLOWED_REDIRECT_URLS` (comma-separated allowlist covering both `apps/admin` and `apps/public` URLs) or the request is rejected — prevents an open-redirect attack handing a stolen token to an attacker URL. The validated value round-trips through Google's OAuth `state` param.
2. `AuthGuard('google')` redirects to Google's consent screen; Google redirects back to `GET /auth/google/callback?code=...&state=...`; Passport exchanges the code for a profile (email/name/picture); `state` decodes back to `redirectUrl`.
3. `AuthService` upserts a `User` row by email (role from `ADMIN_EMAILS` allowlist, create-branch only) and a `Profile` row (name/avatarUrl from Google). `User` carries only auth fields; the JWT payload carries only `sub`/`email`/`role`, never `Profile` data.
4. API issues access (JWT, 15 min) + refresh (opaque, hashed in DB, 7 day) token pair, sets refresh as an **httpOnly cookie**, 302-redirects to `${redirectUrl}/auth/callback#access_token=...` (fragment, never sent to any server, unlike a query string).
5. The receiving frontend reads the fragment, stores the access token in memory only (not localStorage — reduces XSS token-theft surface), strips it from the URL.

**Refresh/logout**: `POST /auth/refresh` reads the refresh cookie (not body), validates against the stored hash, issues + rotates a new pair (old one invalidated); requires CORS to allow credentials from every `ALLOWED_REDIRECT_URLS` origin. `POST /auth/logout` clears the cookie and deletes the `RefreshToken` row. Access tokens aren't individually revocable (stateless JWT tradeoff, acceptable at 15 min TTL). No email verification/password reset — Google already owns email verification.

**RBAC internals**: `Role` enum (`ADMIN`/`USER` originally; `MODERATOR` added in Milestone 3). `@Roles('ADMIN')` decorator + `RolesGuard` reads `req.user.role`. Admin bootstrap is the `ADMIN_EMAILS` env allowlist, checked only on the *create* branch of the first-login upsert — never on update, so removing an email later doesn't demote an existing admin, and a manually-promoted admin isn't reset either. No self-service upgrade path exists otherwise.

**Generic CRUD pattern internals**: `common/crud/base-crud.service.ts` is a class parameterized over a Prisma delegate providing `list/get/create/update/delete` — `delete` is always soft (`isActive = false`); `list()` filters `isActive = true` by default, `?includeInactive=true` (admin-only) surfaces soft-deleted rows, restore reuses `update(id, { isActive: true })`. `common/crud/base-crud.controller.ts` is a factory function `createCrudController({ path, service, createDto, updateDto })` producing a Nest controller with the five REST routes wired, write routes `@Roles('ADMIN')`. Each master-data module is then ~10 lines wiring the factory to a delegate; DTOs are still hand-written per type for field validation.

**API conventions**: prefix `/api/v1/...`; list endpoints return `{ data, total, page, pageSize }`; single-resource endpoints return the resource directly, no envelope; errors go through a global exception filter; `class-validator`/`class-transformer` with global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` — unknown body fields are rejected, not dropped.

**Admin bootstrap**: no seed script for users — there's no way to pre-create a Google-authenticated user, so becoming admin is just: log in once with an `ADMIN_EMAILS`-listed email.

**Env vars** (`.env`): `DATABASE_URL` (host `db`, the compose service name, not `localhost`), `JWT_ACCESS_SECRET`/`JWT_ACCESS_TTL` (15m), `JWT_REFRESH_SECRET`/`JWT_REFRESH_TTL` (7d), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL`, `ADMIN_EMAILS`, `ALLOWED_REDIRECT_URLS` (comma-separated, replaces an earlier single `ADMIN_APP_URL`), `PORT`. Validated at boot via a Zod schema — fails fast on a missing required var.

**Admin app (`apps/admin`) mechanics**: React + Vite + Refine, UI kit Ant Design (Refine's default). Google login is a full-page nav (not fetch/XHR — OAuth redirects can't be AJAX'd) to `${API_URL}/auth/google`. One Refine resource per master-data type auto-generates list/create/edit/delete screens from the CRUD endpoints. Vite dev server must bind `--host 0.0.0.0` inside its container, or it's unreachable from the host browser.

## 3. Database schema — models by content layer

Global conventions (see CLAUDE.md for the summary): UUIDv4 string ids, `createdAt`/`updatedAt` on every table except immutable revision/log tables (`createdAt` only — e.g. `PageRevision`, `TrailRevision`, `SpotRevision`), snake_case-plural `@@map`, soft delete via `isActive`, `Unsupported(...)` for PostGIS/tsvector columns (hand-added GiST/GIN indexes, not diff-managed — watch for spurious auto-generated `DROP INDEX` when Prisma regenerates migrations touching unrelated tables; this has bitten the repo at least twice), `Restrict` for hierarchical/lookup FKs vs. `Cascade` for parent-owned content, prefer duplicated-but-simple tables over shared/polymorphic ones (`Media` vs. `TripReportMedia`, three separate `*Confirmation` tables).

### Core auth/master-data (FEATURE.md §2)

- **User** — email, googleId (both unique), role, isActive. Has one `Profile`, many `RefreshToken`.
- **Profile** — 1:1 with User (`Cascade`), name, avatarUrl.
- **RefreshToken** — userId, `tokenHash` (unique — refresh flow looks up by hash), expiresAt, revokedAt.
- **ActivityType** — flat-in-spirit but self-referencing via `parentId`/`children` (unbounded nesting, e.g. Trekking → Teahouse Trekking); name/slug globally unique regardless of nesting since a composite unique can't enforce it (Postgres treats NULLs as distinct); cycle prevention is service-layer only (no DB constraint possible on a self-referencing FK).
- **DifficultyLevel**, **Season** — identical flat shape (name, slug, description, sortOrder, isActive) — lets them share one generic CRUD service/controller.
- **Country → Province → District → Municipality** — real Nepal admin geography, not a flat region list. Each level's slug unique *within its parent*. `Municipality.type` enum: `METROPOLITAN_CITY`/`SUB_METROPOLITAN_CITY`/`MUNICIPALITY`/`RURAL_MUNICIPALITY`. `District.requiresRegisteredAgency` flags restricted-permit districts (Manang, Mustang, Gorkha — a simplification vs. the real Nepal Tourism Board list, which also covers Upper Dolpo/Kanchenjunga/Tsum Valley/Humla's Limi valley). ~838 rows total, imported via a one-off script (`import-locations.ts`, sourced from the `nepal-places` npm package — not an official government dataset) — the one documented exception to "no seed scripts," since this is static public reference data.
- Migrations auto-run on API container startup (`prisma migrate deploy`). Seed scripts (`seed:locations|seed:master-data|seed:dev-data|seed:all`) are manual, never wired into startup.

### Adventure pages — wiki/article layer (FEATURE.md §3)

- **AdventurePage** — title, slug (unique), summary, activityTypeId (Restrict), difficultyLevelId (nullable, Restrict), durationMin/MaxDays, maxAltitudeMeters, verificationStatus (`UNVERIFIED`/`VERIFIED`/`NEEDS_REVIEW`), isActive. No `currentRevisionId` pointer (would create a circular FK) — "current content" is just the latest `PageRevision` by version.
- **PageRevision** — adventurePageId, version, `content` (Markdown, **full snapshot per edit, never a diff** — same shape as Wikipedia's own DB; makes revert and diffing trivial), editSummary, isSafetyCriticalEdit (self-flagged, honest-system, routes to `NEEDS_REVIEW`), editorId (Restrict — don't lose attribution). `@@unique([adventurePageId, version])`.
- **PageConfirmation** — ties to a specific **revisionId**, not the page, so an edit can't ride on stale trust from before it. `@@unique([revisionId, userId])`.
- **AdventurePageDistrict**, **AdventurePageSeason** — plain many-to-many joins (Cascade from page, Restrict to lookup). `AdventurePageDistrict` gained `source` (`MANUAL`/`DERIVED`, Phase 17) and timestamps (previously missing entirely — a standing convention violation, fixed in the same migration).
- **Media** — url/caption/altText/sortOrder, uploadedById (Restrict). Uploads go through `POST /uploads/images` (local disk under `UPLOAD_DIR`, not S3), decoupled from this table; content can also just paste a URL directly into Markdown with no `Media` row.
- **AdventurePageLike** — deliberately **not** revision-scoped, never reset on edit (casual appreciation, not a trust claim). `Cascade` both sides.
- **Tag** (Phase 13) — curated master data (generic CRUD like ActivityType), not free-typed, to avoid spam/duplicate tags. **AdventurePageTag** joins it. Tags settable only at page-creation time in the public UI today — a known gap.
- **RelatedAdventurePage** (Phase 13) — symmetric self-join; suggesting A→B inserts both `(A,B)` and `(B,A)` in one transaction; no moderation queue (named spam-vector risk).

Service-layer notes (not generic CRUD — compound/transactional): create = AdventurePage + PageRevision v1 in one transaction; edit = new PageRevision only, never mutates old content, resets verificationStatus; confirm = upsert PageConfirmation for (latest revision, user), crossing a config threshold flips to VERIFIED (**retired by Milestone 3** — see §4 below); revert = new revision copying an old snapshot; contributors = `SELECT DISTINCT editorId` (not stored); diff = text-diff two revisions' content at render time via the `diff` npm package; "date updated" = latest revision's `createdAt`, not the page row's own `updatedAt`.

### Map / geodata layer (FEATURE.md §4)

- **SpotType** — flat master data (unlike ActivityType, no hierarchy).
- **Trail** — adventurePageId (Cascade, exclusive to one page — a shared trailhead across two treks is two overlapping rows, not one), name (nullable), `geometry Unsupported("geometry(LineString, 4326)")`, distanceMeters (cached scalar, computed once), verificationStatus, createdById/lastEditedById (both Restrict). Plus (Milestone 2 Phase 16): `source` enum `DRAWN`/`GPX_IMPORT`/`RECORDED_ACTIVITY`, optional `elevationProfile` relation.
- **Spot** — same page-exclusivity, spotTypeId (Restrict), name, description, `geometry Unsupported("geometry(Point, 4326)")`, elevationMeters, verificationStatus, createdById/lastEditedById.
- **TrailConfirmation**/**SpotConfirmation** — originally row-scoped (`trailId`/`spotId` + userId), **retargeted to revisionId** by GEODATA_HISTORY.md (Phase 15) — see §4 below.
- GiST indexes on both geometry columns must be hand-added to migration SQL; SRID 4326 (WGS84) matches any tile provider/GPX source.
- Known gap (named, not yet fixed as of this writing beyond ACTIVITY_TRACKS.md flagging it): `GET /trails/bbox`/`/spots/bbox` have no `LIMIT`/simplification and no validated DTO on bbox params (`Number(...)` coercion lets `NaN` through); `LineStringGeometryDto` validates only the outer array, no per-element/coordinate-range/max-size checks.

**Spatially-derived district tagging** (FEATURE.md §4 edit, built Milestone 2 Phase 17):
- `District.boundary Unsupported("geometry(MultiPolygon, 4326)")?` (nullable — partial import, pre-existing rows predate boundaries).
- `AdventurePageDistrict.source: DistrictTagSource` (`MANUAL`/`DERIVED`).
- Boundary import: `import-district-boundaries.ts` script, fixture `nepal-district-boundaries.geojson`, sourced from the `nepal-geojson` npm package (not OSM/HDX directly — that package was used only to extract 77 per-district polygon files, unioned + simplified via `ST_SimplifyPreserveTopology` into one ~410KB fixture), matched by slug (9 name aliases hand-mapped, e.g. `Chitawan`→`chitwan`).
- Derivation fires service-layer, inside the same transaction as trail/spot create/update-with-geometry-change (never client-driven): `ST_Intersects` for trails, `ST_Contains` for spots, `INSERT ... ON CONFLICT DO NOTHING`. **MANUAL always wins** — derivation is additive-only, never deletes/downgrades a MANUAL row.
- Required fix (applied): `AdventurePagesService.updateMetadata`'s district delete narrowed from wholesale `deleteMany` to `{ adventurePageId, source: 'MANUAL' }`, plus district creation became an upsert so a manual pick on an existing DERIVED row upgrades it in place instead of hitting a unique-constraint collision.
- Left open: no backfill across existing pages (only fires going forward); no `Municipality`-level boundaries; no intersection-length threshold for border-hugging routes.

**Original service-layer rule (superseded)**: edits used to reset verificationStatus **and** delete all confirmations in the same transaction, with `isSafetyCriticalEdit` as a transient (unstored) request flag. This is retired by GEODATA_HISTORY.md — see §4 below.

### Trip reports — social layer (FEATURE.md §5)

Deliberate asymmetry: **no verification tier at all** — a trip report is a personal account, not a factual claim; kudos/comments are the only signal.

- **TripReport** — adventurePageId (Cascade), authorId (Restrict), title/description, `dateCompleted` (deliberately separate from `createdAt`), durationDays, actualCostAmount, `currency` (Phase 13, fixed short list NPR/USD/EUR/INR validated in DTO, not a Prisma enum — no downstream exchange-rate math). No geometry of its own even after ACTIVITY_TRACKS.md — gets an optional `activityTracks` relation instead of direct geometry.
- **TripReportMedia** — its own table (not shared `Media`) — url/caption/altText/sortOrder, no uploadedById (report already has one author).
- **TripReportKudos** — `@@unique([tripReportId, userId])` stops self-inflation.
- **Comment** — authorId (Restrict), content, isActive, self-referencing `parentCommentId` (Phase 13, `Cascade` — deleting a comment takes replies with it); reply tree built in application code from a flat fetch, not a recursive CTE.

### Guide directory (FEATURE.md §6)

Yet another trust model: `GuideVerificationStatus` (`UNVERIFIED`/`PENDING_LICENSE_REVIEW`/`VERIFIED`) promotes **only via manual moderator review**, never peer-confirmation — credential trust, not content trust. Separate axis from `User.role` entirely.

- **Language** — flat master data, isoCode (ISO 639-1) as stable identifier.
- **GuideProfile** — 1:1 with User (Cascade), licenseNumber, bio, rateMin/rateMax/rateUnit (informational only, never in transaction logic; `rateUnit` converted from free text to a `RateUnit` enum `PER_DAY`/`PER_TRIP`/`PER_HOUR` in Phase 13 via a data-preserving migration), verificationStatus. I18N.md (Phase 18) added `currency String @default("NPR")`. Milestone 3 (Phase 19) made this **universal** — one row per user, auto-created at first login — and added `isListed` (opt-in to the public `/guides` directory), `contributionPoints`, `guideLevel`, `approvalsGiven` (all denormalized caches — see §4 below).
- **GuideSpecialty**/**GuideRegion**/**GuideLanguage** — many-to-many joins (Cascade from GuideProfile, Restrict to lookup).
- Restricted-region enforcement: if any `GuideRegion` references a `District.requiresRegisteredAgency` district, that guide can only reach `VERIFIED` via `PENDING_LICENSE_REVIEW` — never a shortcut.

### Trip-companion groups (FEATURE.md §8)

The one IDEA.md pillar with no design doc through Phase 10 — built Phase 12. Deliberately **no messaging model** (chat would be scope creep beyond IDEA.md's informational-only stance).

- **TripGroup** — adventurePageId (Cascade), title, description, dateStart/dateEnd, createdById (Restrict), isActive. Creating a group + joining as `ORGANIZER` happen in one transaction.
- **TripGroupMember** — tripGroupId, userId, `role: ORGANIZER|MEMBER` (two-value — organizer can edit/cancel, any member can leave), joinedAt. `@@unique([tripGroupId, userId])`.
- Open: no group-size cap, no join-approval/private mode, no organizer reassignment on leave (leaving just deletes the row), "upcoming vs past" not surfaced as separate UI views.

### Search & notifications (FEATURE.md §9)

- **Full-text search**: Postgres `tsvector`/GIN (no separate search service). `AdventurePage.searchVector Unsupported("tsvector")?` — trigger-maintained (never written by Prisma/app code) via `AFTER INSERT OR UPDATE OF title, summary` and `AFTER INSERT ON page_revisions` triggers calling a shared `refresh_adventure_page_search_vector()` function that concatenates title + summary + latest revision content, `to_tsvector('english', ...)`. `GET /adventure-pages/search?q=` ranks via `ts_rank`/`plainto_tsquery`. Covers adventure pages only — trip reports, trails/spots, guide profiles aren't indexed.
- **Notification** — one-way system messages (not chat, same framing as trip groups): userId, `type: NotificationType`, `message` (**precomputed string, not template+params** — simpler, at the cost of not being retroactively re-localizable), linkUrl, isRead. No per-recipient fan-out table. Global `NotificationsModule`, self-notifications suppressed at the service layer (not UI-filtered). `NotificationType` values: `COMMENT`, `REPLY`, `KUDOS`, `PAGE_VERIFIED`, `TRAIL_VERIFIED`, `SPOT_VERIFIED`, `GUIDE_VERIFIED`, plus Milestone 3's `REPORT_RESOLVED`, `REPORT_UPHELD_AGAINST_YOU`, `MODERATOR_APPLICATION_DECIDED`, `CHANGE_APPROVED`, `CHANGE_REJECTED`, `LEVEL_UP`. Bell icon polls every 60s, no sockets.
- Both are load-bearing examples of the "derived state is trigger/service-layer maintained, never client-driven" rule (CLAUDE.md).

### Deployment (FEATURE.md §10)

One VPS, five containers via `docker-compose.prod.yml`: **Caddy** (only internet-facing service, auto HTTPS), **api** (compiled Nest, runs `prisma migrate deploy` on every start), **admin** (Vite SPA via nginx), **public** (TanStack Start SSR via hand-written `server.prod.mjs` Node adapter — the framework's build only emits a fetch handler, not a listener), **db** (same postgis image, no host-published port). One-time setup: provision VPS, DNS (3 A records must resolve before first `up` or cert issuance fails), firewall (22/80/443 only), dedicated GitHub Actions deploy SSH key, clone repo, production `.env` (JWT secrets via `openssl rand -base64 48`), Google OAuth console callback URL. GitHub secrets: `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`/`DEPLOY_PATH`/`DEPLOY_PORT`. `.github/workflows/deploy.yml` runs on every push to `main`: SSH in, **`git reset --hard` to `origin/main`** (never `git pull` — guarantees exact match, so nothing should be hand-edited on the server except `.env`), rebuild via compose. No zero-downtime rollout (brief restart gap, accepted at current traffic).

## 4. Later specs — design and rationale

### GEODATA_HISTORY.md — geodata changeset history (built, Milestone 2 Phase 15)

Closes the gap that `PageConfirmation` ties to a revision but geodata had none to tie to.

- **TrailRevision**/**SpotRevision** — mirror `PageRevision`: full snapshot per edit (not diff), a second `Unsupported` geometry column (own GiST index), name/distanceMeters (or spotTypeId/name/description/elevationMeters for spots), editSummary, `isSafetyCriticalEdit` (now finally a **stored** column, since a permanent per-edit record now exists to attach it to), editorId (Restrict), `@@unique([trailId/spotId, version])`. No `updatedAt` — precedented exception (immutable rows).
- **Two tables, not one polymorphic changeset** — matches the repo's stated preference, and two geometry typmods (LineString vs Point) make a shared nullable-geometry table worse than usual.
- **Confirmations retargeted from row-scoped to revisionId-scoped**, arriving at exactly `PageConfirmation`'s shape (`@@unique([revisionId, userId])`, no page/row-id column at all). Consequence: **the old "delete all confirmations on edit" service rule is retired** — confirmations go stale for free by pointing at a superseded revision. The `verificationStatus` reset itself stays (denormalized cache, still zeroes for a new revision). Counting now joins through the current revision, not the row's all-time total.
- Diffing geometry: `GET .../diff?from=&to=` returns scalar field changes + PostGIS-computed geometry stats (`ST_NPoints` delta, `ST_Length` delta, `ST_HausdorffDistance` as max deviation, `ST_Equals`-derived `geometryChanged` bool) + both geometries as GeoJSON for a visual overlay (reuses the existing `AdventureMap` component, old muted/dashed vs new solid).
- API divergence from adventure pages (deliberate, recorded): geodata edits stay on `PATCH /trails/:id`/`PATCH /spots/:id` (not a new `POST :id/revisions` verb) and create the revision as a transactional side effect.
- Migration: 4 ordered raw-SQL steps (create tables + GiST indexes; backfill synthetic v1 revisions per existing row; add `revisionId` nullable→backfill→NOT NULL→swap unique constraint→drop old FK column on confirmation tables; audit for spurious `DROP INDEX`). Version-race (read-then-write `nextVersion`) is a named, accepted limitation shared with `PageRevision` — `SELECT ... FOR UPDATE` would fix it if concurrent geodata editing ever becomes real.
- Open decisions: concurrent-edit version collision (unfixed by design); backfilled confirmations aren't literally "vouched for this exact snapshot" (accepted tradeoff vs. wiping all confirmations, which would flip every VERIFIED row back to UNVERIFIED); verificationStatus stays denormalized, not join-derived; unbounded revision retention; whether reverting should be admin-gated; whether a spotTypeId change should auto-flag safety-critical; whether `TrailElevationProfile` is versioned alongside geometry (resolved elsewhere: no); whether soft-delete retains revisions; whether revert re-runs district derivation.

### TRAIL_ELEVATION.md — elevation profiles + GPX import (built, Milestone 2 Phase 16)

- **Core decision**: a 1:1 sidecar table (`TrailElevationProfile`), not `LineStringZ` geometry — `Trail.geometry`'s typmod forbids Z, and a chart needs `(distance, elevation)` pairs anyway, not raw vertices.
- **TrailElevationProfile** — trailId (unique, Cascade), `samples Json` (`[{d, e}, ...]`, whole-object read, never queried into — Json beats a 500-row-per-trail normalized table), sampleCount, ascentMeters, descentMeters, min/maxElevationMeters.
- **Trail** gains `source: TrailSource` (`DRAWN`/`GPX_IMPORT`/later `RECORDED_ACTIVITY`) and optional `elevationProfile` relation.
- **The invalidation rule** (this doc's most important point): editing a trail's **geometry** deletes its elevation profile in the same transaction as confirmation invalidation — a stale profile is the same class of lie as stale confirmations. **Must be geometry-conditional, not unconditional** — renaming a trail must not destroy its profile, a deliberate divergence from the broader confirmation-reset rule.
- **GPX import**: `POST /adventure-pages/:pageId/trails/import-gpx`, multipart, parsed **server-side only** (never trust client-derived geometry/aggregates). Parser: `fast-xml-parser` + hand-written mapper (not `@tmcw/togeojson`, which wants a DOM). One transaction creates Trail + profile. Guardrails: max file size, max-vertex cap with Douglas–Peucker/`ST_Simplify`, reject no-`<trkpt>` files (with a later fallback to `<rte>`/`<rtept>` route data for tools that export routes instead of tracks), reject out-of-Nepal bboxes, missing `<ele>` imports geometry without a profile. **Privacy**: discard `<time>` elements — a raw GPX reveals exactly when someone was at each coordinate on a public, anonymous site.
- Public UI: GPX-upload path alongside the existing draw flow; new hand-rolled-SVG `ElevationProfile.tsx` component (no chart library, consistent with the no-CDN ethos).
- Open decisions, as resolved: GPX import only ever *creates* new trails (never updates existing ones); multi-`<trkseg>` files join into one trail (resolved/implemented via ACTIVITY_TRACKS.md — a segment break is GPS signal loss, not a new activity; separate `<trk>` elements become separate trails); profile stays current-state-only, never versioned alongside `TrailRevision`. Still open: whether `Spot.elevationMeters` should auto-fill from a nearby trail profile.

### ACTIVITY_TRACKS.md — personal activity tracks (built, Milestone 2 Phase 16, alongside TRAIL_ELEVATION.md)

The Strava-analogue geometry `TripReport` never had.

- **Core decision**: a new `ActivityTrack` table, not a nullable `Trail.userId` — ownership, mutability, trust model, timestamp handling, and default visibility are all opposite `Trail`'s.
- **ActivityTrack** — userId (Cascade — personal data, "delete account, delete data," unlike `TripReport.authorId`'s Restrict), optional adventurePageId (SetNull — a personal record must outlive linked public content) and tripReportId (SetNull, many tracks per report e.g. daily legs of a trek), activityTypeId, name/notes, `geometry` (simplified path) + `samples Json` (full-fidelity `{t, d, e}` series — same sidecar split as elevation profiles, but **keeps timestamps**, since privacy-stripping is destination-scoped not parser-scoped), startedAt/finishedAt/elapsed/movingSeconds, distance/ascent/descent/min/maxElevation, `source: RECORDED|IMPORTED`, `visibility: PRIVATE|PUBLIC` (default PRIVATE), `privacyTrimMeters` (trims served geometry ends for non-owners — track endpoints reveal where someone lives), `clientUuid` (idempotency key for offline upload retries, `@@unique([userId, clientUuid])`), originalFileUrl.
- Storage sizing: ~0.5–1MB/activity at full fidelity; 10,000 activities ≈ 10GB — first feature that can materially grow the DB, and the VPS has no volume quota/monitoring. Mitigated by storing `geometry` simplified (Douglas-Peucker ~5m) and downsampling `samples` adaptively, targeting ~50-100KB/activity.
- **Import pipeline** (`apps/api/src/tracks/parsers/`) — shared with TRAIL_ELEVATION.md's GPX parser; also handles KML/KMZ (what maps.me actually exports) and GeoJSON. Normalized `ParsedTrack`/`ParsedTrackPoint` intermediate feeds both this doc's and TRAIL_ELEVATION.md's endpoints. New `MAX_TRACK_UPLOAD_SIZE_MB` env var (25, vs images' 5).
- **Contributing to the map**: `POST /activity-tracks/:id/promote-to-trail` (new Trail, `source: RECORDED_ACTIVITY`) and `POST /activity-tracks/:id/propose-trail-update` (routes through existing `TrailsService.update`, becomes a `TrailRevision` once GEODATA_HISTORY.md exists). Simplification happens once, at import/record time — promotion doesn't re-simplify. **A preview diff before promoting was not built.**
- Prerequisite fixes named (some still open): `bbox` endpoints need `ST_Simplify`+`LIMIT`+validated DTO; `LineStringGeometryDto` needs coordinate-range/max-size validation; the repo's only spatial predicate was `ST_Intersects` — off-trail/nearest-lodge queries need the first `ST_DWithin` (**not built**).
- New reads: cursor-paginated `GET /users/:id/activity-tracks` (first divergence from offset-only pagination convention), `GET /me/activity-tracks?since=` (delta sync for a future mobile client), `GET /adventure-pages/:slug/offline-bundle` (**not built** — its only real consumer is mobile, out of scope).
- Explicitly named-not-built this round: `offline-bundle` endpoint, `ST_DWithin`, and the `propose-trail-update` public UI picker (API works, no existing-trail picker built). Also not built: waypoint→Spot auto-conversion, TripReport's "attach a day's track" picker.

### I18N.md — UI internationalization (built, Milestone 2 Phase 18)

**Settled scope**: English only, but i18n-ready — wire the library, extract every string, ship only `en`. Translation labour deferred; the refactor is not.

- **`i18next` + `react-i18next`**, both apps — SSR-safe, and Refine's `i18nProvider` contract is shaped around exactly i18next's `t`/`changeLanguage`. Separate catalogues per app (no shared `packages/i18n` workspace — near-zero string overlap between admin's CRUD labels and public's contributor-facing prose).
- Catalogue layout: `apps/public/src/locales/en/{common,discover,adventurePage,guides,groups,tripReports,account}.json` (7 namespaces), `apps/admin/src/locales/en/{common,resources,dashboard}.json` (3 namespaces, `resources.json` grew per-resource `fields.*` sub-objects rather than splitting further).
- In scope: nav/buttons/labels/empty-states/badges, route `<title>`s (via `head:`), the two existing enum-label maps (`RATE_UNIT_LABELS`, `STATUS_LABEL`), AntD `ConfigProvider` locale prop, `<html lang>`. **Never in scope**: user-generated content (page titles/Markdown, trip reports, trail/spot names, group descriptions) — permanent, by design (this is a wiki; a Nepali description is a different page with its own authors, not a translation).
- **A real bug fixed alongside**: 20 bare `toLocaleDateString()`/`toLocaleString()` calls (zero `Intl.*` usage previously) caused an SSR hydration mismatch (server formats with container locale, client re-formats with visitor locale). Fixed via `lib/format.ts`'s `formatDate`/`formatDateTime`/`formatCurrency`/`formatNumber`, explicit `Intl.DateTimeFormat('en-US', ...)`. Surfaced a real data-model gap: `GuideProfile.currency` was missing (hardcoded `NPR` at 4 UI sites) — added, migrated, wired through.
- Locale persistence: a cookie resolved server-side in the root loader (no `User.locale` column — mostly anonymous visitors). No URL locale segment yet (`/en/...` would churn every route for zero benefit today; intended future strategy is a path prefix `/ne/...`, not cookie-only, since path-based is the only reliably indexable option and SEO was the reason TanStack Start was chosen over Next.js). Implementation detail: needed `createIsomorphicFn().client(...).server(...)` rather than a runtime `typeof window` check, because TanStack Start's build-time import-protection plugin statically strips server-only imports and a naive `if` branch broke the production build though it worked in dev.
- Three known blockers, explicit positions: `Notification.message` precomputed strings — **deferred** (zero benefit at English-only); ~46 API exception messages — **out of scope** (needs machine-readable error codes, a bigger separate refactor, choke point named as `http-exception.filter.ts`); master-data display names — **deferred, approach settled** (slug-as-translation-key with DB-name fallback for community-added rows, to prevent a `*_translations` table being invented later). Also recorded: the search trigger hardcodes `to_tsvector('english', ...)` — a second *content* language (different axis from UI language) would need a per-row `regconfig` or second vector column.

### MILESTONE_3.md — contribution levels, gated approval, moderation (built, Phases 19–25)

**Conceptual shift**: from an optimistic wiki (edits go live immediately, confirmations are just a trust badge) to **earned and gated** contribution.

- **Points/levels**: append-only `ContributionEvent` ledger (userId, reason, signed points, targetType, targetId **with no FK** — a deliberate exception to the polymorphic-table-avoidance convention, since 8 duplicated ledger tables would be absurd and this is an audit log never joined for referential integrity; `@@unique([userId, reason, targetId])` prevents double-award). `ContributionReason` values and points: `PAGE_CREATE` +10, `PAGE_UPDATE` +20 (others' pages only), `GEO_CREATE` +20, `GEO_UPDATE` +25 (others' only), `MEDIA_UPLOAD` +2/image, `STORY_CREATE` +5 (never gated), `MEDIA_REPORT_UPHELD` −3, `GEO_REPORT_UPHELD` −30, `PAGE_REPORT_UPHELD` (reverses original award), plus `BACKFILL`/`ADMIN_ADJUSTMENT`. Points awarded **only on approval**. Self-edits earn nothing. Cache clamps at 0 but the ledger keeps the true signed value; levels can go down (recomputed from current points — a contributor whose work keeps getting reverted loses approval rights).
- **Level curve**: `threshold(n) = 10·n·(n−1)` (escalating). Level 10 (approval rights) = 900 pts (~36 approved trail edits); level 25 (moderator eligibility) = 6,000 pts.
- **`GuideProfile` extended, not split** — one row per user (universal, auto-created at first login), carries both professional-guide fields and contribution caches (`isListed`, `contributionPoints`, `guideLevel`, `approvalsGiven`). `isListed` keeps the pre-existing `/guides` directory scoped to those who opted in (backfilled `true` for pre-Milestone-3 rows).
- **`Role` gains `MODERATOR`** (`ADMIN | MODERATOR | USER`, `USER` labelled "Member" in UI copy only). Moderators get admin-site login but **cannot**: change roles/approve moderator applications, deactivate/reactivate users, edit master data or location hierarchy, edit system settings, override the restricted-district guide licence gate. Everything else (approve/reject revisions, resolve reports, soft-delete, adjust verificationStatus) is allowed.
- **Approval pipeline**: the **existing revision tables become the pending queue** rather than a parallel store. `PageRevision`/`TrailRevision`/`SpotRevision` gain `approvalStatus` (`PENDING|APPROVED|REJECTED`), `resolvedAt`, `resolvedById`, `rejectionReason`. `AdventurePage`/`Trail`/`Spot` gain `approvedRevisionId` (nullable unique — the published version) and `pendingRevisionCount` (cache). The `*Confirmation` tables become **votes** — one added `decision: APPROVE|REJECT` column, existing `@@unique([revisionId, userId])` prevents double-voting. `Media` gains `approvalStatus`/`resolvedAt`/`resolvedById`/`isActive` (its first soft-delete column).
  - Write path: **create** writes live row + PENDING v1 revision (visible immediately, "Unapproved" badge); **edit** writes only a new PENDING revision, live row untouched (the significant refactor to `AdventurePagesService.update`/`TrailsService.update`/`SpotsService.update`); **approve** applies the snapshot to the live row (incl. PostGIS geometry via `$executeRaw`), sets `approvedRevisionId`, supersedes other pending revisions of the same target as REJECTED, writes the ledger event, notifies; **reject** marks REJECTED with a reason, no points move.
  - Eligibility: vote requires `guideLevel >= approval.minGuideLevel` (default 10) or ADMIN/MODERATOR; never vote on your own revision; approved/rejected at `approval.threshold` (default 5) matching votes, or instantly on a single admin/moderator vote.
  - **`verificationStatus` is now derived, not confirmation-counted**: `CONFIRMATION_THRESHOLD` and the standalone `confirm()` endpoints are **retired**. No approved revision → UNVERIFIED; approved = latest → VERIFIED; pending safety-critical edit or upheld-report revert → NEEDS_REVIEW. Migration **must** mark every existing revision APPROVED or the whole site flips to "unapproved" on deploy.
- **Gated vs not**: pages/trails/spots (create+edit) gated; media gated for points only (visible immediately with badge); trip reports/comments/kudos/likes/activity tracks/trip groups/guide-profile-professional-fields — **not gated**.
- **SystemSetting** — runtime-tunable key/value table (`approval.threshold`, `approval.minGuideLevel`, `moderator.minGuideLevel`, `reports.maxOpenPerUser`, per-reason point values), cached `SettingsService`, admin-only edit, every write logged.
- **ModeratorApplication** — `userId`, `statement`, `status`, review fields. Requires `guideLevel >= moderator.minGuideLevel` (25) and no existing PENDING application. Admin-only review; approval sets `role = MODERATOR` in the same transaction.
- **ContentReport** — reporterId, targetType/targetId, reason (`FAKE_OR_FALSE|INAPPROPRIATE|COPYRIGHT|DUPLICATE|SAFETY_RISK|OTHER`), status, resolution fields. Filed by any member (rate-limited to `reports.maxOpenPerUser`=10 open, one per reporter/target pair). Resolved by a level-10+ reviewer/moderator/admin (never the reporter or the content's author). Upheld: media → soft-deleted + point penalty; trail/spot/page revision → **`revertToPreviousApproved()`** (new method per service, applies the previous approved snapshot directly and forces `NEEDS_REVIEW` — turned out **not** to be a literal call into GEODATA_HISTORY.md's `revert()`, which only files another pending revision) + point penalty; trip report/comment → soft delete. Rejected reports carry **no penalty**.
- **Read model**: nothing approved → show latest revision with "Unapproved" badge; something approved → show approved version + highlighted "N unapproved changes" control (opens diff + vote UI for eligible viewers). History views gain an approvers column.
- New `NotificationType`s: `CHANGE_APPROVED`, `CHANGE_REJECTED`, `REPORT_RESOLVED`, `REPORT_UPHELD_AGAINST_YOU`, `LEVEL_UP`, `MODERATOR_APPLICATION_DECIDED`. No "needs review" broadcast — the queue is pull-based to avoid a firehose.
- Phase plan: 19 (roles/profile foundation, nothing user-visible except `/guides` filtering on `isListed`) → 20 (ledger, points accrue on the *old* write path) → 21 (approval pipeline API — **highest-risk phase**, migration must mark all revisions approved) → 22 (approval UI, also closed two gaps 21 left: a cross-type pending-queue endpoint, and vote-count fields missing from trail/spot `get()`) → 23 (reporting/enforcement, pulled `REPORT_*` notification types forward) → 24 (moderation console — turned out the server-side restriction was mostly already true from Phase 19's `@Roles(ADMIN)`; what 24 actually added was the *UI-side* mirror: a Refine `accessControlProvider` + `RestrictedRoute` guard) → 25 (polish: remaining notification types, i18n pass, `recompute:contributions` drift-correction command).
- Open decisions (§12): reject-threshold auto-expiry not designed; whether the "others only" earning rule literally applies to GEO_UPDATE per PLANNING.md's ambiguous wording (this spec: yes); PAGE_REPORT_UPHELD point value wasn't specified upstream (this spec: reverse original award); whether demotion below level 10 invalidates already-cast votes (this spec: no); whether media approval should batch with its parent page revision instead of per-image; whether moderators should eventually edit master data; backfill fairness (pre-Milestone-3 content is treated as approved and paid accordingly, even though approval didn't exist when it was made).

## 5. Design-process records

### PLANNING.md (original product brief for Milestone 3)

The raw, terse source MILESTONE_3.md was derived from. Key content already folded into §4 above: two roles (Member/Admin) plus three profiles (User/Guide/Moderator); guide levels starting at 1, points awarded only after approval; the specific point values later formalized as `ContributionReason` amounts; "5 guides at level ≥10 must approve, or admin/moderator overrides"; reports need only one level-10+ approval to remove content and dock points; "guides who approved must be visible in history." Superseded by MILESTONE_3.md as the source of truth — kept for provenance only.

### REMAINING_WORK_PLAN.md (scoping record for TRAIL_ELEVATION/GEODATA_HISTORY/district-tagging/I18N)

- **Locked decisions**: deliverable was design docs only, no implementation, for this round; i18n target = English-only-but-ready (settled, not re-litigated); elevation data source = uploaded GPX only, no DEM/SRTM/external API; GPX import designed in the *same* doc as elevation since it was an unmet prerequisite (no GPX import existed anywhere in the repo before this); district boundaries imported from OSM/HDX-family sources into a new `District.boundary` column; derived vs. manual district tags need explicit provenance.
- **Why GPX import got pulled into the elevation doc**: "elevation from uploaded GPX" presupposed an import path that didn't exist — trails were created solely by clicking points on `DrawMap`. Treated as one deliverable, not two, since GPX import is also simply a better trail-creation UX.
- **Suggested build order** (materialized into Milestone 2's actual phase order): geodata history first (it changes the confirmation-reset rule the other two hook into), then elevation, then district tagging, then i18n (fully independent, sequenced last for lower urgency).
- **Verification approach for docs-only rounds**: since the repo has zero test suite, "verification" means internal Prisma-block consistency against the live schema, cross-reference link integrity, template conformance (every doc gets the same section skeleton: Scope/Schema/Entity relationships/Per-table notes/Required additions/API/Public UI/Admin/Open decisions), and confirming no code was touched.

### TRACKS_AND_MOBILE_PLAN.md (scoping record for ACTIVITY_TRACKS/MOBILE_CLIENT)

- **Locked decisions**: mobile app not being built now, but the server side must be shaped so it's *possible* later; a recorded track lives in the owner's profile **and** can separately be contributed to create/update a `Trail` (both, not either/or); import formats limited to GPX/KML/KMZ/GeoJSON files only — explicitly **no OSM-way import** (avoids ODbL share-alike obligations and route-conflation complexity); offline basemap = self-hosted vector tiles from an OSM data extract (what maps.me actually does), not bulk-downloaded raster tiles from the OSM tile CDN (whose usage policy forbids that).
- **The central discovery that motivated the whole round**: the platform had no concept of personal geodata at all — every geometry row was page-scoped, public, wiki-editable, peer-confirmed; a recorded activity is the opposite on every one of those axes, and `TripReport` had zero geometry to hang a track off of.
- **Reasoning for the offline-basemap answer**: maps.me/Organic Maps don't bulk-download rendered tiles — they ship a compact vector file derived from OSM's raw (ODbL, freely redistributable) data and render it on-device; only the *tile server* is bulk-download-restricted. So: reproduce maps.me's approach with a Nepal extract, not a reversal of the no-API-key/no-vendor decision.
- **Verification approach**: same docs-only review process as REMAINING_WORK_PLAN.md, plus an explicit check that the "discard `<time>`" GPX privacy rule reads as destination-scoped (public Trail strips it, private ActivityTrack keeps it) rather than as a contradiction between the two docs.

## 6. MOBILE_CLIENT.md — mobile readiness (designed, not built, no milestone/phase number)

No mobile app code exists or is planned; this is pure future-readiness so the work isn't discovered mid-build. Two purposes drive it: record a track, and follow trails offline. Depends on ACTIVITY_TRACKS.md's `ActivityTrack`/import pipeline existing first (it does).

**Auth hardening needed** (current flow is entirely browser-redirect-shaped — no JSON login endpoint, no non-cookie refresh):
- `POST /auth/google/token` — native Google Sign-In ID token (or PKCE code) → tokens in the response **body**, not a redirect fragment.
- Body-based `{ refreshToken }` variant of `/auth/refresh` (currently cookie-only).
- **`secure` is never set on the refresh cookie today** — flagged as a real production bug worth fixing independently of mobile, not a mobile-only concern.
- Token-family revocation (revoking one token in a rotation chain revokes all descendants) + a `deviceLabel` column on `RefreshToken` (enables "sign out other devices").
- Machine-readable `code` on the exception filter — 401s are currently indistinguishable (expired/malformed/revoked all say "Unauthorized"), which breaks silent auto-refresh.
- `@nestjs/throttler` on auth + upload routes — **no rate limiting exists anywhere in the API today**.
- The existing web clients' shared in-flight-refresh-promise mutex needs porting to the mobile token layer (single-use rotation makes concurrent refresh fatal otherwise).

**Offline sync approach**: idempotent upload keyed on `(userId, clientUuid)` (ActivityTrack's existing unique constraint); delta pull via `?since=updatedAt`; server stays authoritative on all derived fields (distance/ascent/simplified geometry) — same "don't trust the client" instinct as `searchVector`/`verificationStatus`. No separate "sync" endpoint — offline-recorded tracks upload through the same JSON endpoint as any other track.

**Offline basemap / PMTiles plan**:
1. Fetch the Geofabrik Nepal extract (~200MB PBF, ODbL, freely redistributable).
2. Build a single-file `nepal.pmtiles` vector tileset with Planetiler (z0–14, ~200-400MB).
3. **Out-of-band build step, not CI** — deploys already `git reset --hard` and build on the VPS directly; a tile artifact must never enter git (largest tracked file today is 466KB).
4. Serve via **Caddy's `file_server` directly**, not through `apps/public/server.prod.mjs` (which lacks Range/206 support, ETag, Cache-Control — all required for PMTiles).
5. **Cheaper v1 recommended first**: per-page tile packs (clip to one adventure page's trails, tens of MB not hundreds) via `GET /adventure-pages/:slug/offline-pack`, rather than the full-country file.
- Consequence named explicitly: introduces **MapLibre alongside Leaflet** (Leaflet can't render vector tiles) — an explicit offline caveat on CLAUDE.md's locked Leaflet decision, not a reversal: MapLibre on mobile only, web stays Leaflet+raster unchanged. Also: no CDN/egress budget exists today for hundred-MB downloads — a real cost to size before shipping.

**Also named, not designed**: push notification delivery (current `Notification` model is DB-rows-polled-every-60s, useless for a backgrounded phone; needs a device-token table + FCM/APNs dispatch); background-location permissions and battery drain (client-platform concerns, flagged as a paragraph only).

**Required schema addition (not yet applied)**: `RefreshToken.deviceLabel String?` + a token-family id.

**Open decisions**: React Native vs. native (irrelevant to the server contract, deferred); whether `deviceLabel` is user-editable or a fixed platform string; whether the full-country PMTiles file is ever built or per-page packs stay sufficient permanently; push transport (FCM+APNs directly vs. a unified service).

## 7. Open decisions and known gaps (consolidated)

**Database / master data**
- Nepal geography data source isn't official (`nepal-places` npm package) — re-derive from Ministry of Federal Affairs/National Statistics Office before relying on it anywhere authoritativeness matters.
- `requiresRegisteredAgency` only flags Manang/Mustang/Gorkha as proxies for IDEA.md's three named regions — the real Nepal Tourism Board restricted list is more nuanced (Upper Dolpo, Kanchenjunga, Tsum Valley, Humla's Limi valley also restricted).

**Adventure pages**
- Tags are settable only at page-creation time, not editable afterward — a real gap.
- Related-page suggestions have no moderation queue — a named spam vector, not yet a problem.

**Geodata / history**
- Concurrent-edit version race on revisions (read-then-write, unique-constraint-guarded only) — a named, accepted limitation shared by `PageRevision`/`TrailRevision`/`SpotRevision`; `SELECT ... FOR UPDATE` is the fix if concurrent editing ever becomes real.
- Backfilled confirmations on the synthetic v1 revision aren't literally "vouched for this exact snapshot" — accepted as the least-bad option vs. wiping all confirmations.
- `verificationStatus` stays denormalized rather than confirmation-count-joined — revisit if it drifts in practice.
- Revision retention is unbounded — no pruning designed (GPX-imported revisions are heavier than hand-drawn ones).
- Whether reverting should be admin-gated (currently open to any signed-in user).
- Whether a `spotTypeId` change should auto-flag as safety-critical.
- Whether soft-deleting a trail/spot should retain its revisions (should, but unconfirmed against the `isActive` convention).
- Whether revert re-runs district derivation for the restored geometry.
- District derivation was not backfilled across existing pages (only fires going forward); `Municipality`-level boundaries not added; no intersection-length threshold for border-hugging routes.
- `GET /trails/bbox`/`/spots/bbox` still lack `LIMIT`/simplification and a validated DTO (named as a prerequisite by ACTIVITY_TRACKS.md, not yet fixed); `LineStringGeometryDto` lacks coordinate-range/max-size validation.
- The first `ST_DWithin` proximity query (off-trail detection, "nearest lodge") is not built — only `ST_Intersects` exists today.

**Elevation / tracks**
- Whether `Spot.elevationMeters` should auto-fill from a nearby trail profile — not designed.
- `TrailElevationProfile` stays current-state-only, never versioned alongside `TrailRevision` (resolved: won't be).
- Whether GPX/KML waypoints (maps.me bookmarks) become candidate `Spot`s automatically or only via manual action — not designed.
- Whether `ActivityTrack` gets its own kudos/comments or stays scoped to its parent `TripReport` — leaning toward the latter, left open.
- Whether promoting a track to a trail requires moderator approval (resolved as built: no, it's a normal peer-editable wiki edit like any other).
- Whether a `FOLLOWERS` visibility tier is worth adding once/if a follow graph exists — not designed.
- Not built this round: `GET /adventure-pages/:slug/offline-bundle` endpoint, the `propose-trail-update` public UI picker (API endpoint works, no trail-picker component), a preview diff before track promotion, `TripReport`'s "attach a day's track" picker.

**i18n**
- Which second locale ships first, and machine vs. human translation — the original blocker, deliberately still open (this round only removed the technical prerequisite).
- Whether Nepali needs Devanagari-capable font loading and any layout consequences.
- Whether `apps/admin` gets a locale switcher at all, or stays English-only permanently as an internal tool.
- `Notification.message` stays a precomputed, non-retroactively-localizable string — revisit once a second locale actually ships.
- ~46 API exception messages + class-validator defaults are out of scope for i18n (needs machine-readable error codes instead — a separate, bigger refactor).
- Search hardcodes `to_tsvector('english', ...)` — a second *content* language (distinct from UI language) would need a per-row `regconfig` or second vector column.

**Trip groups**
- No group size cap.
- No join-approval / private-group mode.
- No organizer reassignment on leave, no auto-cancel at zero members.
- "Upcoming" vs. "past" not surfaced as separate UI views (API filter exists, unused).

**Search & notifications**
- No notification preferences (can't mute a category).
- No push/email delivery, in-app bell only.
- Search covers adventure pages only — trip reports, trails/spots, guide profiles aren't indexed.

**Public site**
- In-app messaging between users/guides not designed — contact stays informational-only.
- Pagination/infinite-scroll not designed — every list currently requests a large page size.

**Deployment**
- No zero-downtime rollout — acceptable at current traffic, revisit if that changes.

**Milestone 3 (approval/moderation)**
- Reject threshold mirrors approve threshold — no auto-expiry for stuck pending items.
- Whether the "others-only" earning rule literally applies to `GEO_UPDATE` (this spec assumes yes; upstream PLANNING.md was ambiguous).
- Point value for an upheld report against a page revision wasn't specified upstream (this spec reverses the original award).
- Whether demotion below level 10 invalidates already-cast votes (this spec: no).
- Whether media approval should batch with its parent page revision instead of per-image voting.
- Whether moderators should eventually be allowed to edit master data.
- Backfill fairness: pre-Milestone-3 content is treated as retroactively approved and paid accordingly, even though approval didn't exist when it was made.

**Mobile** (deliberately out of any milestone)
- Mobile framework choice (React Native vs. native) — irrelevant to the server contract, deferred until an app is actually started.
- Whether `deviceLabel` is user-editable or a fixed platform+model string.
- Whether the full-country `nepal.pmtiles` offline basemap is ever built, or per-page offline packs stay sufficient permanently.
- Push notification transport (FCM/APNs directly vs. a unified service) — not designed.
- The `secure` cookie flag bug and missing rate limiting are real, present-day bugs independent of mobile, worth fixing opportunistically rather than waiting for a mobile build to start.
