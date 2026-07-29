# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is right now

This is a **working monorepo**, not just design docs — `apps/api` (NestJS), `apps/admin` (React + Vite + Refine + Ant Design), and `apps/public` (TanStack Start) are all implemented and run together via `docker-compose up`. Phases 1–10 from ROADMAP.md are built, the public site has a real Tailwind-based visual identity (not just unstyled functional pages), the admin dashboard has grown well beyond Phase 5's master-data CRUD (content moderation, user management, geodata moderation), and trip-companion groups — the one pillar with no design doc through Phase 10 — is now designed and built too (see TRIP_GROUPS.md). The live `apps/api/prisma/schema.prisma` is the actual source of truth for the schema; there's no separate ER diagram artifact to keep in sync with it.

The markdown docs remain the source of truth for *why* things are shaped the way they are — read them before touching code that contradicts a documented decision. When asked to "implement" or "start building" something new, treat the docs as the spec and extend them (per the conventions below) rather than inventing structure that contradicts what's already decided.

## Reading order / doc map

Read in this order to understand the project; each doc explicitly says what it depends on and what it defers:

1. **IDEA.md** — product vision. A non-commercial "OpenStreetMap + Wikipedia + Strava, for adventure in Nepal": map layer, wiki-style article layer, Strava-style activity/social layer, unified under one contributor account. Defines the trust model (unverified → verified via peer confirmation) and the real legal constraint that restricted-region trekking (Annapurna, Manaslu, Upper Mustang) requires a licensed agency.
2. **ROADMAP.md** — the phased build plan (Phase 1 through 10, now all built), locked stack choices, and what's still deferred.
3. **ARCHITECTURE.md** — Phases 1–5 foundation: repo layout, docker-compose full-container dev, NestJS module map, Google-only OAuth design, RBAC, generic CRUD pattern, admin app.
4. **DATABASE.md** — Phase 1–5 Prisma schema (auth + master data) and conventions that apply to *every* table added later (soft delete, UUIDs, `@@map` naming, etc.).
5. **ADVENTURE_PAGES.md** (Phase 6), **MAP_GEODATA.md** (Phase 7, now with a public+admin UI consuming it), **TRIP_REPORTS.md** (Phase 8), **GUIDES.md** (Phase 9), **TRIP_GROUPS.md** (Phase 12) — each is a self-contained schema/design addendum for one content layer, all building on DATABASE.md's conventions.
6. **PUBLIC_PAGES.md** (Phase 10) — the public TanStack Start site; resolves two things left open in ARCHITECTURE.md (public read access, multi-frontend OAuth redirect). Page inventory now includes the geodata contribute flow and trip-groups pages added after Phase 10 shipped.

Still deferred, per ROADMAP.md's Deferred section: tags/related-page links/threaded comment replies/multi-currency trip costs/a stricter `rateUnit` enum (content grab-bag), full-text search, notifications, UI i18n, and hosting/deployment.

## Locked architecture decisions (don't relitigate without reason)

- **Three apps, one repo, npm workspaces** (no Nx/Turborepo): `apps/api` (NestJS), `apps/admin` (React + Vite + Refine + Ant Design), `apps/public` (TanStack Start, SSR/file-based routing, chosen over Next.js for SEO with the explicit tradeoff of a smaller ecosystem).
- **Full container dev**: everything — db, api, admin, public — runs via `docker-compose`, all three app services sharing one root `Dockerfile.dev`; nothing needs installing on the host except Docker. Code is bind-mounted with anonymous volumes over each `node_modules` so host installs don't clobber container-native deps.
- **Postgres + PostGIS from day one**, even before any geometry columns exist, specifically so Phase 7 (map layer) needs no extension migration. PostGIS `geometry` columns are `Unsupported(...)` in Prisma — hand-add GiST indexes to migrations, use `$queryRaw`/`$executeRaw` for spatial queries.
- **Prisma** ORM, UUIDv4 string IDs everywhere, `createdAt`/`updatedAt` on every table, models `@@map`'d to snake_case plural table names (columns stay camelCase, unmapped).
- **Soft delete convention**: any table the generic CRUD "delete" route can touch has `isActive Boolean @default(true)`; delete = `isActive = false`, never a SQL `DELETE`. Hierarchical/lookup FKs use `onDelete: Restrict`; content owned exclusively by a parent row uses `onDelete: Cascade` (e.g. `Profile`→`User`, `PageRevision`→`AdventurePage`).
- **Auth is Google OAuth only** — no local email/password, no password hashing. Access JWT (15 min) + refresh token (opaque, hashed in DB, httpOnly cookie, 7 day). Admin bootstrap is an `ADMIN_EMAILS` allowlist checked only on first-login user creation, never on update. Two frontends (`admin`, `public`) can each trigger login, so redirect targets go through a validated `redirectUrl` + `ALLOWED_REDIRECT_URLS` allowlist (open-redirect prevention), round-tripped via the OAuth `state` param.
- **RBAC is minimal**: `Role` enum is just `ADMIN`/`USER`. The richer unverified/verified/moderator *content* trust tiers from IDEA.md are a separate axis modeled per content type (`PageVerificationStatus`, `GeoVerificationStatus`, `GuideVerificationStatus`), not folded into `Role`.
- **Generic CRUD factory** (`common/crud/base-crud.service.ts` + `.controller.ts`) parameterized over a Prisma delegate — used by all master-data tables (flat and hierarchical). Content tables (adventure pages, trails/spots, trip reports) are explicitly **not** generic CRUD — they're compound/transactional operations (e.g. creating a page always creates its first revision in the same transaction).
- **Content trust model varies deliberately by type** — this is a recurring, intentional asymmetry, not inconsistency:
  - Adventure pages: full revision history (`PageRevision`, full-content snapshots, never diffs), confirmations scoped to a specific revision so stale trust can't ride along after an edit.
  - Trails/spots: no revision history (simplification) — edits reset `verificationStatus` and delete confirmations as a *service-layer* rule, not a schema one, since there's no revision to scope to.
  - Trip reports: **no verification tier at all** — a trip report is a personal account, not a factual claim; kudos/comments are the only signal.
  - Guide profiles: verification is **manual-review-only**, never peer-confirmed — credential trust, not content trust. Restricted-district guides must pass through `PENDING_LICENSE_REVIEW`.
- **Location hierarchy is real Nepal admin geography** (`Country → Province → District → Municipality`, ~838 rows), not a flat "region" list — populated via a one-off import script, not the no-seed-script convention that applies elsewhere.
- **`apps/public` styling is Tailwind CSS v4** + a small reusable component library (`apps/public/src/components/`) — an earthy pine-green/terracotta palette on warm stone neutrals, dark mode via `prefers-color-scheme` (no manual toggle). `apps/admin` gets the same palette via Ant Design's `ConfigProvider` theme tokens rather than a Tailwind rewrite — the Refine/AntD stack stays, only reskinned.
- **Map rendering is Leaflet + OpenStreetMap tiles** (free, no API key — matches IDEA.md's non-commercial framing), in both `apps/public` and `apps/admin`. Leaflet isn't SSR-safe, so in `apps/public` it's lazy-loaded behind TanStack Router's `ClientOnly` (see `LazyAdventureMap`/`LazyDrawMap`) — never imported at module scope in a file that renders during SSR.
- **Admin resources beyond master data are read + moderate, not full authoring** — Adventure Pages, Trip Reports, Trip Groups, Trails/Spots, Guide Profiles all get admin list/show + verification-status/delete actions, but creating/editing the actual content stays in the public contribute flow. This keeps compound-write logic (revisions, confirmations, transactions) in one place instead of duplicating it in admin.

## Conventions to carry forward when adding new design docs or schema

- Every new doc should state what it depends on and what it explicitly defers, the way the existing docs cross-reference each other.
- Schema additions for a not-yet-built phase list "required additions to existing models" (reverse-relation fields) separately, and note they're intentionally *not* retroactively applied until that phase is actually implemented — keeps DATABASE.md's "Phase 1–5" scope honest.
- Prefer one duplicated-but-simple table over a shared/polymorphic one when Prisma can't express the polymorphism cleanly (e.g. `Media` vs. `TripReportMedia`, or three separate `*Confirmation` tables instead of one generic one).
- Flag open decisions explicitly (a numbered "Open decisions" section) rather than silently picking an answer when something is genuinely undecided.
