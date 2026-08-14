# SEO_PLAN.md

Design/implementation plan for SEO on `apps/public` (TanStack Start, SSR, file-based routing — chosen originally over Next.js "for SEO", per `CLAUDE.md`'s locked decisions, but that promise was never actually cashed in: today the app ships `charSet`/`viewport`/`title` only). This plan covers per-route metadata (title/description/canonical), Open Graph + Twitter Card tags, JSON-LD structured data, `robots.txt`, a generated `sitemap.xml`, proper 404/500 handling, and `noindex` coverage for private/action routes. `apps/admin` is explicitly out of scope — it's an authenticated dashboard, never crawled or indexed.

This doc depends on: `CLAUDE.md`'s locked conventions (env-var wiring pattern for `VITE_API_URL`/`PUBLIC_DOMAIN`, i18n via `react-i18next`), and the current route tree/`head()` pattern already established across ~30 `apps/public/src/routes/**` files (`head: () => ({ meta: [{ title: ... }] })`, sometimes loader-dependent). It defers: `hreflang`/locale-alternate tags (the app is English-only per `I18N.md`'s scope — nothing to alternate between yet), per-entity generated OG images (composited social cards) — ship with a single static default image plus an entity's own photo/cover where one already exists in the data, never a new image-generation service, and AMP/web-vitals tooling (a performance concern, not a metadata one).

## Design choices

- **A single `apps/public/src/lib/seo.ts` helper**, not per-route boilerplate — one `buildMeta({ title, description, path, image, noindex })` function returning the `meta`/`links` arrays TanStack Start's `head()` expects, so every route composes the same tag set instead of hand-rolling OG/Twitter arrays 30 times. Existing title-only `head()` calls get rewritten to call it, not left alone — a mixed old/new pattern would be worse than the current consistent-but-thin one.
- **Canonical base URL is a new build-time `VITE_SITE_URL`**, mirroring the existing `VITE_API_URL` pattern exactly (Dockerfile.prod build arg → `docker-compose.prod.yml` build args for the `public` service only → `.env.production.example`), not a runtime env read — the same "baked in at build time" reasoning `docker-compose.prod.yml`'s existing comment gives for `VITE_API_URL`. Value is `https://${PUBLIC_DOMAIN}` in prod (same domain Caddy already terminates), `http://localhost:3001` in dev (matches `docker-compose.yml`'s public port mapping).
- **`robots.txt` is a static file in a new `apps/public/public/` dir**, not a generated server route — the disallow list (private/action routes) changes at the same slow rate as the route tree itself, so a static file reviewed in code review is simpler than a server route that has to stay in sync with it. `sitemap.xml`, by contrast, **is a server route** (`apps/public/src/routes/sitemap[.]xml.ts`, TanStack Start's `createServerFileRoute`) — its content (every adventure page/guide/club slug) is DB-driven and can't be static.
- **Sitemap only indexes public, crawlable, content-bearing pages** — home, `/guides`, `/clubs`, `/trip-groups`, `/reports`, every `adventures/$slug`, every listed guide (`guides/$id` where `isListed`), every non-deactivated club (`clubs/$clubId`). It excludes anything requiring auth (`/account/*`, `/me/*`), anything action-oriented (`*/new`, `*/edit`, `review-queue`), and per-user pages (`users/$id`) — a user profile isn't content the site wants ranked, matching the reasoning that keeps `isListed` scoping `/guides` itself.
- **`noindex, follow` (not a blanket `disallow`) on action/private routes**, set via the same `seo.ts` helper's `noindex` flag rather than `robots.txt` — `robots.txt` disallow prevents crawling entirely (so a search engine can't even see a `noindex` tag or drop a stale indexed URL), whereas a route like `login` or `adventures/$slug/edit` is fine to crawl-and-drop but shouldn't be *indexed*. Both mechanisms are used, deliberately for different routes: `robots.txt` disallows truly private trees (`/account/`, `/me/`) wholesale; `noindex` covers same-path action routes search engines might otherwise reach via an on-page link (e.g. an "Edit" button).
- **JSON-LD via a small `<StructuredData>` component**, not folded into `seo.ts`'s `head()`-returned arrays — TanStack Start's `head()` `meta`/`links` types don't model a raw `<script type="application/ld+json">` tag cleanly, so structured data renders as a normal component in the route body (a pattern to confirm during Phase 4; if `head()` turns out to support a `scripts` array with raw content in the installed `@tanstack/react-start` version, prefer that instead and drop this component).
- **404 and 500 get real HTTP status codes**, not just a friendly page at status 200 — TanStack Start's `notFoundComponent`/`errorComponent` on the root route, both tagged `noindex`, and confirmed via `curl -I` that the response line itself is `404`/`500` (a soft-404 that returns 200 is a known SEO foot-gun search engines flag explicitly).

## Phase 1 — Foundation: env var, static assets, `seo.ts`

- `.env.production.example`: add `VITE_SITE_URL=https://app.example.com` next to `VITE_API_URL`, with a comment cross-referencing `PUBLIC_DOMAIN` the same way `PUBLIC_API_URL`'s comment cross-references `VITE_API_URL`.
- `docker-compose.prod.yml`: add `VITE_SITE_URL: ${VITE_SITE_URL}` to the `public` service's build `args` (not `admin` — admin is never indexed).
- `apps/public/vite.config.ts` / dev: no change needed — Vite already exposes `.env` / shell env vars prefixed `VITE_` automatically; add a dev-only default (`http://localhost:3001`) as a fallback inside `seo.ts` itself rather than a new `.env` file, mirroring how `apps/public/src/lib/auth/api.ts:9` falls back to `http://localhost:3000` for `VITE_API_URL`.
- New `apps/public/public/` static dir (doesn't exist yet):
  - `favicon.ico` + `favicon.svg` + `apple-touch-icon.png` (need real artwork — placeholder/generated mark acceptable for now, flagged for design follow-up).
  - `robots.txt`: allow-all by default, explicit `Disallow` for `/account/`, `/me/`, `/login`, `/auth/`, `/review-queue`, and every `*/new`/`*/edit` path pattern the route tree has; `Sitemap: https://<site>/sitemap.xml` line.
- New `apps/public/src/lib/seo.ts`: `buildMeta({ title, description, path, image?, noindex? })` → `{ meta, links }`:
  - `meta`: `title`, `description`, `og:title`, `og:description`, `og:type` (`website` default, override per-call), `og:url` (`${VITE_SITE_URL}${path}`), `og:image` (falls back to a new static default `apps/public/public/og-default.png`), `og:site_name` (from `AppConfig.name`), `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`, and `robots: 'noindex, follow'` only when `noindex` is true.
  - `links`: `canonical` (`${VITE_SITE_URL}${path}`).

### Tasks
- [x] `VITE_SITE_URL` added to `.env.production.example` + `docker-compose.prod.yml` build args
- [x] `apps/public/public/` created with `favicon.ico`/`favicon.svg`/`apple-touch-icon.png`/`og-default.png`/`robots.txt`
- [x] `apps/public/src/lib/seo.ts` with `buildMeta()`

## Phase 2 — Root `head()`, favicon links, 404/500

File: `apps/public/src/routes/__root.tsx`.

- `head()` (lines 18–37 currently): call `buildMeta({ title: appConfig.name, description: appConfig.tagline, path: '/' })` for the default/fallback tags, keep `charSet`/`viewport` as-is, add `theme-color` meta.
- `links` array (lines 32–36, currently stylesheet-only): add `icon` (`/favicon.svg`, `/favicon.ico` fallback), `apple-touch-icon`.
- `createRootRoute` gains `notFoundComponent` and `errorComponent`:
  - `NotFound.tsx` / `ErrorPage.tsx` new components under `apps/public/src/components/` — on-brand 404/500 pages (using the existing Tailwind palette), each calling `buildMeta({ noindex: true, ... })` for their own `head()`, and each confirmed to actually set the response status code (404 / 500) rather than rendering at 200 — TanStack Start's mechanism for this needs a quick check against the installed `@tanstack/react-start` version (`setResponseStatus` or equivalent) during implementation.
- Homepage (`routes/index.tsx`) currently has **no `head()` at all** — add one explicitly even though it'd inherit the root's default, so it's not silently relying on fallback-by-absence.

### Tasks
- [x] `__root.tsx` `head()` uses `buildMeta()`, adds `theme-color`
- [x] Favicon/apple-touch-icon `links` added
- [x] `NotFoundComponent` + `errorComponent` wired (`notFoundComponent` on `createRootRoute`; `errorComponent` as the router's `defaultErrorComponent` in `router.tsx` instead — TanStack Router's root `notFoundComponent` cascades to unmatched child routes automatically, confirmed against the installed `@tanstack/react-router`'s `Match.js`, but `errorComponent` does not, so it has to be set router-wide to catch every route's errors, not just the root route's own). Confirmed real 404/500 status codes via `curl -I` (404 via an unmatched path, 500 via a forced API-down loader failure).
- [x] `routes/index.tsx` gets an explicit `head()`

## Phase 3 — Per-route metadata pass

Rewrite every existing `head: () => ({ meta: [{ title: ... }] })` call site (~30 routes) to call `buildMeta()` instead, adding a real `description` to each (currently none exist) and `noindex: true` on the private/action set identified in "Design choices" above:

- **Static/list routes** (title + description, indexable): `index.tsx`, `guides/index.tsx`, `clubs/index.tsx`, `trip-groups/index.tsx`, `reports/index.tsx`.
- **Static/action routes** (`noindex: true`): `login.tsx`, `auth/callback.tsx`, `account/index.tsx`, `account/guide-profile.tsx`, `clubs/new.tsx`, `adventures/new.tsx`, `review-queue/index.tsx`, `me/activity-tracks/*`.
- **Dynamic, indexable, loader-driven** (title/description/image pulled from the loaded entity, not hardcoded): `adventures/$slug/index.tsx` (page title/summary/cover image), `guides/$id.tsx` (guide name/bio/photo, only when `isListed` — otherwise `noindex`), `clubs/$clubId/index.tsx` (club name/description), `adventures/$slug/trips/$tripReportId.tsx` (report title/excerpt).
- **Dynamic, noindex** (edit/new/history/group-management variants, and any user-profile route): `adventures/$slug/edit.tsx`, `.../new.tsx` variants, `.../history/*`, `.../groups/*`, `.../spots/new.tsx`, `.../trails/new.tsx`, `clubs/$clubId/edit.tsx`, `clubs/$clubId/threads/new.tsx`, `clubs/$clubId/threads/$threadId/index.tsx` (thread content is user-generated/ephemeral, not a canonical content page — `noindex, follow` so links inside it still get crawled), `users/$id.tsx`.

### Tasks
- [x] All ~30 existing `head:` call sites migrated to `buildMeta()`
- [x] Descriptions written for every indexable static/dynamic route
- [x] `noindex: true` applied to the private/action/user-profile route set above (plus two corrections found during implementation: `/reports` is actually the auth-gated content-moderation queue, not a public trip-reports list, so it's noindex like `/review-queue`, not indexable as this doc originally assumed; and a `PRIVATE`-visibility club's `/clubs/$clubId` page is now noindexed too, extending the `isListed` reasoning already used for guides)

## Phase 4 — Structured data (JSON-LD)

- `apps/public/src/components/StructuredData.tsx`: takes a plain object, renders `<script type="application/ld+json">{JSON.stringify(data)}</script>` (confirm during implementation whether TanStack Start's `head()` can carry this instead — see "Design choices").
- `__root.tsx` or `index.tsx`: `WebSite` + `Organization` schema (site name, logo, description) — sitewide, rendered once.
- `adventures/$slug/index.tsx`: `TouristAttraction` (or `Article` if the page is more written-content than place-focused — decide per actual `AdventurePage` shape during implementation) schema with name/description/image/geo (if the page has associated trail/spot coordinates).
- `guides/$id.tsx`: `Person` schema (name, jobTitle, description) for listed guides only.

### Tasks
- [x] `head()`-native equivalent used instead of a `StructuredData.tsx` component — confirmed the installed `@tanstack/router-core` has a first-class `{ 'script:ld+json': object }` meta-entry type that serializes straight to an escaped `<script type="application/ld+json">` tag, so `buildMeta()` grew an optional `jsonLd` param rather than adding a body-rendered component
- [x] `WebSite`/`Organization` JSON-LD sitewide (in `__root.tsx`'s `head()`, present once per page since every route matches root)
- [x] `TouristAttraction` JSON-LD on adventure pages (went with `TouristAttraction` over `Article` — an `AdventurePageDetail` is fundamentally about a place/route, not a standalone written piece; includes `geo` when the page has a spot with coordinates)
- [x] `Person` JSON-LD on listed guide profiles

## Phase 5 — Sitemap

New `apps/public/src/routes/sitemap[.]xml.ts`, a TanStack Start server route (`createServerFileRoute`, GET-only, `Content-Type: application/xml`):

- Queries the API (reusing existing public list endpoints — adventure pages, `guides?isListed=true`, active clubs) server-side at request time, builds one `<url>` entry per indexable page (see Phase 3's indexable set) with `<loc>` (`${VITE_SITE_URL}${path}`) and `<lastmod>` (entity `updatedAt`).
- Static routes (`/`, `/guides`, `/clubs`, `/trip-groups`, `/reports`) get fixed low-churn `<lastmod>` or omit it.
- No caching layer for a first pass — if entity counts get large enough that per-request generation is slow, revisit with a cache (explicitly deferred, not designed here).

### Tasks
- [x] `sitemap[.]xml.ts` server route, confirmed reachable at `/sitemap.xml` with valid XML (parsed successfully with Python's `xml.etree`; the installed `@tanstack/react-start` doesn't have the `createServerFileRoute` API this doc assumed — server routes here are `server: { handlers: { GET: ... } }` on a normal `createFileRoute()`'s options instead, confirmed by reading `@tanstack/start-client-core`'s `serverRoute.d.ts` and `start-server-core`'s `createStartHandler.js`)
- [x] `robots.txt`'s `Sitemap:` line points at it (already added in Phase 1)

## Phase 6 — Technical/on-page cleanup

- Confirm no route produces two different canonical URLs for the same content (trailing slash, query-string variants) — `buildMeta()`'s canonical is always the router-resolved path, so this should fall out of Phase 3 rather than needing separate work, but verify during Phase 7.
- Check the list routes (`guides`, `clubs`, `reports`, `trip-groups`) for existing pagination; if any paginate via query param, either canonicalize to page 1 or add `noindex` to `page > 1` (concrete approach TBD once the actual pagination mechanism is confirmed — not assumed here).
- `<html lang>` is already dynamic from `resolveLocale()` (`__root.tsx:83`) — no change needed, just confirmed still correct once `seo.ts` lands.

### Tasks
- [x] Canonical-URL spot-check across a representative route sample — confirmed `buildMeta()`'s canonical is always the literal `path` a route passes in, never `window.location`'s query string, so `/guides?activityTypeId=x` and `/clubs?q=hike&sort=newest` both canonicalize back to their bare list path; a trailing-slash variant (`/adventures/$slug/`) 307-redirects to the canonical no-slash form via TanStack Router itself, so there's no second URL to canonicalize away. Also fixed `NotFound`/`ErrorPage`'s canonical, which had been hardcoded to `/` on the server (now reads the real request path via `@tanstack/react-start/server`'s `getRequestUrl()`) — not a duplicate-content risk since both are `noindex`, but a canonical tag claiming the homepage on a 404 was still wrong.
- [x] Pagination indexing behavior confirmed/handled on list routes — none of `guides`/`clubs`/`trip-groups` paginate via a `page` query param today (all use a fixed `pageSize` plus filter/search params only), so there's no `page > 1` case to canonicalize or `noindex` yet; revisit if real pagination is added later.

## Phase 7 — Verification

No existing SEO-specific test convention to extend (same gap other `*_PLAN.md` docs in this repo note for their own areas) — verify directly against the running `docker-compose` stack:

### Tasks
- [x] `typecheck` clean on `apps/public` after the full change
- [x] `curl -s localhost:3001/robots.txt` and `curl -s localhost:3001/sitemap.xml` return well-formed output; sitemap parsed successfully with Python's `xml.etree` (no internet access in this environment for an external XML sitemap validator, so structural well-formedness + schema namespace was checked directly instead)
- [x] `curl -I` on a real 404 path and a forced-error path return `404`/`500` status lines, not `200` (forced the 500 by stopping the `api` container so the homepage loader's fetch fails)
- [x] View-source (or `curl`) on a static route, a dynamic `adventures/$slug` route, and a `noindex` route (`login`) — confirmed title/description/OG/Twitter/canonical/robots tags all present and correct
- [x] JSON-LD on an adventure page and a guide profile validated — no internet access for Google's Rich Results Test, so validated by parsing the emitted `<script type="application/ld+json">` as JSON and checking each `@type`'s required properties (`WebSite`/`Organization`/`TouristAttraction`/`Person`) against schema.org's own documented requirements; all present
- [x] Lighthouse SEO audit run locally (`npx lighthouse --only-categories=seo --chrome-flags="--headless --no-sandbox"`) against `/`, `/adventures/manaslu-circuit-trek`, `/guides`, and `/login`: **100/100** on the first three; `/login` scores 66/100 with a single flagged audit, `is-crawlable` ("Page is blocked from indexing") — correct and expected, since `/login` is intentionally `noindex`. This run caught a real bug: root's `head()` and every route's own `head()` were both emitting a `<link rel="canonical">`, and TanStack Router doesn't dedupe `link` tags by `rel` the way it dedupes `meta` tags by name/property — every page was shipping two conflicting canonical tags. Fixed by dropping root's own canonical link in `__root.tsx`, since every route already supplies its own.
- [ ] Not done: production DNS/Caddy-level check that `VITE_SITE_URL` matches the real deployed domain (only checkable post-deploy, out of scope for local verification)
