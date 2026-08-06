# UI_DESIGN_REFRESH_PLAN.md — phased implementation of the cherry-picked design ideas

**Depends on**: SUMMARY.md §8 (the locked decision to cherry-pick structural/content ideas from an external design brief while keeping the existing pine-green/terracotta palette and dark mode unchanged) and the codebase survey behind it. Read that section first — it has the "why" and the full list of what's already built vs. genuinely missing; this doc is only the "in what order, and what exactly."

**Defers**: any palette, typography, or dark-mode change (explicitly rejected in SUMMARY.md §8, not re-opened here); any `apps/admin` UI work (map-as-hero and badges are public-site concepts — admin stays read + moderate per CLAUDE.md's existing admin-scope decision, revisit only if a phase below finds an admin-side gap).

**Numbering note**: this continues the phase sequence from CLAUDE.md/SUMMARY.md (Milestone 1: Phases 1–18, Milestone 2 folded in, Milestone 3: Phases 19–25). Phases 26–29 are **built** — this closes out the UI design-refresh round; no phase here is claimed done until its own commit lands and this doc is updated to say so, following the repo's own rule that a phase is only "built" once the code is in.

---

## Phase 26 — Empty-state & copy pass (built)

**Scope**: audit every use of `apps/public/src/components/EmptyState.tsx` across routes; rewrite copy from generic ("No data", "Nothing here") to the exploration-voiced tone from the brief ("No one has explored this route yet. Be the first explorer."). Copy-only — no component API change unless the audit finds a prop genuinely missing (e.g. no way to pass a custom CTA today).

**Why first**: smallest possible change, zero layout risk, immediately touches user-facing polish, and forces a full inventory of `EmptyState` call sites that later phases (badges, map layout) will also need to know about.

**Tasks**:
1. Grep all `<EmptyState` usages in `apps/public/src/routes/**`.
2. For each, decide the in-voice copy (adventure pages with no revisions, trip reports with none logged, trails with no confirmations, search with no results, etc.).
3. Update copy in place; add a `ctaLabel`/`onCta` prop to `EmptyState` only if an existing call site needs a "Be the first" action button it doesn't already have.

**Explicitly deferred**: any visual restyle of `EmptyState` itself (icon, illustration) — copy only this phase.

**Open decisions before starting**: none — self-contained.

**Outcome**: audited all 13 `<EmptyState>` call sites across 7 route files (`routes/index.tsx` ×2, `adventures/$slug/groups/index.tsx`, `adventures/$slug/index.tsx` ×4, `guides/index.tsx`, `me/activity-tracks/index.tsx`, `review-queue/index.tsx` ×2, `reports/index.tsx` ×2). Rewrote 6 keys to the exploration voice (`discover.noAdventurePages`, `discover.noResultsFor`, `adventurePage.stories.noneShared`, `adventurePage.gallery.noPhotosYet`, `adventurePage.trailsAndSpots.noneYet`, `account.activityTracks.noneYet`); `groups.noneYet` was already in-voice and left as-is. Left `adventurePage.seeAlso.noneYet` (curatorial, not exploration content) and the four review-queue/report-queue strings (internal moderation utility, not public content) on neutral functional copy — the brief's voice doesn't fit those contexts. No call site needed a CTA `EmptyState` doesn't already have — every one with an actionable next step (add trail/spot, upload track, add photo, add related page, start a group) already renders its own button beside the empty state — so `EmptyState`'s API is unchanged.

---

## Phase 27 — Wiki-page anatomy audit (built)

**Scope**: check whether adventure pages already surface a structured Quick-Facts-style block (difficulty, best season, permits, water sources, camping, hazards) versus burying it in free-form revision prose. IDEA.md's original "infobox" concept implies structure; confirm what actually renders today on `apps/public/src/routes/adventures/$slug/index.tsx` before deciding whether this is a real gap or already satisfied by existing `AdventurePage`/`TrailRevision` fields.

**Why second**: an audit, not a build — cheap to do, and its outcome determines whether Phase 27 becomes a real schema/UI change or closes as "already fine." Doing it before the badge and map work means those later phases build on an accurate picture of the page anatomy instead of assumptions.

**Tasks**:
1. Read the current adventure-page route render tree and the `AdventurePage`/`PageRevision` schema fields feeding it.
2. Compare against IDEA.md's infobox list (region, difficulty, duration, best season, max altitude) plus the brief's fuller list (permits, water sources, camping, hazards).
3. Produce a short finding: either "already structured, no work needed" or a concrete list of fields that exist in schema but aren't surfaced as a distinct block, or don't exist in schema at all.
4. Only if the finding shows a real gap: propose the minimal UI change (a structured block reading existing fields) — a new schema field is out of scope for this phase; flag it as a follow-up phase instead of scope-creeping into a migration mid-audit.

**Explicitly deferred**: any new Prisma column — this phase reads what exists, it doesn't add fields. If the audit finds a genuine missing field (e.g. no `hazards` anywhere), that becomes a new phase, not an inline addition here.

**Open decisions before starting**: none — audit first, decide after.

**Outcome: already structured, no work needed.** `apps/public/src/routes/adventures/$slug/index.tsx` renders a Quick-Facts `Card` grid (`InfoItem` components, not prose) directly under the header, reading `AdventurePage.durationMinDays`/`durationMaxDays`, `maxAltitudeMeters`, `districts` (region), and `seasons` (best season) — plus `activityType` and `difficultyLevel` as badges just above it. That's IDEA.md's full original infobox list, already a distinct structured block, not buried in revision prose.

The brief's fuller list — permits, water sources, camping, hazards — is also already structured, just at a different granularity than a page-level infobox line: they're `Spot`s with a `SpotType` (`seed-master-data.ts`: Campsite, Water Source, Danger Zone, Checkpoint/Permit Office), geolocated on `LazyAdventureMap` and listed with a `spotTypeName` badge in `TrailsAndSpotsSection`. This is arguably better than a flat infobox fact — "water source at km 3" carries location, a page-level "Water: yes" line wouldn't — so no change is proposed to duplicate it as an infobox field.

One adjacent thing surfaced but explicitly **not** in scope for this audit's comparison list: restricted-area legal permit status (e.g. Manaslu requiring a licensed agency) exists only as free-form prose in page content/summary today, not as a structured flag anywhere — `District` has no `isRestricted` column, and licensing is modeled entirely on the guide side (`GuideProfile.licenseNumber`, `PENDING_LICENSE_REVIEW`), a deliberate separate axis per CLAUDE.md. This is a genuine gap against the *legal-constraint* concept from IDEA.md, but it's a different concept than the trail-side "permits/water/camping/hazards" facts this phase's scope named — flagging it here rather than scope-creeping into it, in case a future phase wants to pick it up.

## Phase 28 — Trail/spot trait badges (built)

**Scope**: define and surface a small set of trail/spot trait badges (candidates from the brief: Verified, Hidden Gem, Family Friendly, Pet Friendly, Expert Only) on trail/spot cards, reusing the existing `Badge`/`StatusBadge` components (`apps/public/src/components/`).

**Why third**: depends on Phase 27's finding (a badge like "Expert Only" may overlap with an existing `difficulty` field surfaced there — don't duplicate it as a separate badge if Phase 27 already put it in the infobox). Needs its own data-source decision before any UI work, unlike Phases 26/28 which are presentation-only.

**Tasks**:
1. **Decide the vocabulary and its source** (the actual open decision from SUMMARY.md §8): which traits ship in v1, and for each — is it derived from existing data (`Verified` ← `verificationStatus`; `Expert Only` ← existing `difficulty` enum, pending Phase 27) or does it need a new manually-set field (`Hidden Gem`, `Family Friendly`, `Pet Friendly` have no obvious existing source and would need either a new schema column or a tag-reuse convention on the existing tag system).
2. If new schema is needed: a minimal migration (likely a nullable array/enum on `Trail`/`Spot`, following the repo's existing enum conventions) — kept separate from the tag-reuse option so the decision is explicit, not defaulted into.
3. Build the badge-rendering UI on trail/spot cards using existing `Badge` styling (no new visual component).
4. No moderation/approval wiring for manually-set badges in v1 — if a trait needs peer/moderator gating later, that's a follow-up phase, not built here.

**Explicitly deferred**: any admin UI to manage badge assignment beyond what the existing edit/approval flow already covers; badge-based filtering/search (a plausible follow-on, not in scope here).

**Open decisions before starting**: the vocabulary-and-source decision in task 1 above must be resolved (with the user) before writing code — this phase should not proceed straight from plan to implementation without that checkpoint.

**Outcome**: vocabulary-and-source decision resolved with the user: all five candidate traits ship (Verified, Expert Only, Hidden Gem, Family Friendly, Pet Friendly), and traits without a direct Trail/Spot data source reuse the existing tag system — but a codebase check during implementation found `Tag`/`AdventurePageTag` only relate to `AdventurePage`, not `Trail`/`Spot`, and there's no `Trail.difficulty` field either (difficulty is page-level). Rather than add new schema/UI (which would contradict this phase's presentation-only framing), a second user checkpoint confirmed deriving these traits from the *parent* `AdventurePage` already loaded on the adventure-detail route: **Expert Only** from `AdventurePage.difficultyLevel.slug` (`strenuous`/`extreme`), **Hidden Gem**/**Family Friendly**/**Pet Friendly** from `AdventurePage.tags` matched by slug. **Verified** needed no new work — `StatusBadge` already renders each trail/spot's own `verificationStatus` on its card. Badges render via a new `TraitBadges` component in `apps/public/src/routes/adventures/$slug/index.tsx`, added to both the trail and spot card lists in `TrailsAndSpotsSection`; two new tags (`Hidden Gem`, `Pet-Friendly`) were added to `apps/api/prisma/scripts/seed-master-data.ts`'s tag seed list (`Family-Friendly` already existed). Verified in-browser against real data (`manaslu-circuit-trek`, `Strenuous` difficulty → Expert Only badge renders on both its trail and spot). No admin UI or new schema, per scope.

---

## Phase 29 — Map-as-hero layout (built)

**Scope**: rework the adventure-page layout (and any other route where a map currently sits stacked in a single-column flow, e.g. trail/spot detail views) so the map is a persistent element — desktop: sidebar/content-panel + map split, map never scrolls out of view; mobile: bottom-sheet pattern over a full-bleed map. Built on `LazyAdventureMap`/`AdventureMap` (`apps/public/src/components/`), no new mapping library — still Leaflet, per CLAUDE.md's locked decision.

**Why last**: the largest structural change, touching real route layouts rather than a component or a data field, and benefits from Phases 26–28 already being in place (badges need a card layout to sit in; empty states need to be right whether they're in a sidebar or a full-width list) so the map rework isn't done twice.

**Tasks**:
1. Prototype the desktop split-pane (sidebar/content + persistent map) and mobile bottom-sheet on the single highest-traffic route first (adventure page detail), not all routes at once.
2. Decide sidebar content per route: adventure page → infobox (post-Phase 27) + trail list; trail/spot detail → stats + elevation profile.
3. Apply the same pattern to remaining routes with a stacked map only after the first route is validated (visually, and by running the dev server per CLAUDE.md's "test in a browser before reporting done" rule).
4. Preserve existing map behaviors (draw mode, diff view on `GeodataDiffMap`) — this phase changes layout/chrome around the map, not map interaction logic.

**Explicitly deferred**: any change to `apps/admin`'s map usage; any new map interaction feature (clustering, filters-on-map) — layout only.

**Open decisions before starting**: which routes beyond the adventure-page detail view get the treatment in v1 vs. later — pick after Phase 29's first prototype is reviewed, not upfront.

**Outcome**: two design calls were confirmed with the user before implementation — desktop gets a *bounded* hero split section (quick-facts + trail/spot list left panel, map filling the same height on the right), not a page-wide sticky map, so gallery/revision content/trip reports/action bar/story form stay an unchanged single-column flow below it; mobile gets a tap-to-toggle two-state sheet (peek/expanded) over the map rather than a hand-rolled draggable multi-snap-point sheet, since no drag/gesture library exists in this codebase.

Implementation: a single Leaflet map instance is shared across both breakpoints via CSS Grid + `order-*` utilities (`apps/public/src/components/MapHeroLayout.tsx`, new) rather than mounting two parallel maps — `grid-cols-1 lg:grid-cols-[18rem_1fr] lg:h-[32rem]`, sidebar `order-2 lg:order-1`, map `order-1 lg:order-2`. This needed `AdventureMap.tsx`/`LazyAdventureMap.tsx` to accept `height: number | 'full'` (so the map fills its grid cell instead of a hardcoded px value) and a `window` `resize`-triggered `invalidateSize()` alongside the existing fullscreen-toggle one, so the Leaflet canvas redraws correctly when the grid reflows across the `lg:` breakpoint. The standalone Quick-Facts card was folded into the new sidebar (its quick-facts gate was decoupled from trail/spot presence — those are page-level facts, unrelated to whether any trails/spots exist — so they now always render; only the trail/spot list itself falls back to `EmptyState`), and the whole section moved from after the photo gallery to immediately after the title/tags/pending-banner, ahead of the gallery — the actual "hero" positioning. Verified in-browser at both viewport ranges against `manaslu-circuit-trek` real data: desktop split-pane, mobile peek/expand toggle, and the pre-existing fullscreen toggle all confirmed working; the `EmptyState` no-trail/spot path was verified by code review only (no seeded page currently has zero trails/spots to test live). No admin change, no new mapping/gesture library, per scope.

---

## Cross-phase open decisions (not locked)

- Build order above is a recommendation (smallest/lowest-risk first), not a hard requirement — re-sequence if a phase turns out to block on another unexpectedly.
- Whether any of this needs its own design-process record (like REMAINING_WORK_PLAN.md) once phases start landing, or whether updating SUMMARY.md §8 phase-by-phase is enough — default to the latter unless a phase's scope grows enough to need its own doc.
