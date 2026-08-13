# CLUB_PLAN.md

Design/implementation plan for the **Club** feature: a freestanding, persistent community (e.g. "Kathmandu Hikers Club") distinct from the existing per-adventure-page `TripGroup`. Any logged-in user can create a club and becomes its `OWNER`. A club is `PUBLIC` (instant join) or `PRIVATE` (join by request, owner approves/declines). Members can tag their trip reports with a club they belong to. No `ContributionEvent` points are awarded for any club activity in v1. Admin gets read + moderate only (list/show/deactivate), matching how every other content resource is handled — creation/editing content stays in the public app.

This doc depends on: `CLAUDE.md`'s locked architecture decisions and conventions (soft delete, `@@map` naming, generic-CRUD-vs-compound-operation split, RBAC, notification/contribution service-layer patterns). It defers: any `ContributionEvent`/points integration, a `ClubRole` co-admin tier beyond `OWNER`/`MEMBER`, and automated test coverage (no `apps/api` test convention exists yet to extend).

## Design choices

- **A `PENDING` `ClubMember` row *is* the join request** — no separate `ClubJoinRequest` table. A join request and a membership are the same relationship at different lifecycle stages (unlike `ModeratorApplication`, which is genuinely distinct from `User.role`), so collapsing them avoids an extra table and an extra transaction to copy request→membership on approval.
- **`ClubRole` is `OWNER`/`MEMBER` only** — no co-admin tier, since nothing in scope calls for one; easy to extend later.
- **Private-club detail page, viewed by a non-member, returns a trimmed shape** (name/description/visibility only, no member list) rather than a 404 — a club has to stay discoverable enough to request joining.
- **Club deactivation is a soft delete** (`isActive=false`), so Postgres's `onDelete: SetNull` on `TripReport.clubId` never actually fires from it — a report can stay tagged to an inactive club. Consistent with how other soft-deletes in this codebase leave other tables' FKs alone; treated as acceptable, not a bug to work around.
- **Club moderation in admin is gated to `ADMIN` + `MODERATOR`**, matching Trip Groups' existing `@Roles(ADMIN, MODERATOR)` gate — a deliberate divergence from `TripGroupsService.ensureOrganizerOrAdmin`, which only checks `ADMIN`.

## Phase 1 — Schema

File: `apps/api/prisma/schema.prisma`. Add near the existing `TripGroup`/`TripGroupMember` block, same `@@map` snake_case + soft-delete conventions:

```prisma
enum ClubVisibility { PUBLIC PRIVATE }
enum ClubRole { OWNER MEMBER }
enum ClubMembershipStatus { PENDING APPROVED DECLINED }

model Club {
  id            String         @id @default(uuid())
  name          String
  description   String?
  coverImageUrl String?
  visibility    ClubVisibility @default(PUBLIC)
  createdById   String
  createdBy     User           @relation(fields: [createdById], references: [id], onDelete: Restrict)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  members       ClubMember[]
  tripReports   TripReport[]
  @@map("clubs")
}

model ClubMember {
  id          String               @id @default(uuid())
  clubId      String
  club        Club                 @relation(fields: [clubId], references: [id], onDelete: Cascade)
  userId      String
  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        ClubRole             @default(MEMBER)
  status      ClubMembershipStatus @default(APPROVED)
  joinedAt    DateTime             @default(now())
  decidedById String?
  decidedBy   User?                @relation("ClubMembershipDecidedBy", fields: [decidedById], references: [id], onDelete: SetNull)
  decidedAt   DateTime?
  @@unique([clubId, userId])
  @@map("club_members")
}
```

Required additions to existing models:
- `User`: `createdClubs Club[]`, `clubMemberships ClubMember[]`, `clubMembershipsDecided ClubMember[] @relation("ClubMembershipDecidedBy")`
- `TripReport`: `clubId String?` + `club Club? @relation(fields: [clubId], references: [id], onDelete: SetNull)` — nullable/`SetNull`, mirroring `ActivityTrack`'s existing "deleting the parent must not destroy a personal record" pattern.
- `NotificationType` enum: add `CLUB_JOIN_REQUESTED`, `CLUB_JOIN_DECIDED`, with a comment following the enum's existing style.
- No changes to `ContributionReason`/`ContributionTargetType` — confirmed out of scope.

### Tasks
- [x] Add `ClubVisibility`, `ClubRole`, `ClubMembershipStatus` enums
- [x] Add `Club` and `ClubMember` models
- [x] Add reverse-relation fields to `User`
- [x] Add `clubId`/`club` to `TripReport`
- [x] Add `CLUB_JOIN_REQUESTED`/`CLUB_JOIN_DECIDED` to `NotificationType`
- [x] Applied via a hand-written migration SQL file (`prisma migrate dev` refused to run non-interactively in the container; used `prisma migrate diff` + `migrate deploy` instead, stripping the spurious `DROP INDEX` statements the diff produced for the hand-added PostGIS GiST indexes Prisma doesn't know about)
- [x] Regenerate Prisma client

## Phase 2 — API: `apps/api/src/clubs/` module

New module mirroring `apps/api/src/trip-groups/`'s shape, but flat (no page-scoped controller since Club isn't page-scoped):
- `clubs.module.ts`, `clubs.controller.ts`, `clubs.service.ts`
- `dto/create-club.dto.ts` (`name`, optional `description`, `coverImageUrl`, `visibility`)
- `dto/update-club.dto.ts` (partial of create)
- `dto/decide-club-join-request.dto.ts` (`decision: 'APPROVED' | 'DECLINED'`)

Routes on `ClubsController` (`/clubs`):
- `GET /clubs` `@Public()` — public clubs, plus (if authenticated) private clubs the caller belongs to
- `GET /clubs/admin/all` `@Roles(ADMIN, MODERATOR)` — flat admin listing; registered as its own static route **before** `GET /clubs/:id` to avoid Nest's dynamic-segment collision
- `POST /clubs` — create; club + first `OWNER` membership in one `$transaction`, same compound-operation pattern as `TripGroupsService.create()`
- `GET /clubs/:id` `@Public()` — detail; trimmed shape for non-members of a `PRIVATE` club
- `PATCH /clubs/:id`, `DELETE /clubs/:id` (soft delete) — owner or site `ADMIN`/`MODERATOR`
- `POST /clubs/:id/members` — join; only valid on `PUBLIC` clubs (mirrors `TripGroupsService.join`'s open-join + `ConflictException` on duplicate)
- `DELETE /clubs/:id/members` — leave; blocked for the `OWNER` (`ConflictException` — must delete/transfer instead of orphaning the club)
- `POST /clubs/:id/join-requests` — only valid on `PRIVATE` clubs; creates a `PENDING` `ClubMember`, guards duplicate pending/approved rows the way `ModeratorApplicationsService.submit()` does; notifies the owner **after** the write commits
- `GET /clubs/:id/join-requests` — owner or site `ADMIN`/`MODERATOR`, lists `PENDING` rows
- `PATCH /clubs/:id/join-requests/:requestId` — owner or site `ADMIN`/`MODERATOR`; `$transaction` updates status/decidedBy/decidedAt, then notifies the requester **after** commit — copy `ModeratorApplicationsService.decide()`'s exact "notify only after the transaction callback returns" convention
- `GET /clubs/:id/trip-reports` — convenience list of the club's tagged, active trip reports, for the club detail page

Service exposes `isMember(clubId, userId): Promise<boolean>` (checks `status: APPROVED`), used by `TripReportsService`. Authorization helper `ensureOwnerOrSiteModerator(id, currentUser)` is the club analog of `TripGroupsService.ensureOrganizerOrAdmin`, widened to accept `Role.ADMIN` **or** `Role.MODERATOR`.

**Deviations found necessary during implementation**: added `GET /clubs/mine` (a third static route, also registered before `:id`) returning only the caller's approved-membership clubs — needed by the trip-report club picker, which shouldn't over-fetch every public club on the platform via the general `GET /clubs`. Also, the trimmed private-club shape returned to a non-member now includes a `viewerMembership: { role, status } | null` field (the caller's own membership row only, never the roster) so the public UI can render "request pending"/"request declined" state without leaking other members.

### Tasks
- [x] `create-club.dto.ts`, `update-club.dto.ts`, `decide-club-join-request.dto.ts`
- [x] `clubs.service.ts`: create/get/list/listMine/listAdmin/update/delete/join/leave/requestToJoin/listJoinRequests/decideJoinRequest/isMember + `ensureOwnerOrSiteModerator` helper
- [x] `clubs.controller.ts`: all routes above, static `admin/all`/`mine` before `:id`
- [x] `clubs.module.ts`: export `ClubsService`
- [x] Register `ClubsModule` in `apps/api/src/app.module.ts`

## Phase 3 — API: `trip-reports` wiring

- `CreateTripReportDto` (`apps/api/src/trip-reports/dto/create-trip-report.dto.ts`): add `@IsOptional() @IsUUID('4') clubId?: string;`
- `TripReportsModule`: import `ClubsModule`
- `TripReportsService`: inject `ClubsService`; in `create()` (and `update()` if `clubId` changes), if `dto.clubId` is set, call `clubs.isMember(dto.clubId, authorId)` and throw `ForbiddenException` if false; pass `clubId` into the Prisma write. **No change** to the existing `STORY_CREATE` contribution award — club tagging must not affect points.
- Add `club: { select: { id: true, name: true } }` to the relevant `include`s so trip-report reads can show a "posted to [Club]" badge.

### Tasks
- [x] Add `clubId` to `CreateTripReportDto`
- [x] Import `ClubsModule` into `TripReportsModule`
- [x] Inject `ClubsService`, add membership guard in `create()`/`update()`
- [x] Add `club` to relevant `include`s

## Phase 4 — Admin (`apps/admin`)

- `apps/admin/src/resources/clubs/ClubList.tsx` and `ClubShow.tsx` — mirror `TripGroupList.tsx`/`TripGroupShow.tsx` exactly (list: `useTable`, columns name/visibility/member count/owner, `ShowButton` only; show: `useShow`, `Descriptions` + members `Table` with role/status tags, `DeleteButton` for deactivation). No Create/Edit components — matches the codebase-wide "admin never authors content" rule.
- Register the `clubs` resource + routes in `apps/admin/src/App.tsx` next to the existing `trip-groups` entry (same `parent: 'content'` grouping), plus the two new component imports.
- `apps/admin/src/locales/en/resources.json`: add a `clubs` top-level key mirroring the existing `trip-groups` key's shape (`label`, `fields.*`, `membersHeading`, `noDescription`).

**Deviation found necessary during implementation**: `apps/admin/src/data-provider.ts`'s generic `getList` builds the API path directly from the Refine resource name (`${resource}`), which works for `trip-groups` (its admin listing lives at that same flat root) but not `clubs` (`GET /clubs` is the public, visibility-scoped listing — the admin listing had to move to `GET /clubs/admin/all` to avoid the collision, see Phase 2). Added a one-line special case in `getList` mapping `resource === 'clubs'` to the `clubs/admin/all` path.

### Tasks
- [x] `ClubList.tsx`, `ClubShow.tsx`
- [x] Register `clubs` resource + `/clubs` routes in `App.tsx`
- [x] `resources.json` locale keys
- [x] `data-provider.ts`: special-case `clubs` list path to `clubs/admin/all`

## Phase 5 — Public (`apps/public`)

New top-level routes (not nested under an adventure page):
- `apps/public/src/routes/clubs/index.tsx` — list page
- `apps/public/src/routes/clubs/$clubId.tsx` — detail: join/request-to-join/leave depending on visibility+membership state, owner-only pending-requests panel with approve/decline, member list, linked trip reports
- `apps/public/src/routes/clubs/new.tsx` — create form (name, description, visibility toggle), gated with `useRequireAuth`, same shape as `groups/new.tsx`

Nav: add a `PrimaryNavLink to="/clubs"` to both the desktop nav block and the mobile nav block in `apps/public/src/routes/__root.tsx`, plus a `"clubs": "Clubs"` key in `common.json`'s `nav` object.

New i18n namespace `apps/public/src/locales/en/clubs.json`, modeled on `groups.json` but without page-scoped interpolation, plus join-request strings groups.json has no equivalent for (request-to-join, pending, approve/decline). Register it in `apps/public/src/lib/i18n/index.ts`: add the import and append `'clubs'` to the `ns` array (the namespace list there is a manual array, not auto-discovered).

Trip-report authoring: `StoryForm` lives inline inside `apps/public/src/routes/adventures/$slug/index.tsx` (~line 1091), not a separate route file. Add an optional club `Select` there, populated from the current user's approved club memberships, included as `clubId` in the existing `authPost(\`/adventure-pages/${pageId}/trip-reports\`, {...})` call.

### Tasks
- [x] `clubs/index.tsx`, `clubs/$clubId.tsx`, `clubs/new.tsx` routes
- [x] Nav entry (desktop + mobile) + `common.json` `nav.clubs` key
- [x] `clubs.json` i18n namespace + registration in `lib/i18n/index.ts`
- [x] Club picker in `StoryForm` (`adventures/$slug/index.tsx`), backed by `GET /clubs/mine`

## Phase 6 — Verification

No existing Jest/e2e test files exist anywhere in `apps/api` today, so there's no test convention to extend — verified directly against the running `docker-compose` stack via the API (two real dev-DB users, one temporary test `USER`-role account since only `ADMIN` accounts existed; JWTs minted locally with the dev-only `JWT_ACCESS_SECRET` — test data cleaned up afterward) and via curl'd SSR HTML for the public routes:

### Tasks
- [x] Create a public club as user A; confirm A is `OWNER`
- [x] As user B, join the public club instantly; leave it
- [x] Create a private club as A; as B, send a join request; confirm A sees it pending and gets a notification; A approves; B gets a notification and is now `APPROVED`
- [x] As B (now a member), write a trip report and tag it with the club; confirm `STORY_CREATE` points still post normally and no club-related `ContributionEvent` rows are created
- [x] As a non-member, confirm the private club's detail view is trimmed (no member list) and a trip-report create attempt with that `clubId` is rejected
- [x] In the admin app (as `ADMIN` and separately as `MODERATOR`), confirm both can list/show clubs and deactivate one; confirm the deactivated club disappears from public listings but its tagged trip reports remain intact
- [ ] Not done: clicking through the actual rendered UI in a browser (join/leave buttons, approve/decline panel, club picker dropdown) — only SSR HTML output and the underlying API were verified. Worth a manual pass before considering this fully shipped.

## Open decisions

1. Whether to write this doc as a permanent design doc (it now lives at `CLUB_PLAN.md` — consider renaming/merging into a `CLUBS.md` once built, matching `TRAIL_ELEVATION.md`'s pattern), given `FEATURE.md`/`MILESTONE_3.md` don't exist as real files despite `CLAUDE.md` describing them at length.
2. Whether `ClubRole` will need an `ADMIN` co-owner tier later — left out of v1 as no need was stated.
