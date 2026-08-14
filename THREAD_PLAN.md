# THREAD_PLAN.md

Design/implementation plan for the **Thread** feature: a club-native discussion post. Any approved club member can start a thread — Markdown content, one tag from a small fixed set (discussion, trip share, question, announcement, random), and up to one each of four optional attachments (`TripReport`, `Trail`, `Spot`, `AdventurePage`). Threads support one level of replies (`ThreadReply`, mirroring the existing `Comment` model). Threads become the club feed's primary unit, replacing the bare trip-reports list that previously stood in for a feed.

This doc depends on: `CLAUDE.md`'s locked conventions (soft delete, `@@map` naming, service-layer notification/moderation patterns) and `CLUB_PLAN.md` (club membership/tiering — `ClubsService.isMember`/`getActingTier` are reused directly, not re-derived). It defers: any `ContributionEvent`/points integration for thread activity (no points reason exists for it, matching `Comment`/`TripReport`'s existing no-points-for-social-content precedent), a general cross-entity `SearchModule` (the three narrow `search?q=` endpoints added for the attachment picker are a deliberate stopgap, not a search service), and reply nesting beyond one level (capped to match `Comment`'s existing depth).

## Design choices

- **Tags are a fixed Prisma enum (`ThreadTag`)**, not the reusable `Tag` model — a small closed list, not admin-managed or extensible, so it doesn't belong in the same model as `AdventurePage`'s freeform tags.
- **Four independent nullable FKs for attachments**, not a join table — a thread attaches at most one of each type, which a small fixed set of nullable columns expresses directly without the indirection of a polymorphic `{type, id}` join row.
- **`ThreadReply` is a new table mirroring `Comment`**, not a nullable `threadId` bolted onto `Comment` — matches CLAUDE.md's stated conventions section ("prefer one duplicated-but-simple table over a shared/polymorphic one").
- **`Thread.clubId` is `onDelete: Cascade`**, the inverse of `TripReport.clubId`'s `SetNull` — a thread belongs to its club (deleting the club should delete its threads), whereas a club is just a tag on a trip report's otherwise-independent life.
- **The four attachment FKs are `onDelete: SetNull`** — a thread is a discussion *about* content, not a container for it, so deactivating/deleting the attached item must not destroy the thread.
- **No approval-gating, no revision history** — same reasoning that already exempts `TripReport` ("a personal account, not a factual claim, never approval-gated") applies to a club discussion thread.
- **Reply content renders as plain text**, not through `MarkdownContent` — matches how `Comment.content` already renders on the trip-report page; only the thread body itself is Markdown.
- **Pin/lock is a separate `moderate()` endpoint/DTO from the author's own `update()`** — different authorization path (moderator tier vs. author-or-admin), so folding them into one payload would blur two different permission checks into one branch.
- **`ClubsService.getActingTier` was widened from `private` to a plain method** so `ThreadsService` can reuse the exact `STAFF`/`OWNER`/`MODERATOR` tiering `clubs.service.ts` already implements for member removal/ban — the one cross-cutting change to an existing file this feature needed.
- **Pin (club moderator or site staff) and delete (author, club owner, club moderator, or site staff) both stay allowed at the API level for site `ADMIN`/`MODERATOR`, but the public club feed's pin/delete buttons deliberately hide for site staff** — a manual pass found the public site was surfacing a delete/pin control for any logged-in site admin viewing a thread in a club they don't own or moderate, which reads as an admin capability leaking into the public UI rather than staying in the admin dashboard. `apps/public/src/routes/clubs/$clubId/index.tsx`'s `canPinThreads`/`canDeleteThreads` booleans exclude `isSiteStaff` on purpose (the API's `getActingTier` STAFF branch is untouched, since the admin dashboard's `ThreadShow.tsx` pin/delete buttons call the exact same endpoints and still need it).
- **`Thread`/`THREAD_REPLY` were added to the existing `ReportTargetType` enum** rather than building a new reporting mechanism — the Milestone-3 `ContentReport` queue already generalizes over content types; threads/replies just needed `resolveAuthorId`/`applyUphold` branches in `reports.service.ts` (soft-delete + notify, mirroring the existing `COMMENT` branch) and their new enum values threaded through the four small hardcoded label maps in both frontends (`apps/admin/src/pages/Reports.tsx`, `apps/public/src/components/ReportButton.tsx`, and the two `resources.json`/`common.json` `targetType` label objects).

## Phase 1 — Schema

File: `apps/api/prisma/schema.prisma`. Added near the existing `Club`/`ClubMember` block:

```prisma
enum ThreadTag { DISCUSSION TRIP_SHARE QUESTION ANNOUNCEMENT RANDOM }

model Thread {
  id        String    @id @default(uuid())
  clubId    String
  club      Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  authorId  String
  author    User      @relation(fields: [authorId], references: [id], onDelete: Restrict)
  content   String
  tag       ThreadTag @default(DISCUSSION)
  isActive  Boolean   @default(true)
  isPinned  Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  tripReportId    String?
  tripReport      TripReport?    @relation(fields: [tripReportId], references: [id], onDelete: SetNull)
  trailId         String?
  trail           Trail?         @relation(fields: [trailId], references: [id], onDelete: SetNull)
  spotId          String?
  spot            Spot?          @relation(fields: [spotId], references: [id], onDelete: SetNull)
  adventurePageId String?
  adventurePage   AdventurePage? @relation(fields: [adventurePageId], references: [id], onDelete: SetNull)

  replies ThreadReply[]

  @@index([clubId, isActive, createdAt])
  @@map("threads")
}

model ThreadReply {
  id        String  @id @default(uuid())
  threadId  String
  thread    Thread  @relation(fields: [threadId], references: [id], onDelete: Cascade)
  authorId  String
  author    User    @relation(fields: [authorId], references: [id], onDelete: Restrict)
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parentReplyId String?
  parentReply   ThreadReply?  @relation("ThreadReplyReplies", fields: [parentReplyId], references: [id], onDelete: Cascade)
  replies       ThreadReply[] @relation("ThreadReplyReplies")

  @@map("thread_replies")
}
```

Required additions to existing models:
- `Club`, `TripReport`, `Trail`, `Spot`, `AdventurePage`: `threads Thread[]`
- `User`: `threads Thread[]`, `threadReplies ThreadReply[]`
- `NotificationType`: add `THREAD_REPLY`
- `ReportTargetType`: add `THREAD`, `THREAD_REPLY`

### Tasks
- [x] Add `ThreadTag` enum, `Thread` and `ThreadReply` models
- [x] Add reverse-relation fields to `Club`/`TripReport`/`Trail`/`Spot`/`AdventurePage`/`User`
- [x] Add `THREAD_REPLY` to `NotificationType`, `THREAD`/`THREAD_REPLY` to `ReportTargetType`
- [x] Applied via a hand-written migration SQL file (`prisma migrate dev` refused to run non-interactively in the container, same as `CLUB_PLAN.md`'s note — used `prisma migrate diff` + `migrate deploy`, stripping the same spurious `DROP INDEX` statements the diff produces for the hand-added PostGIS GiST indexes)
- [x] Regenerate Prisma client

## Phase 2 — API: `apps/api/src/threads/` module

New module mirroring `comments.controller.ts`/`comments.service.ts` (in `trip-reports/`) for the reply tree, and `clubs.controller.ts`/`clubs.service.ts` for tiering:
- `threads.module.ts` (imports `ClubsModule`), `threads.controller.ts`, `threads.service.ts`
- `thread-replies.controller.ts`, `thread-replies.service.ts`
- `dto/create-thread.dto.ts`, `dto/update-thread.dto.ts`, `dto/moderate-thread.dto.ts`, `dto/create-thread-reply.dto.ts`, `dto/update-thread-reply.dto.ts`

Routes:
- `GET /clubs/:clubId/threads` `@Public()`, `POST /clubs/:clubId/threads` (member-gated) — `ClubThreadsController`
- `GET /threads/admin/all` `@Roles(ADMIN, MODERATOR)` (static, registered before `:id`), `GET /threads/:id` `@Public()`, `PATCH /threads/:id` (author/admin content+tag edit), `PATCH /threads/:id/moderate` (pin/lock, tiered), `DELETE /threads/:id` (author or tiered) — `ThreadsController`
- `GET /threads/:threadId/replies` `@Public()`, `POST /threads/:threadId/replies` (member-gated) — `ThreadRepliesController`
- `PATCH /thread-replies/:id`, `DELETE /thread-replies/:id` — `ThreadRepliesFlatController`

`ThreadsService.create()` rejects non-members via `clubs.isMember()`, and validates each provided attachment id resolves to a currently-*active* row of the right type (404 otherwise) — a stale/deactivated id is rejected at creation time, even though a later-deactivated attachment on an already-posted thread is tolerated and simply nulled out on read. Reads always include all four attachment relations unconditionally and null out any whose `isActive` is `false` in application code (no DB-level active-only filter on a to-one include is possible without dropping the parent row too — the same "soft delete never enforced at the FK level" convention used elsewhere).

Also added three minimal `search?q=` endpoints (id+title/name, active-only, `take: 10`) since no cross-entity search module exists: `GET /trip-reports/search`, `GET /trails/search`, `GET /spots/search`. The attachment picker's fourth type reuses the pre-existing `GET /adventure-pages/search`.

### Tasks
- [x] DTOs
- [x] `threads.service.ts`: listForClub/listAdmin/get/create/update/moderate/delete
- [x] `thread-replies.service.ts`: listForThread (flat-fetch + tree build)/create (notifies parent reply author, or thread author for a top-level reply)/update/delete
- [x] Controllers, static `admin/all` before `:id`
- [x] `threads.module.ts`, registered in `app.module.ts`
- [x] Widened `ClubsService.getActingTier` from `private` to reusable
- [x] `trip-reports.service.ts`/`.controller.ts`, `geodata/trails.service.ts`/`.controller.ts`, `geodata/spots.service.ts`/`.controller.ts`: added `search()`
- [x] `reports.service.ts`: `THREAD`/`THREAD_REPLY` branches in `resolveAuthorId`/`applyUphold` (+ new `upholdThread`/`upholdThreadReply`, mirroring `upholdComment`)

## Phase 3 — Public (`apps/public`)

- `routes/clubs/$clubId/index.tsx`: the `feed` view now lists threads (`GET /clubs/:clubId/threads`) instead of the club's trip reports — pin indicator, tag badge, content preview, attachment chips, reply count, pin/delete controls for owner/club-moderator/site-staff. "Start a thread" link, visible to approved members.
- `routes/clubs/$clubId/threads/new.tsx`: full-page composer (tag select, `Textarea` content, four `AttachmentPicker`s), posting to `POST /clubs/:clubId/threads`.
- `routes/clubs/$clubId/threads/$threadId/index.tsx`: full `MarkdownContent` body, attachment chips, one-level reply list/form (mirrors the trip-report `CommentThread` component almost exactly).
- `components/AttachmentPicker.tsx`: new search-as-you-type combobox (no prior picker pattern existed in this app), debounced against the relevant `search?q=` endpoint.
- New i18n namespace `locales/en/threads.json`, registered in `lib/i18n/index.ts`. Thread/reply body content itself stays out of the catalogue (user-generated content, per the existing documented i18n scope boundary).
- `components/ReportButton.tsx`: `ReportTargetType` widened with `THREAD`/`THREAD_REPLY`; `ReportButton` used on both the thread detail page and each reply.

### Tasks
- [x] Club feed tab → thread list + "Start a thread" link
- [x] `threads/new.tsx` composer route
- [x] `threads/$threadId/index.tsx` detail + reply route
- [x] `AttachmentPicker.tsx`
- [x] `threads.json` i18n namespace + registration
- [x] `ReportButton` target-type widening + usage on thread/reply

## Phase 4 — Admin (`apps/admin`)

- `resources/threads/ThreadList.tsx`/`ThreadShow.tsx` — mirror `ClubList`/`ClubShow`: list columns content/tag/club/author/pinned/replies with a `ShowButton`; show `Descriptions` + content + a flat replies `Table` + a pin/unpin button (`useCustomMutation` against `PATCH /threads/:id/moderate`, following the same pattern already established in `pages/Reports.tsx`) + `DeleteButton`. The replies list is fetched with a plain `fetch` in a `useEffect`, not Refine's `useCustom` — `GET /threads/:id/replies` is `@Public()`, so no auth header is needed, and a manual-testing pass found `useCustom`'s result shape needs an extra `.data` unwrap (`result.data.data`, matching `Reports.tsx`'s existing `result?.data?.data` pattern) that's easy to get wrong for a dynamic, initially-undefined url — the plain fetch sidesteps that class of bug entirely.
- Registered as a top-level `threads` resource (sibling of `clubs`, `parent: 'content'`) in `App.tsx`, plus a `threads` key in `resources.json`.
- `data-provider.ts`: `getList` special-cased `threads` to `threads/admin/all`, alongside the existing `clubs` → `clubs/admin/all` special case, since `GET /threads` isn't itself a flat admin listing (`/clubs/:clubId/threads` is the club-scoped public one).
- No standalone `ThreadReply` admin resource — matches `Comment` having none; moderation of individual replies happens through the `ContentReport` queue's existing `Reports.tsx` page (widened target types, see Phase 2/3).

### Tasks
- [x] `ThreadList.tsx`, `ThreadShow.tsx`
- [x] Register `threads` resource + `/threads` routes in `App.tsx`
- [x] `resources.json` locale keys
- [x] `data-provider.ts`: special-case `threads` list path

## Phase 5 — Verification

No existing Jest/e2e test convention in `apps/api` to extend (same gap `CLUB_PLAN.md` notes) — verify directly against the running `docker-compose` stack:

### Tasks
- [x] Create a thread as an approved club member (curl, real dev-DB club/user); confirm an unauthenticated request gets 401
- [x] Attach a well-formed but nonexistent trail id; confirm 404 (and confirmed a malformed-UUID id correctly 400s at the DTO layer instead, before it ever reaches the service)
- [x] Pin/unpin as club owner (200), confirmed via both curl and clicking the pin control in the public feed and in the admin Show page
- [x] Reply to a thread; confirmed via `GET /threads/:id/replies` the reply is attached with `parentReplyId: null`
- [x] `typecheck` clean on all three apps (`apps/api`, `apps/admin`, `apps/public`) after the full change
- [x] Clicked through the actual rendered UI in a browser: club feed thread list (pin icon/tag badge/attachment chip/reply count), the composer including the attachment picker's search-as-you-type and selected-state, the thread detail page (markdown body, attachment chip, reply list/form), and the admin Threads List/Show pages (pin toggle, replies table) — found and fixed two admin-only bugs in the process (see below), everything else matched design on first render
- [x] Test thread soft-deleted via `DELETE /threads/:id` after verification, to leave the dev DB clean
- [ ] Not done: club-moderator-vs-plain-member 403 check, reply-notification delivery check, and the `ContentReport` upheld-thread/reply flow — reasoned through via code review but not exercised end-to-end

**Bugs found and fixed during this pass** (both admin-only, `apps/api` and the public app had none): `ThreadList.tsx`/`ThreadShow.tsx` referenced a nested `author.email`/`author` object that the API response doesn't return (it returns a flattened `authorName` string instead) — fixed to use `authorName` directly. `ThreadShow.tsx`'s `useCustom` call for the replies table only unwrapped one level of Refine's response wrapper (`result.data` instead of `result.data.data`, the pattern `Reports.tsx` already uses) — replaced with a plain `fetch` in a `useEffect` instead, since the replies endpoint is `@Public()` and doesn't need Refine's auth-aware data provider at all.
