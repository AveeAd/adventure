# MILESTONE_3.md — Contribution levels, gated approval, and community moderation

Spec + phased plan for Milestone 3, derived from `PLANNING.md` and the decisions locked with the product owner on 2026-08-04 (recorded in §11).

**Depends on**: FEATURE.md §2 (schema conventions), §3 (adventure pages / `PageRevision` / `PageConfirmation`), §4 (geodata), §9 (search & notifications); GEODATA_HISTORY.md (`TrailRevision`/`SpotRevision`, diff/revert endpoints — Milestone 3 reuses both); I18N.md (all new copy goes through the catalogues, no bare literals).

**Explicitly defers**: mobile client (MOBILE_CLIENT.md, still unscheduled); email/push delivery of the new notification types (in-app only, same as FEATURE.md §9); reputation for trip groups; any reworking of `GuideVerificationStatus` (professional-guide licence review stays manual-review-only and is untouched by contributor levels).

---

## 1. What changes conceptually

Today the site is an **optimistic wiki**: an edit hits the live row immediately, and `*Confirmation` rows are a trust badge that flips `verificationStatus` to `VERIFIED` at 2 confirmations. Anyone can confirm anything.

Milestone 3 makes contribution **earned and gated**:

1. Every user accrues **contribution points** on an append-only ledger; points map to a **guide level** on an escalating curve.
2. Level ≥ 10 grants **approval rights**. Edits to existing content no longer go live on save — they sit as a pending revision until enough approvals land.
3. The live view shows the **last approved revision**; a highlighted control exposes pending changes to everyone, so readers can see truth that is merely waiting on review.
4. Anyone can **report** content; one level-10 reviewer resolves it, and an upheld report reverts the change and deducts points.
5. Level ≥ 25 can **apply for moderation**; admins decide, and moderators get admin-site login with a defined set of restrictions.

The three-axis trust model in CLAUDE.md survives intact — this adds an *approval* axis (is this change live?) alongside the existing *verification* axis (is this content peer-trusted?), and drives the latter from the former rather than from a separate confirm button.

---

## 2. Roles and profiles

### 2.1 `Role` enum

`Role` gains `MODERATOR`: `ADMIN | MODERATOR | USER`. `USER` is labelled **Member** in all UI copy (catalogue-level change, not a schema rename — `USER` is referenced across guards, seeds and the `ADMIN_EMAILS` bootstrap).

Admin-site login (`apps/admin`) is allowed for `ADMIN` and `MODERATOR`. A moderator may **not**:

- change any user's role, or approve/reject moderator applications;
- deactivate or reactivate a user;
- edit master data (activity types, difficulty levels, seasons, languages, spot types, tags) or the location hierarchy;
- edit system settings (§6) — including the approval threshold and point values;
- override the licence gate on restricted-district guide profiles (`PENDING_LICENSE_REVIEW` → `VERIFIED` stays admin-only).

Everything else a moderator can do: approve/reject any pending revision immediately, resolve reports, soft-delete content, and adjust `verificationStatus`.

### 2.2 Profiles

`PLANNING.md` names three profiles. They map onto the existing schema as:

| PLANNING.md | Implementation |
|---|---|
| User Profile | existing `Profile` (name, avatar) — unchanged |
| Guide Profile | existing `GuideProfile`, **extended** with contribution points/level (decision §11.1) |
| Moderator Profile | not a table — `Role.MODERATOR` plus `ModeratorApplication` (§7) |

`GuideProfile` becomes universal: one row per user, auto-created in the same transaction as `Profile` on first login. Its existing professional fields (`licenseNumber`, `rateMin/Max`, `rateUnit`, `currency`, `verificationStatus`, specialties/regions/languages) stay nullable and now mean "this user also offers professional guiding".

Because the public `/guides` directory currently lists every `GuideProfile` row, universality would flood it. New column:

```prisma
model GuideProfile {
  // ... existing fields unchanged ...
  isListed           Boolean  @default(false)  // opted into the professional guide directory
  contributionPoints Int      @default(0)      // cache over ContributionEvent
  guideLevel         Int      @default(1)      // cache, derived from contributionPoints
  approvalsGiven     Int      @default(0)      // cache over approval votes cast
}
```

`isListed` backfills to `true` for every row that exists at migration time; `/guides` filters on it. `contributionPoints`/`guideLevel`/`approvalsGiven` are denormalized caches — the ledger is the source of truth, and a recompute command exists for drift.

---

## 3. Points and levels

### 3.1 Ledger

```prisma
enum ContributionReason {
  PAGE_CREATE            // +10
  PAGE_UPDATE            // +20  (only when editing someone else's page)
  GEO_CREATE             // +20  (trail or spot added to an activity)
  GEO_UPDATE             // +25  (only when editing someone else's trail/spot)
  MEDIA_UPLOAD           // +2   per image
  STORY_CREATE           // +5   (trip report; no approval gate)
  MEDIA_REPORT_UPHELD    // -3
  GEO_REPORT_UPHELD      // -30
  PAGE_REPORT_UPHELD     // reverses the original award (-10 / -20)
  BACKFILL               // one-off replay of pre-Milestone-3 history
  ADMIN_ADJUSTMENT       // manual correction, requires a note
}

enum ContributionTargetType { ADVENTURE_PAGE PAGE_REVISION TRAIL TRAIL_REVISION SPOT SPOT_REVISION MEDIA TRIP_REPORT }

model ContributionEvent {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason     ContributionReason
  points     Int                       // signed
  targetType ContributionTargetType
  targetId   String                    // deliberately no FK — see note
  note       String?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@unique([userId, reason, targetId])  // idempotency: one award per contribution
  @@map("contribution_events")
}
```

`targetId` carries no FK. This is a deliberate exception to the "prefer a duplicated simple table over a polymorphic one" convention: eight duplicated ledger tables would be absurd, and this is an append-only audit log that is never joined for referential integrity. Reads resolve the target lazily and tolerate a missing row (content can be hard-deleted by an admin).

The `@@unique` is the anti-double-award guard — approving a revision twice, or a retried transaction, cannot pay twice.

### 3.2 Rules

- **Points are awarded only on approval.** The approval transaction (§5) writes the `ContributionEvent`, updates the cache columns, and fires the notification. Nothing else writes points except the backfill script and admin adjustments.
- **Self-edits earn nothing.** `PAGE_UPDATE` requires `revision.editorId != page.createdBy` (PLANNING.md is explicit here). The same rule is applied to `GEO_UPDATE` for consistency and anti-farming — flagged as open decision §12.2 since PLANNING.md doesn't say so literally.
- **Stories** (`TripReport`) earn +5 on publish, are never approval-gated, and remain outside the verification model (decision §11.5). Comments and kudos earn nothing.
- **Negative events never take a user below 0 points**; the ledger keeps the true signed value, the cache clamps at 0.
- **Levels can go down.** Level is always recomputed from current points, so penalties can demote a user out of approval eligibility. Intentional: a contributor whose work keeps getting reverted should lose the right to approve.

### 3.3 Level curve (escalating — decision §11.4)

Cumulative points required to hold level *n*:

```
threshold(n) = 10 · n · (n − 1)
```

| Level | 2 | 3 | 5 | 10 | 15 | 25 |
|---|---|---|---|---|---|---|
| Points | 20 | 60 | 200 | **900** | 2,100 | **6,000** |

Level 10 (approval rights) ≈ 36 approved trail edits or 45 approved page edits. Level 25 (moderator eligibility) is ~6.7× that — a genuine milestone. The step cost grows by 20 per level (20, 40, 60 … 480), so early levels come fast.

Implemented as a pure function in `apps/api/src/contributions/guide-level.util.ts` with the table above in a doc comment, plus a `levelProgress()` helper returning `{ level, pointsInLevel, pointsToNext }` for the profile UI.

---

## 4. What is approval-gated (and what isn't)

| Content | Gated? | Behaviour |
|---|---|---|
| Adventure page (create + edit) | **yes** | live row shows last approved revision |
| Trail / Spot (create + edit) | **yes** | same, including geometry |
| Media (image upload) | **yes** for points; visible immediately with an "Unapproved" badge (no prior version to fall back to) |
| Trip report / story | no | publishes immediately, earns points immediately |
| Comments, kudos, likes | no | unchanged |
| Activity tracks | no | user-owned private data, unchanged |
| Trip groups | no | unchanged |
| Guide profile (professional fields) | no | manual licence review, unchanged |

---

## 5. The approval pipeline

### 5.1 Schema

Rather than a parallel "pending edit" store, the **existing revision tables become the pending queue** — they are already full snapshots with an editor and a version.

```prisma
enum ApprovalStatus { PENDING APPROVED REJECTED }
enum ApprovalDecision { APPROVE REJECT }
```

Added to `PageRevision`, `TrailRevision`, `SpotRevision` (identically, per the "three parallel tables, not one polymorphic one" convention):

```prisma
  approvalStatus  ApprovalStatus @default(PENDING)
  resolvedAt      DateTime?
  resolvedById    String?        // the approver whose vote crossed the threshold, or the admin/mod
  rejectionReason String?
```

Added to `AdventurePage`, `Trail`, `Spot`:

```prisma
  approvedRevisionId String?  @unique   // the published version; null until anything is approved
  pendingRevisionCount Int    @default(0) // cache for the "N unapproved changes" badge
```

The three `*Confirmation` tables (already revision-scoped since Phase 15) become the **votes** — one added column each:

```prisma
  decision ApprovalDecision @default(APPROVE)
```

`@@unique([revisionId, userId])` already prevents double-voting. `Media` gains `approvalStatus`, `resolvedAt`, `resolvedById`, and `isActive` (it currently has no soft-delete column, which §8 needs).

### 5.2 Write path (the real behavioural change)

- **Create**: writes the live row *and* revision v1 as `PENDING`; `approvedRevisionId` stays null. Content is visible immediately with an "Unapproved" badge.
- **Edit**: writes **only** a new `PENDING` revision and increments `pendingRevisionCount`. The live row is not mutated. This is the significant refactor — `AdventurePagesService.update`, `TrailsService.update` and `SpotsService.update` currently write the live row inline.
- **Approve**: in one transaction — apply the revision snapshot to the live row (including PostGIS geometry via `$executeRaw`), set `approvedRevisionId`, mark the revision `APPROVED`, supersede any older still-pending revisions of the same target as `REJECTED` with reason `SUPERSEDED`, write the `ContributionEvent`, bump the editor's cache columns and the approver's `approvalsGiven`, recompute `verificationStatus`, notify.
- **Reject**: mark `REJECTED` with a reason, decrement the pending count, notify the editor. No points move.

### 5.3 Eligibility and thresholds

- A vote requires `guideLevel >= approval.minGuideLevel` (default 10) **or** role `ADMIN`/`MODERATOR`.
- You may never vote on your own revision.
- A revision is approved at `approval.threshold` (default 5) `APPROVE` votes, **or** immediately on a single `ADMIN`/`MODERATOR` `APPROVE`.
- A revision is rejected at `approval.threshold` `REJECT` votes, **or** immediately on a single `ADMIN`/`MODERATOR` `REJECT`.
- Thresholds are runtime settings (§6), not constants — the launch reality is a threshold of 1–2 with admins carrying the queue (decision §11.3).

### 5.4 Verification status is now derived

`CONFIRMATION_THRESHOLD = 2` and the standalone "confirm" endpoints in `adventure-pages.service.ts`, `trails.service.ts` and `spots.service.ts` are **retired**. `verificationStatus` becomes a function of approval:

- no approved revision → `UNVERIFIED`
- approved revision is the latest revision → `VERIFIED`
- a pending revision is flagged `isSafetyCriticalEdit`, or an upheld report reverted the content → `NEEDS_REVIEW`

`GuideVerificationStatus` is untouched.

### 5.5 Migration safety

The migration **must** mark every existing revision `APPROVED` and set each `approvedRevisionId` to the target's latest revision. Without it, the entire live site flips to "unapproved" on deploy. This is called out again in the Phase 21 checklist.

---

## 6. System settings

```prisma
model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String              // stringified; parsed and validated per key
  description String?
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("system_settings")
}
```

Seeded keys: `approval.threshold` (5), `approval.minGuideLevel` (10), `moderator.minGuideLevel` (25), `reports.maxOpenPerUser` (10), and one key per point value in §3.1 so the economy is tunable without a deploy. Read through a cached `SettingsService` (in-memory, invalidated on write). Admin-only edit; every write is logged with `updatedById`.

---

## 7. Moderator applications (decision §11.6)

```prisma
enum ModeratorApplicationStatus { PENDING APPROVED REJECTED }

model ModeratorApplication {
  id           String @id @default(uuid())
  userId       String
  statement    String
  status       ModeratorApplicationStatus @default(PENDING)
  reviewedById String?
  reviewedAt   DateTime?
  reviewNote   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([status])
  @@map("moderator_applications")
}
```

Submitting requires `guideLevel >= moderator.minGuideLevel` and no existing `PENDING` application. Only `ADMIN` reviews. Approval sets `user.role = MODERATOR` in the same transaction and notifies. Demotion is a plain role edit in the existing admin user resource.

---

## 8. Reporting and enforcement

```prisma
enum ReportTargetType { ADVENTURE_PAGE PAGE_REVISION TRAIL TRAIL_REVISION SPOT SPOT_REVISION MEDIA TRIP_REPORT COMMENT }
enum ReportReason { FAKE_OR_FALSE INAPPROPRIATE COPYRIGHT DUPLICATE SAFETY_RISK OTHER }
enum ReportStatus { PENDING UPHELD REJECTED }

model ContentReport {
  id             String @id @default(uuid())
  reporterId     String
  targetType     ReportTargetType
  targetId       String
  reason         ReportReason
  details        String?
  status         ReportStatus @default(PENDING)
  resolvedById   String?
  resolvedAt     DateTime?
  resolutionNote String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status, createdAt])
  @@index([targetType, targetId])
  @@map("content_reports")
}
```

- **Filing**: any authenticated member. Rate limit: at most `reports.maxOpenPerUser` (10) `PENDING` reports per user, and one open report per `(reporter, target)`. Rejected reports carry **no penalty** (decision §11.7).
- **Resolving**: one level-10+ guide, moderator or admin — matching PLANNING.md's "if one guide with level 10 approve the report". Never the reporter, never the content's author.
- **Upheld consequences**, in one transaction:
  - *Media* → `isActive = false`, `MEDIA_REPORT_UPHELD` (−3) to the uploader.
  - *Trail/Spot revision* → revert to the previous approved revision using GEODATA_HISTORY.md's existing revert path, `GEO_REPORT_UPHELD` (−30) to that revision's editor, target set to `NEEDS_REVIEW`.
  - *Page revision* → revert to the previous approved revision, `PAGE_REPORT_UPHELD` reversing the original award.
  - *Trip report / comment* → soft delete; no point change beyond reversing `STORY_CREATE` if the story is removed.
  - Editor and reporter both notified.

---

## 9. Read model and UI

### 9.1 Public site (decision §11.2)

On an adventure page, trail or spot:

- **Nothing approved yet** → render the latest revision with a clear **"Unapproved"** badge.
- **Something approved** → render the approved revision, plus a highlighted **"N recent unapproved changes"** control when `pendingRevisionCount > 0`. Clicking it opens the pending view: the proposed content diffed against the approved version (reusing the Phase 15 diff UI), with vote counts and, for eligible viewers, **Approve / Decline** buttons.
- History views gain an **approvers column** — who approved each revision and when (PLANNING.md line 52).
- **Report** control on pages, trails, spots, images and stories.
- **Review queue** route for level-10+ users: everything pending, filterable by type/district, showing votes-so-far.
- **Profile pages** show guide level with progress to next level, a contribution breakdown (activities created/updated, trails/spots, images, stories), approvals given, and the point ledger.
- **Account page** surfaces the moderator application form at level 25.

### 9.2 Admin app

New resources: **Review queue** (pending revisions, bulk approve/reject), **Reports**, **Moderator applications**, **System settings**. Existing **Users** list gains level/points/role columns and a role editor. Moderator logins see a reduced resource set per §2.1.

### 9.3 i18n

Every string above goes through the `apps/public` and `apps/admin` catalogues, including new route `<title>`s and the enum-label maps for `ContributionReason`, `ReportReason`, `ReportStatus` and `ApprovalStatus` — following I18N.md's established pattern.

### 9.4 Notifications

`NotificationType` gains: `CHANGE_APPROVED`, `CHANGE_REJECTED`, `REPORT_RESOLVED`, `REPORT_UPHELD_AGAINST_YOU`, `LEVEL_UP`, `MODERATOR_APPLICATION_DECIDED`. All fired from the service layer at the exact transaction point, per CLAUDE.md's locked rule. No "something needs review" broadcast to approvers — the queue is pull-based, to avoid a firehose.

---

## 10. Phase plan

| Phase | Scope | Notes |
|---|---|---|
| **19 — Roles & profile foundation** | `MODERATOR` role + guard changes, admin login for moderators, `GuideProfile` extension (`isListed`, points/level/approvals caches), auto-create on first login, `SystemSetting` + `SettingsService` + seeds, level-curve util | Ships behind no flag; nothing user-visible changes yet except `/guides` now filtering on `isListed` |
| **20 — Contribution ledger** | `ContributionEvent`, `ContributionsService`, award/recompute logic, backfill script replaying existing revisions/media/stories, profile UI (public) + user columns (admin) | Points accrue on the *old* write path in this phase; the gate arrives in 21 |
| **21 — Approval pipeline (API)** | revision `approvalStatus` + `approvedRevisionId`, edits no longer touch live rows, vote endpoints with eligibility/threshold, supersede logic, derived `verificationStatus`, retire `CONFIRMATION_THRESHOLD` | **Highest-risk phase.** Migration must mark all existing revisions `APPROVED` (§5.5). Touches all three content services and their PostGIS raw writes |
| **22 — Approval UI** | approved-vs-pending public rendering, "Unapproved" badge, "N unapproved changes" view with diff + vote buttons, approvers in history, review queue (public + admin) | Depends entirely on 21. Also closed two gaps 21 left open: a cross-type `GET /revisions/pending` queue endpoint (none existed - the per-target `listRevisions` routes require already knowing the target id) and `approvedRevisionId`/`pendingRevisionCount`/vote counts missing from the trail/spot `get()` responses |
| **23 — Reporting & enforcement** | `ContentReport`, filing UI, resolution flow, revert-on-uphold reusing the Phase 15 revert path, penalties, rate limiting, `Media.isActive` | |
| **24 — Moderation console** | `ModeratorApplication` + application UI + admin review, admin settings resource, moderator-restricted resource set | |
| **25 — Polish & docs** | new notification types, full i18n catalogue pass, recompute/drift command, docs: fold this into FEATURE.md conventions, update CLAUDE.md's status paragraph and doc map | Mirrors how Milestone 2 closed out |

Suggested sequencing note: 19 and 20 are independently shippable and low-risk; 21 is the one that changes how the site behaves and should land with a rehearsed migration on a database copy first.

---

## 11. Decisions locked (2026-08-04)

1. **`GuideProfile` is extended, not split.** One model carries both professional-guide fields and contributor points/level; every user gets a row. `isListed` keeps the public directory meaningful. *(Trade-off accepted: this mixes credential trust with contribution trust, which the pre-Milestone-3 docs kept separate.)*
2. **Read model**: if nothing is approved, show the unapproved version with an "Unapproved" badge; otherwise show the approved version plus a highlighted control for recent unapproved changes — pending work may well be true and shouldn't be invisible.
3. **Threshold is configurable with admin override** (default 5, minimum approver level 10); a single admin/moderator vote finalises. No hardcoded constant.
4. **Escalating level curve**, `threshold(n) = 10·n·(n−1)`: level 10 at 900 points, level 25 at 6,000.
5. **Stories earn points (+5) but are never approval-gated**; comments and kudos earn nothing.
6. **Moderator promotion goes through an application queue** that admins approve or reject.
7. **Rejected reports carry no penalty**, but open reports per user are rate-limited (default 10).

## 12. Open decisions

1. Reject threshold currently mirrors the approve threshold. If pending items pile up unrejected, an "auto-expire after N days" rule may be needed.
2. PLANNING.md says +25 for a trail/spot update without the "created by others" qualifier it applies to activities. This spec applies the others-only rule to both — confirm before Phase 20.
3. Point value for an upheld report against a *page* revision isn't specified in PLANNING.md; this spec reverses the original award (−10/−20).
4. Whether a demotion below level 10 should invalidate votes the user already cast (this spec: no, cast votes stand).
5. Whether media approval should be batched with its parent page revision rather than voted on per image — per-image is simpler but noisier for the queue.
6. Whether moderators should be able to edit master data (currently excluded) once the moderator pool is real.
7. Backfill fairness: replaying history awards `PAGE_UPDATE` for edits that were never approved under the old model, because approval didn't exist. This spec treats all pre-Milestone-3 content as approved (§5.5) and pays accordingly.
