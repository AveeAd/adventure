# Plan — design the four remaining deferred items

## Context

Phases 1–14 are built and deployed. FEATURE.md §1's "Deferred" section lists exactly four things left, and all four are **undesigned, not merely unbuilt**:

1. Elevation-along-path profiles for trails
2. Spatially-derived district tagging
3. Full OSM-style changeset history for geodata
4. UI-language i18n

The first three were deferred in one sentence at FEATURE.md §4, each with a stated blocker. The fourth is blocked at FEATURE.md §1/§11 on "a scoping decision (target languages, machine vs. human translation) before any library gets wired in."

Per CLAUDE.md, this repo's established rhythm is **design doc first, implementation after** — every prior phase has a markdown spec that says what it depends on and what it defers. This round deliberately delivers **design docs only**, resolving the open decisions so implementation becomes mechanical. No schema, API, or UI code is written.

### Decisions locked for this round

| Question | Decision |
|---|---|
| Deliverable | Design docs only — no implementation |
| i18n target languages | **English only, but i18n-ready**: wire the library and extract all strings to a catalogue, ship only the `en` locale |
| Elevation data source | **From uploaded GPX tracks** — no DEM/SRTM, no external elevation API |
| GPX import | Design it **in the same doc** as elevation (it's the unmet prerequisite) |
| District boundary polygons | **Import from OSM/HDX** into a new `District.boundary` column |
| Derived vs. manual district tags | **Add provenance** — derived tags must be distinguishable |

### Why GPX import got pulled in

"Elevation from uploaded GPX" has a prerequisite that doesn't exist: there is **no GPX import anywhere in the repo**. `apps/api/src/uploads/` is images-only (`'Only JPEG, PNG, WEBP, and GIF images are allowed'`, `uploads.controller.ts:36`), trails are created solely by clicking points on `DrawMap`, and "GPX" appears exactly once in the codebase — as a passing aside at FEATURE.md §4. So the elevation doc has to design the import that feeds it. This is a net win: GPX import is a far better trail-creation path than clicking a polyline by hand.

---

## Deliverables

Four docs, plus reconciling edits to the docs that currently describe these as deferred.

| # | Doc | Status |
|---|---|---|
| A | `TRAIL_ELEVATION.md` (new) — GPX import + elevation profiles | design |
| B | FEATURE.md §4 (edit) — spatially-derived district tagging | design |
| C | `GEODATA_HISTORY.md` (new) — changeset history | design |
| D | `I18N.md` (new) — UI i18n | design |

All four follow FEATURE.md §8's section template, the fullest precedent for an unbuilt-feature doc:

```
# Title
(intro para: what this depends on, cross-linked)
**Status**: designed, not built.
## Scope                                  (deferrals as the closing paragraph)
## Schema (additions to prisma/schema.prisma)   (one annotated prisma fence)
## Entity relationships                   (mermaid erDiagram)
## Per-table notes                        (bullets, each a **bolded claim** then prose)
## Required additions to existing models  (2-col table + "not added retroactively" note)
## API (apps/api/src/<module>/)
## Public UI (apps/public/src/routes/…)
## Admin (apps/admin/src/resources/…)
## Open decisions
```

---

## Doc A — `TRAIL_ELEVATION.md`: GPX import + elevation profiles

### Core design decision: a sidecar profile table, not `LineStringZ`

FEATURE.md §4 deferred this partly because "a full 3D `LineStringZ` profile is new complexity." That reasoning still holds, so **elevation does not go into the geometry column.** Instead a 1:1 sidecar table holds the sample series plus cached aggregates.

Why not `LineStringZ`:
- `Trail.geometry` is `Unsupported("geometry(LineString, 4326)")` — the typmod forbids Z, so adopting it means an `ST_Force3D` migration over every existing row and a mixed-dimensionality world (hand-drawn trails have no Z).
- `ST_AsGeoJSON` would start emitting 3-element coordinates into `AdventureMap`'s `GeoJSON.LineString` contract (`apps/public/src/components/AdventureMap.tsx:20-23`) and into admin's `GeometryMap`. Leaflet tolerates it, but the type contract silently changes for every map consumer.
- A chart needs `(distanceAlongPath, elevation)` pairs, not raw vertices. Deriving that from geometry on every read contradicts FEATURE.md §4's cached-scalar convention.

A sidecar table keeps the `Trail` row lean (every geodata read is an explicit-column `$queryRaw` select, so the profile is simply not selected), adds no new `Unsupported` column, and makes "has no profile" a row absence rather than a null blob.

### Schema

```prisma
enum TrailSource {
  DRAWN       // clicked vertex-by-vertex in DrawMap
  GPX_IMPORT  // parsed from an uploaded .gpx track
}

model TrailElevationProfile {
  id                 String   @id @default(uuid())
  trailId            String   @unique
  trail              Trail    @relation(fields: [trailId], references: [id], onDelete: Cascade)
  // [{ d: <metres along path>, e: <metres elevation> }, ...] - a whole-object
  // read, never queried into, so Json beats a samples table with 500 rows/trail
  samples            Json
  sampleCount        Int
  ascentMeters       Int
  descentMeters      Int
  minElevationMeters Int
  maxElevationMeters Int
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("trail_elevation_profiles")
}
```

Plus on `Trail`: `source TrailSource @default(DRAWN)` and `elevationProfile TrailElevationProfile?`.

`onDelete: Cascade` because a profile is owned exclusively by its trail — CLAUDE.md's stated rule for parent-owned content.

### The invalidation rule (the doc's most important paragraph)

**Editing a trail's geometry deletes its elevation profile, in the same transaction as the confirmation delete.** A profile is only meaningful for the exact path it was derived from; a moved path with a stale profile is the same class of lie as a moved path with stale confirmations. This slots directly into the existing block at `apps/api/src/geodata/trails.service.ts:78-113`, right beside `tx.trailConfirmation.deleteMany(...)`, and the doc should present it as a second instance of FEATURE.md §4's load-bearing service-layer rule rather than a new concept.

Note the existing `update()` resets verification **unconditionally on any update**, not only on geometry change. The doc should call out that the profile delete needs to be geometry-conditional (renaming a trail must not destroy its profile) — a deliberate divergence from the confirmation rule, and worth stating explicitly so implementation doesn't copy the broader behaviour by reflex.

### GPX import

- **Endpoint**: `POST /adventure-pages/:pageId/trails/import-gpx`, multipart. Mirrors the existing page-scoped controller pattern (`AdventurePageTrailsController`).
- **Parse server-side, never client-side.** Same instinct CLAUDE.md records for `searchVector` and `verificationStatus`: derived state is not client-driven. The client uploads bytes; the server produces geometry, samples, and aggregates.
- **Parser**: `fast-xml-parser` plus a small mapper, not `@tmcw/togeojson` (which wants a DOM and would need a shim in the API container). Dependency-light and keeps the "no unnecessary deps" character of the repo.
- **One transaction** creates the `Trail` (geometry via the existing `ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)` + `ST_Length(...::geography)::int` distance path already at `trails.service.ts:61-73`) and its profile, with `source: GPX_IMPORT`.
- **Guardrails the doc must specify**: max file size; a max-vertex cap with Douglas–Peucker/`ST_Simplify` on import (a 10 km GPS track is easily 5,000 points, and the bbox query has no `LIMIT` or simplification today); reject files with no `<trkpt>`; reject tracks whose bbox falls outside Nepal; treat missing `<ele>` as "import geometry, no profile."
- **Privacy**: discard `<time>` elements. A raw GPX reveals exactly when a person was at each coordinate, and this is a public, anonymously-readable site. Worth an explicit bolded note — it's the kind of thing that's much cheaper to decide now than to retrofit.

### UI

- **Public**: `/adventures/$slug/trails/new` gains a GPX-upload path alongside the existing `LazyDrawMap` draw flow. The adventure page view (`adventures/$slug/index.tsx`, `TrailsAndSpotsSection` around L481) gains an elevation chart beneath the map, plus ascent/descent in the trail row.
- **New component**: `apps/public/src/components/ElevationProfile.tsx`, inline SVG, no chart library — consistent with the no-API-key/no-CDN ethos and with `TopoLines.tsx` already being hand-rolled SVG.
- **Implementation-time note for the plan, not the doc**: whoever builds the chart must load the `dataviz` skill before writing it. That is a build-time obligation; this round only specifies that the component exists and what it plots.
- **Admin**: `TrailShow.tsx` shows aggregates and a "delete profile" escape hatch for a bad import.

### Open decisions to leave open

- Whether GPX import may **update** an existing trail's geometry, or only create new trails.
- Whether `Spot.elevationMeters` should be auto-filled from a nearby trail profile instead of staying hand-entered.
- Whether multi-`<trkseg>` files become one trail or several.

---

## Doc B — FEATURE.md §4 edits: spatially-derived district tagging

This is an **edit to FEATURE.md §4**, not a new doc — it's one of that doc's own deferrals, and its schema addition lands on models FEATURE.md §4 already owns.

### Schema

```prisma
model District {
  // ...existing fields...
  // Nullable: import may be partial, and 838 location rows predate boundaries.
  // Same Unsupported/GiST/raw-SQL consequences as Trail.geometry - see below.
  boundary Unsupported("geometry(MultiPolygon, 4326)")?
}

enum DistrictTagSource {
  MANUAL   // picked by a contributor in the page form
  DERIVED  // computed from trail/spot geometry via ST_Intersects
}

model AdventurePageDistrict {
  // ...existing fields...
  source    DistrictTagSource @default(MANUAL)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`AdventurePageDistrict` currently has **no timestamps at all** — a standing violation of FEATURE.md §2's "`createdAt`/`updatedAt` on every table" convention. Worth fixing in the same migration and noting as such.

### Boundary import

- Script `apps/api/prisma/scripts/import-district-boundaries.ts`, fixture `apps/api/prisma/seed-data/nepal-district-boundaries.geojson`, source HDX/OSM.
- Matched to existing districts **by slug**, idempotent upsert — exactly the pattern `import-locations.ts` already establishes, and the same documented exception to the no-seed-script rule ("static public reference data, not user-curated content").
- The doc must address fixture size: full-resolution district polygons run to tens of MB. Simplify at import time (`ST_SimplifyPreserveTopology`) and/or commit a pre-simplified fixture; tagging needs "which district is this trail in," not cartographic precision.

### Derivation rule

- Fires **service-layer**, from trail/spot create and geometry-update — never client-driven. Cite CLAUDE.md's existing line on `searchVector`/notification side effects; this is the same instinct applied to a third kind of derived state.
- `ST_Intersects(d.boundary, t.geometry)` for trails, `ST_Contains(d.boundary, s.geometry)` for spots.
- **`MANUAL` always wins.** The unique constraint is `[adventurePageId, districtId]`, so a derived row cannot coexist with a manual one for the same district — insert derived rows `ON CONFLICT DO NOTHING`. Derivation may add rows; it may never delete or downgrade a `MANUAL` one.

### The write-path bug this must fix

`updateMetadata` (`apps/api/src/adventure-pages/adventure-pages.service.ts:218-226`) currently does a wholesale `deleteMany({ where: { adventurePageId: id } })` then `createMany`. Left as-is, **every metadata edit silently wipes all derived tags.** The delete must narrow to `{ adventurePageId: id, source: 'MANUAL' }`. The doc should name this explicitly as a required service-layer change, not leave it to be discovered during implementation.

### Migration ordering

Adding `District.boundary` makes a **third** hand-added GiST index (`districts_boundary_idx`). The repo has already been bitten once: `20260729063554_add_trip_groups/migration.sql` spuriously emitted `DROP INDEX` for both geometry indexes, and `20260729064500_restore_geodata_indexes/migration.sql` exists solely to restore them. The doc must repeat the audit instruction — check generated SQL for spurious `DROP INDEX` lines, use `CREATE INDEX IF NOT EXISTS` — and note that migrations run automatically on API container startup, so a bad one breaks deploy.

### Open decisions to leave open

- Whether to backfill derivation across existing pages, or only derive going forward.
- Whether `Municipality` gets boundaries too (finer tagging, much bigger fixture).
- What to surface when a trail clips a district the author plainly didn't intend (a border-hugging route picking up a neighbour) — suppress by intersection-length threshold, or show it and let editors remove it.

---

## Doc C — `GEODATA_HISTORY.md`: changeset history

Two decisions locked: **full row snapshots per edit**, and **confirmations become revision-scoped**, closing the gap FEATURE.md §4 names as "a real gap."

### Two tables, not one polymorphic changeset

`TrailRevision` + `SpotRevision`, mirroring `PageRevision`. The tempting alternative — one `GeoChangeset` with nullable `trailId`/`spotId` — is exactly what CLAUDE.md tells us not to build: "prefer one duplicated-but-simple table over a shared/polymorphic one when Prisma can't express the polymorphism cleanly." The precedents are `Media` vs. `TripReportMedia` and the three separate `*Confirmation` tables. Two geometry types with different typmods make the polymorphic version worse than usual here.

```prisma
model TrailRevision {
  id                   String   @id @default(uuid())
  trailId              String
  trail                Trail    @relation(fields: [trailId], references: [id], onDelete: Cascade)
  version              Int
  // Full snapshot, not a diff - mirrors PageRevision.content. A second
  // Unsupported geometry column: hand-added GiST index, raw-SQL-only reads.
  geometry             Unsupported("geometry(LineString, 4326)")
  name                 String?
  distanceMeters       Int?
  editSummary          String?
  isSafetyCriticalEdit Boolean  @default(false)
  editorId             String
  editor               User     @relation(fields: [editorId], references: [id], onDelete: Restrict)
  createdAt            DateTime @default(now())

  confirmations TrailConfirmation[]

  @@unique([trailId, version])
  @@map("trail_revisions")
}
```

`SpotRevision` mirrors it with `spotTypeId`, `name`, `description`, `geometry(Point, 4326)`, `elevationMeters`.

**No `updatedAt`** — verified against `PageRevision`, which has `createdAt` only. Revisions are immutable, so this is an established, precedented exception to FEATURE.md §2's timestamp convention and the doc should say so rather than look like an oversight.

`isSafetyCriticalEdit` finally becomes a stored column. FEATURE.md §4 explicitly explains it's transient "since there's no permanent per-edit record to attach it to" — that reason is now gone, and the doc should retire it by name.

### Confirmations become revision-scoped

`PageConfirmation` keys on `revisionId` **alone** — no `pageId` — with `@@unique([revisionId, userId])`. Mirroring exactly:

```prisma
model TrailConfirmation {
  id         String        @id @default(uuid())
  revisionId String
  revision   TrailRevision @relation(fields: [revisionId], references: [id], onDelete: Cascade)
  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime      @default(now())

  @@unique([revisionId, userId])
  @@map("trail_confirmations")
}
```

Consequences the doc must state plainly:

- **The load-bearing service rule at FEATURE.md §4 is superseded.** Confirmations are no longer deleted on edit — they go stale for free, because they point at a revision nobody is looking at any more. This is the whole point of the change.
- **The `verificationStatus` reset stays.** It's a denormalised cache on the row, and a new revision starts at zero confirmations, so it must still reset. Only the `deleteMany` goes away.
- **Counting confirmations now joins through the revision.** `CONFIRMATION_THRESHOLD = 2` still applies, but against the *current* revision's confirmations.
- Dropping `trailId` from the confirmation table is a real schema break; the migration section below covers it.

### Diffing geometry

`diffLines` from the `diff` package is meaningless for a LineString, so geodata diverges from adventure pages here. The `GET …/diff` endpoint returns:

- **Scalar field changes** — a simple changed-fields list (`name`, `distanceMeters`, `spotTypeId`, …), old and new.
- **Geometry summary stats**, computed in PostGIS since the geometry is already raw-SQL-only: `ST_NPoints` delta (vertices added/removed), `ST_Length(::geography)` delta in metres (reusing the exact cast already at `trails.service.ts:70`), `ST_HausdorffDistance` as "maximum deviation," and a `geometryChanged` boolean from `ST_Equals`.
- **Both geometries as GeoJSON**, so the UI overlays them.

The visual diff is then free: feed old and new geometry to the existing `AdventureMap`, old rendered muted/dashed, new solid. No new map component, and it's genuinely more useful than a text diff would have been.

### API

Mirrors the adventure-pages surface, with one deliberate divergence:

| Endpoint | Note |
|---|---|
| `GET /trails/:id/revisions` | `@Public()`, metadata-only select (no geometry), mirroring `listRevisions` |
| `GET /trails/:id/revisions/:version` | `@Public()`, includes geometry as GeoJSON |
| `GET /trails/:id/diff?from=&to=` | `@Public()`, shape above |
| `POST /trails/:id/revisions/:version/revert` | New revision copying the old snapshot, `editSummary: "Reverted to version N"` — never a delete or pointer move, per `revert` at `adventure-pages.service.ts:355-361` |

**The divergence**: adventure pages create revisions via `POST :id/revisions`, but geodata edits already go through `PATCH /trails/:id`. Keep `PATCH` and create the revision as a transactional side effect. Churning the existing contribute UI to a new verb would buy nothing, and the doc should record this as a considered inconsistency rather than let it read as sloppiness.

Trail/spot **create** gains a `version: 1` revision in its existing transaction, mirroring `create` at `adventure-pages.service.ts:190-223`.

### Migration — the riskiest part of this round

Four ordered steps, all raw SQL (geometry can't round-trip through Prisma):

1. Create `trail_revisions` / `spot_revisions`; hand-add `USING GIST (geometry)` indexes for both.
2. **Backfill a synthetic version-1 revision per existing active row** — geometry copied, `editorId = createdById`, `createdAt = trails.createdAt`, `editSummary = 'Imported from pre-history row'`.
3. Add `revisionId` to both confirmation tables **nullable**, backfill it to each row's version-1 revision, *then* set `NOT NULL` and swap the unique constraint from `[trailId, userId]` to `[revisionId, userId]`, then drop `trailId`. The three-step nullable→backfill→constrain sequence is mandatory; a single-step migration fails on any non-empty deployment.
4. Audit the generated SQL for spurious `DROP INDEX` lines and use `CREATE INDEX IF NOT EXISTS` throughout.

That last point is not hypothetical: `20260729063554_add_trip_groups/migration.sql` dropped both existing GiST indexes, and `20260729064500_restore_geodata_indexes/migration.sql` exists solely to undo it. This round takes the count from 2 hand-added spatial indexes to 5 (two revision tables, plus `districts_boundary_idx` from Doc B). Migrations run automatically on API container startup, so a bad one breaks the deploy — worth a bolded warning.

**The version race**: `submitRevision` computes `nextVersion = (latest?.version ?? 0) + 1` read-then-write, guarded only by the unique constraint. The doc should mirror the pattern for consistency but name the limitation, and note `SELECT … FOR UPDATE` as the fix if concurrent geodata editing ever becomes real.

### UI

- **Public**: `/adventures/$slug/trails/$trailId/history` and `…/history/$version`, reusing the timeline markup from `apps/public/src/routes/adventures/$slug/history/index.tsx` (dot-and-line timeline, `v{n}` link, safety-critical badge, `editSummary`).
- **Admin**: `TrailShow.tsx` / `SpotShow.tsx` gain a revisions list; verification override and delete stay as-is.

### Open decisions to leave open

- Whether `TrailElevationProfile` (Doc A) is versioned alongside geometry, or stays current-state-only.
- Whether soft-deleting a trail retains its revisions (it should, but confirm against the `isActive` convention).
- Whether revert re-runs district derivation (Doc B) for the restored geometry.
- The read-then-write version race above.

---

## Doc D — `I18N.md`: UI internationalization

Decision, already made and **not to be relitigated**: **English only, but i18n-ready.** Wire the library, extract every UI string to a catalogue, ship only `en`. Translation labour is deferred; the refactor is not.

### Library and catalogue layout

**`i18next` + `react-i18next` for both apps.** It's SSR-safe, framework-agnostic, and — decisively — Refine's `i18nProvider` contract is shaped around exactly i18next's `t`/`changeLanguage`, so admin gets first-class integration for almost nothing. Rolling our own would fit the repo's minimal-dependency character (hand-rolled SVG, no chart library, raw SQL) but plurals and interpolation are where hand-rolled i18n reliably goes wrong.

**Separate catalogues per app, not a shared `packages/i18n` workspace.** The root `package.json` declares `apps/*` only, so a shared package means adding a `packages/` tier plus build-order changes in both `Dockerfile.dev` and `Dockerfile.prod` — real cost against near-zero benefit, since the two apps share almost no strings (admin is master-data CRUD labels; public is contributor-facing prose). Revisit only if overlap grows.

- `apps/public/src/locales/en/{common,discover,adventurePage,guides,groups,tripReports,account}.json`
- `apps/admin/src/locales/en/{common,resources,dashboard}.json`
- Keys: `namespace:dot.separated.key`, e.g. `adventurePage:trailsAndSpots.heading`.

### What is in scope

Translatable UI chrome — roughly 120 strings in public, ~75 in admin:

- Inline JSX text and `label`/`hint`/`placeholder`/`aria-label` props across 19 public routes and 15 components.
- **Route `<title>`s** — every route sets one via TanStack's `head:` (`head: () => ({ meta: [{ title: 'Guide directory' }] })`). Easy to miss, and SEO-relevant.
- The two existing enum-label maps, which are already string tables and make the natural first extraction: `RATE_UNIT_LABELS` in `apps/public/src/lib/format.ts` and `STATUS_LABEL` in `apps/public/src/components/Badge.tsx:17`.
- Admin: Refine resource `meta.label`s in `App.tsx` (~15), `apps/admin/src/resources/config.ts` (~30 — the most structured, cheapest to convert), `apps/admin/src/pages/Dashboard.tsx` (~31).
- AntD's own `ConfigProvider` gains a `locale` prop, currently absent, so pagination/empty-state/date-picker strings stop being hardcoded en_US.
- `<html lang>` in `apps/public/src/routes/__root.tsx:74` and `apps/admin/index.html:2` become locale-driven.

**Explicitly not translatable**: user-generated content — page titles and Markdown, trip reports, trail/spot names, group descriptions. The doc should draw this boundary early, since it's the line that keeps scope finite.

### Locale-aware formatting — the part with immediate value

This is worth doing even at English-only, because it fixes a **live bug**. There are 13 bare `toLocaleDateString()`/`toLocaleString()` calls with no locale argument and zero `Intl.*` usage anywhere. Under SSR, the server formats with the *container's* locale and the client re-formats with the *visitor's* — so server HTML and hydrated HTML can disagree. That's a hydration mismatch shipping in production today, in both apps.

- Centralise in `apps/public/src/lib/format.ts` (already exists, already holds `formatRateUnit`) with explicit `Intl.DateTimeFormat(locale, opts)`.
- Currency: replace the raw concatenation `{report.currency} {report.actualCostAmount}` with `Intl.NumberFormat(locale, { style: 'currency', currency })`.
- **Flag `GuideProfile.currency` as missing.** It has `rateMin`/`rateMax`/`rateUnit` but no currency column, so `NPR` is hardcoded at four UI sites while `TripReport` has had a real `currency` column since Phase 13. That's a data-model gap, not an i18n one — recommend adding the column, and note the inconsistency either way.
- Units are baked into labels (`"Max altitude (m)"`, `"Duration (days)"`, `${(v/1000).toFixed(1)} km`). Keep metric-only; make the unit part of the translatable string rather than building a unit-conversion layer.

### URL and locale persistence

**No URL locale segment now.** With only `en` shipping, adding `/en/…` churns every route file and every `<Link>` for zero benefit — and there is **no sitemap.xml, no robots.txt, and no canonical tags** anywhere in `apps/public`, so the SEO surface being protected is just `<title>` tags. Document the *intended* future strategy so the choice isn't re-opened blind: a **path prefix** (`/ne/…`), not cookie-only, because path-based is the only reliably indexable option — and SEO is the stated reason TanStack Start was chosen over Next.js, so it deserves the deciding vote.

Persistence: a cookie, resolved server-side in the root loader so SSR and client agree. **No `User.locale` column** — a public read-heavy site serves mostly anonymous visitors, for whom a per-user column does nothing.

### The three known blockers — explicit positions

| Blocker | Position | Why |
|---|---|---|
| `Notification.message` precomputed strings | **Deferred** | FEATURE.md §9 already accepted this. Migrating to `type` + `params Json` has zero user-visible benefit at English-only, and historical rows stay English regardless of when we do it. Record it as a known cost with the migration path named. |
| ~46 API exception messages + class-validator defaults | **Out of scope** | The right fix is stable machine-readable error codes, not translated strings — a bigger, separate refactor. Name `apps/api/src/common/filters/http-exception.filter.ts` as the single choke point where codes would attach. |
| Master-data display names (`ActivityType.name` et al.) | **Deferred, with the approach settled** | Every lookup table has a stable `slug`, so slug-as-translation-key needs no migration. But master data is community-extensible from admin, so a new `SpotType` will have no catalogue entry — any implementation must fall back to the DB `name`. Stating this now prevents a `*_translations` table being invented later. |

One more to record: the search trigger hardcodes `to_tsvector('english', …)` (`20260729080000_search_and_notifications/migration.sql:33,69`). A second *content* language would need a per-row `regconfig` or a second vector column. Out of scope — content language is a different axis from UI language — but it belongs in Open decisions so the constraint is written down.

### Open decisions to leave open

- Which second locale actually comes first, and machine vs. human translation (the original blocker — deliberately still open; this pass only removes the *technical* blocker).
- Whether Nepali needs Devanagari-capable font loading and any layout consequences.
- Whether admin gets a locale switcher at all, or stays English-only permanently as an internal tool.

---

## Reconciling edits to existing docs

Designing these four changes the status of text that currently calls them deferred. Every one of these is a specific known line:

| File | Edit |
|---|---|
| FEATURE.md §4 | The three-item deferral paragraph — all three items are now designed; rewrite to point at the new docs |
| FEATURE.md §4 | The "no revision history, unlike `PageRevision`" tradeoff paragraph — becomes historical context once Doc C exists |
| FEATURE.md §4 | The confirmation-reset service rule — Doc A adds profile invalidation, Doc C may supersede it entirely |
| FEATURE.md §4 | The cached-scalar note — extend to cover elevation aggregates |
| FEATURE.md §1/§11 | The Deferred bullets naming all four items |
| `CLAUDE.md:24` | "Still deferred… UI i18n… and a few small undesigned geodata extras" |
| `CLAUDE.md` doc map + locked-decisions | Add the three new docs; add the elevation/i18n/history decisions |
| FEATURE.md §7 | The i18n deferral note |
| FEATURE.md §9 | `Notification.message` "not retroactively re-localizable… i18n is still an open decision" — i18n is no longer open |

CLAUDE.md's convention that a not-yet-built phase's "required additions to existing models" are **not applied retroactively** governs all four docs: the prisma blocks are specifications, and `apps/api/prisma/schema.prisma` is left untouched this round.

## Verification

There is **no test suite in this repo** — zero `*.spec.ts`/`*.test.ts`, no jest/vitest, no `test` script in any package.json, and `.github/workflows/deploy.yml` has no test or lint step. So verification for a docs-only round is review, not execution:

1. **Internal consistency** — every prisma block in the new docs typechecks *as a specification* against the live `apps/api/prisma/schema.prisma`: no field name collisions, every relation has its reverse side listed in the "required additions" table, every enum is new or already exists.
2. **Cross-reference integrity** — every `[Doc](Doc.md)` link resolves; every doc states its dependencies and deferrals per CLAUDE.md; the nine reconciling edits above are all applied, with no remaining text calling a now-designed item "deferred" or "undesigned" (grep for `undesigned`, `not designed`, `deferred`, `still not built`).
3. **Convention conformance** — each new doc carries the FEATURE.md §8 section set including `## Open decisions`; soft-delete/UUID/`@@map` snake-case-plural/timestamp conventions from FEATURE.md §2 are honoured in every proposed model.
4. **No code touched** — `git status` shows only `.md` files changed.

Implementation of any of the four is a separate, later round.

---

## Suggested order

1. **Doc C** (`GEODATA_HISTORY.md`) first — it supersedes the confirmation-reset rule that Docs A and B both build on, so writing it first means A and B reference the final rule rather than being rewritten.
2. **Doc A** (`TRAIL_ELEVATION.md`) — its profile-invalidation rule sits beside C's revision logic.
3. **Doc B** (FEATURE.md §4 edits) — district tagging, plus all of FEATURE.md §4's status-line and deferral-paragraph rewrites in one pass.
4. **Doc D** (`I18N.md`) — independent of the geodata three; can be written in any order.
5. The reconciling edits to FEATURE.md §1, `CLAUDE.md`, FEATURE.md §7, FEATURE.md §9 last, once the three new docs exist to link to.

## What this plan deliberately does not do

- No changes to `apps/api/prisma/schema.prisma`, no migrations, no API/UI code. The prisma blocks in these docs are specifications, per CLAUDE.md's rule that a not-yet-built phase's model additions are not applied retroactively.
- No decision on which second language ships. Removing the *technical* blocker is this round's goal; the translation-labour question stays open on purpose.
- No test plan — there is no test infrastructure in this repo to extend.
