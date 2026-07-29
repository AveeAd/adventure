# Roadmap — phased build plan

Companion to [IDEA.md](IDEA.md). This covers *how* we build, iteratively, starting from pure infrastructure before any adventure-specific content. Content-pillar prioritization (Discover vs. Contribute vs. Share first) was resolved in Phase 10 — **Discover → Contribute → Share → Connect**, reasoning in PUBLIC_PAGES.md. Phases 1–12 below are built; see "Deferred" at the bottom for what's genuinely still not done.

## Ground rules

- Solo side project — phases are sized to be shippable in evenings/weekends, not months.
- Each phase should end in something runnable locally, even if there's nothing to look at yet (e.g. "auth works via curl/Postman" counts as done).
- No deployment yet — everything targets local dev only until that's revisited.

## Stack (locked for Phase 1)

- **Backend**: Node.js + TypeScript, NestJS — modules/guards/decorators give you the RBAC and CRUD structure you'll want later without hand-rolling it.
- **Database**: PostgreSQL + PostGIS — PostGIS enabled from day one even though nothing uses geometry columns yet, so the later map/geodata phase doesn't need a migration to add it.
- **ORM**: Prisma, for CRUD velocity and migration ergonomics. PostGIS geometry columns aren't natively typed in Prisma — when the map phase arrives, those specific columns can use `Unsupported("geometry")` + raw SQL. Not a blocker now since master data has no spatial columns.
- **Admin frontend**: separate small React app (not server-rendered) using a headless admin framework (e.g. Refine or React-Admin) — least hand-written UI code for CRUD screens.
- **Local infra**: full container dev via docker-compose — `db`, `api`, and `admin` all run in containers, code hot-reloaded via volume mounts. Nothing needs installing on the host except Docker.

## Phase 1 — Repo & architecture skeleton

- Repo scaffold: `apps/api` (NestJS) + `apps/admin` (React admin), or two separate repos if you'd rather keep them decoupled — pick one now, don't revisit later without reason.
- docker-compose for `db` (Postgres+PostGIS), `api`, and `admin`; shared root `Dockerfile.dev`; `.env` convention; config module in Nest.
- Prisma set up, connected, one trivial migration to prove the pipeline (e.g. a `HealthCheck` or throwaway table).
- Base conventions: module folder structure, global error filter, request logging, a `/health` endpoint.
- **Done when**: `docker compose up` brings up `db` + `api` + `admin` together — API reachable at `localhost:3000/health`, admin dev server reachable at `localhost:5173`, one migration applied — with nothing installed on the host except Docker.

## Phase 2 — Authentication

- `User` model (email, hashed password, timestamps).
- Signup / login endpoints, password hashing (argon2 or bcrypt), JWT access token (+ refresh token if you want sessions to survive restarts — otherwise defer).
- No email verification / password reset yet — nice-to-haves, not blockers for a solo dev testing locally.
- **Done when**: you can signup, login, and hit a protected route with a bearer token via curl/Postman.

## Phase 3 — Authorization (RBAC)

- Minimal role set to start: `admin` and `user`. (The richer contributor/verified/moderator tiers from IDEA.md's trust model belong to a later content-related phase — no need to build them before there's content to gate.)
- Nest guards + decorators for role-gating routes.
- Seed one admin user via a script/seed, not through the public signup flow.
- **Done when**: a `user`-role token gets 403'd on an admin-only route; an `admin`-role token doesn't.

## Phase 4 — Admin dashboard shell

- React admin app, login screen wired to Phase 2/3 auth, stores token, attaches it to API calls.
- Bare layout/nav shell — no real screens yet beyond "logged in as X".
- **Done when**: you can log into the admin app with the seeded admin user and see an empty authenticated shell.

## Phase 5 — Master data CRUD

- Define the actual master data tables — the lookup/reference data everything else will point to later: activity types (trekking, biking, paragliding, ...), difficulty levels, seasons, tags, and a `Country → Province → District → Municipality` location hierarchy (real Nepal administrative geography, not a flat "region" list — see DATABASE.md). Exact list can grow later; start with what's obviously needed from IDEA.md's pillars.
- Generic CRUD pattern on the API side (one reusable module/resolver shape, not hand-copied per table) since more master-data tables will get added over time; the location hierarchy reuses the same pattern per level even though it isn't flat.
- Corresponding admin dashboard screens (list/create/edit/delete) per master data type, using the admin framework's CRUD scaffolding — the location hierarchy's create/edit forms need cascading selects (country → province → district → municipality), unlike the flat types.
- **Done when**: you can create/edit/delete an activity type from the admin dashboard, and create a country/province/district/municipality chain, seeing both persisted in Postgres.

## Phase 6 — Adventure pages (wiki/article layer)

- Schema and design fully specified in [ADVENTURE_PAGES.md](ADVENTURE_PAGES.md): `AdventurePage` + versioned `PageRevision` history (Markdown content, full snapshots per edit, never diffs), many-to-many `District`/`Season` tagging, a `Media` table for photos, `AdventurePageLike` for casual appreciation (never reset on edit, unlike confirmations), and the unverified → verified trust model (`PageConfirmation` + a safety-critical edit flag) called for in IDEA.md.
- Not generic CRUD like Phase 5 — creating/editing a page is a compound operation (page + revision together, in a transaction); see ADVENTURE_PAGES.md's service-layer notes before implementing this as a plain REST CRUD module.
- Contributors and diffs are computed from `PageRevision` at read/render time, not stored separately.
- **Done when**: you can create a page (which creates its first revision), edit it (creating a second revision without touching the first), see both revisions' content and a diff between them, and confirm the page toward `VERIFIED`.

## Phase 7 — Map / geodata layer

- Schema and design fully specified in [MAP_GEODATA.md](MAP_GEODATA.md): `Trail` (LineString) and `Spot` (Point) geometry, both exclusive to one `AdventurePage`; a `SpotType` master-data lookup; the same unverified/verified/needs-review trust model as adventure pages, but confirmation-reset is a service-layer rule instead of revision-scoping (no geometry revision history — a deliberate simplification, see MAP_GEODATA.md for the tradeoff).
- PostGIS `geometry` columns need `Unsupported(...)` in Prisma plus hand-added GiST indexes and raw-SQL spatial queries — this is exactly what PostGIS-on-day-one in Phase 1 was preparing for.
- **Done when**: you can create a trail/spot attached to a page, see it persisted with a working spatial index, edit its geometry and confirm `verificationStatus` resets, and run a bounding-box query via raw SQL.

## Phase 8 — Trip reports (social layer)

- Schema and design fully specified in [TRIP_REPORTS.md](TRIP_REPORTS.md): `TripReport` (real dates, real costs, tied to one `AdventurePage` and one author), `TripReportMedia`, `TripReportKudos`, flat `Comment`s.
- Deliberately **no** verification/trust tier here, unlike every other content table — kudos/comments are the only signal, since a trip report is a personal account, not a fact-checked claim. See TRIP_REPORTS.md for why this is a considered asymmetry, not a gap.
- **Done when**: you can log a trip report against a page with a real completed date and cost, attach photos, kudos someone else's report, and comment on it.

## Phase 9 — Guide directory

- Schema and design fully specified in [GUIDES.md](GUIDES.md): `GuideProfile` as a 1:1 extension of `User` (certifications, languages, specialties, regions, informational rate range), with its own `GuideVerificationStatus` enum — manual-review-only, never peer-confirmed, since this is credential verification, not content trust.
- Implements IDEA.md's restricted-region legal requirement via a new `District.requiresRegisteredAgency` flag (Annapurna/Manaslu/Upper Mustang) — a guide covering a restricted district can only reach `VERIFIED` through `PENDING_LICENSE_REVIEW`.
- **Done when**: a user can create a guide profile with specialties/regions/languages, and a restricted-region guide's profile is blocked from auto-verifying without going through manual review.

## Phase 10 — Public site

- Schema and design fully specified in [PUBLIC_PAGES.md](PUBLIC_PAGES.md): a third app, `apps/public`, on TanStack Start (SSR/streaming, file-based routing) — chosen over Next.js for the same SEO reason, with the accepted tradeoff of a smaller ecosystem. Full page inventory (Discover, adventure page view/edit/history, trip report permalinks, guide directory, public contributor profiles) in that doc.
- **Resolves two things left open elsewhere**: ARCHITECTURE.md §11's "public read access" open decision (content/master-data GETs are now `@Public()`), and ROADMAP.md's long-deferred pillar-priority question — **Discover → Contribute → Share → Connect**, reasoning in PUBLIC_PAGES.md.
- **Requires an auth-flow change already applied to ARCHITECTURE.md §4**: two frontends (`admin`, `public`) can now trigger Google login, so the single `ADMIN_APP_URL` redirect target became a validated `redirectUrl` + `ALLOWED_REDIRECT_URLS` allowlist.
- **Done when**: an anonymous visitor can browse Discover and read an adventure page with no login; a logged-in user (via either the admin or public app) lands back on whichever app they started from after Google sign-in.

## Phase 10.5 — Public site visual identity (done)

Phase 10 shipped functional but unstyled (plain inline `style={{}}`, no design system). This pass gave `apps/public` an actual visual identity: Tailwind CSS v4, an earthy pine-green/terracotta palette on warm stone neutrals, Inter typography, dark mode via `prefers-color-scheme`, and a reusable component library (`apps/public/src/components/`) — applied across every Phase 10 page. `apps/admin` got the same palette applied via Ant Design's `ConfigProvider` theme tokens (a reskin, not a rewrite — the Refine/AntD stack didn't change), plus a branded title and redesigned Login/Dashboard.

## Phase 10.6 — Admin beyond master data (done)

The "admin dashboard beyond Phase 5's master-data CRUD" item below is done: admin now manages Users (role/active, self-demotion guarded), Adventure Pages (verification-status moderation), Trip Reports (view/delete), Guide Profiles (the license verification review queue GUIDES.md called for), and — after Phase 11 — Trails/Spots and Trip Groups. All at **read + moderate** depth; full content authoring stays in the public contribute flow so compound-write logic (revisions, confirmations, transactions) lives in one place. The sidebar is grouped (Master Data / Locations / Content / Trails & Spots) instead of one flat list.

## Phase 11 — Map/geodata UI (done)

MAP_GEODATA.md (Phase 7) shipped a full `Trail`/`Spot` backend in the original build order, but nothing consumed it — no map rendered anywhere. This phase closed that gap: Leaflet + OpenStreetMap rendering on the adventure page view and Discover (bbox pins) in `apps/public`, a draw-a-trail/spot contribute flow (click-to-place/click-to-draw), a "confirm accurate" action wired to the existing peer-confirmation endpoints, and a new Trails & Spots area in `apps/admin` (list/show + verification-status override, mirroring the pattern already used for Adventure Pages/Guide Profiles). See MAP_GEODATA.md's updated status note.

## Phase 12 — Trip-companion groups (done)

The one core IDEA.md pillar with no design doc through Phase 10 — now designed and built. See [TRIP_GROUPS.md](TRIP_GROUPS.md) for the schema, API, and UI. Deliberately no messaging model, consistent with IDEA.md's informational-only contact stance.

## Deferred — still not built

- **Content enhancement grab-bag**: tags/free-form labels beyond `ActivityType`, "see also"/related-page links, threaded comment replies, multi-currency trip costs, a stricter `rateUnit` enum — all flagged as discussion points across ADVENTURE_PAGES.md/MAP_GEODATA.md/TRIP_REPORTS.md/GUIDES.md, not yet designed or built.
- **Platform/infra**: full-text search implementation, in-app notifications, UI-language i18n. i18n specifically needs a scoping decision (target languages, machine vs. human translation) before any library gets wired in.
- Elevation-along-path profiles, spatially-derived district tagging, full OSM-style changeset history for geodata — flagged in MAP_GEODATA.md, still undesigned.
- Hosting/deployment target — still local-only per your call; revisit once there's something worth showing someone else.
