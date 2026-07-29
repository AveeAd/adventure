# Public site — page inventory & information architecture

Design for the public-facing side of the platform — everything a visitor sees, as opposed to [ARCHITECTURE.md](ARCHITECTURE.md)'s admin dashboard. This is the first design pass to actually consume the schema built across DATABASE.md/ADVENTURE_PAGES.md/MAP_GEODATA.md/TRIP_REPORTS.md/GUIDES.md — until now, everything designed has been backend-only.

**Status**: built, and since redesigned with a real visual identity (Tailwind CSS, an earthy pine-green/terracotta palette, dark mode, a reusable component library at `apps/public/src/components/`) rather than the plain unstyled pages this doc originally described. The page inventory and routing structure below have grown since the original Phase 10 build to cover the geodata contribute flow (Phase 11), trip-companion groups (Phase 12, see TRIP_GROUPS.md), the content grab-bag (Phase 13 — tags, "see also," threaded replies, currency), and search/notifications (Phase 14, see SEARCH_AND_NOTIFICATIONS.md) — all reflected below.

## Stack: TanStack Start

Your call, and a reasonable one: TanStack Start (SSR/streaming, file-based routing via TanStack Router, React) rather than Next.js. It satisfies the same reason SSR mattered here — adventure pages, guide profiles, and trip reports are content this platform wants indexed and found via search, competing with AllTrails/Wikipedia on discoverability, so they can't be client-only. The honest tradeoff: TanStack Start is newer and has a smaller ecosystem/community than Next.js — fewer tutorials, less deployment tooling out of the box, a less battle-tested production track record. Worth knowing going in, not a reason to reconsider since you've already made the call.

This is a **third app** in the monorepo, alongside `apps/api` and `apps/admin` from ARCHITECTURE.md:
```
apps/
├── api/        # NestJS backend
├── admin/      # React admin (Vite + Refine)
└── public/     # TanStack Start — this doc
```
Same "full container dev" treatment as the other two apps (ARCHITECTURE.md §2) applies here when this gets implemented — a `public` service in `docker-compose.yml`, same bind-mount/anonymous-volume pattern, own port.

## Two things this forces a decision on

Designing the pages that actually consume the API surfaces two things ARCHITECTURE.md left open or didn't anticipate:

1. **Resolves ARCHITECTURE.md §11's "public read access" open decision.** With a real anonymous public site now in the picture, content read endpoints (`AdventurePage`, `PageRevision` current-content, `Trail`/`Spot`, `GuideProfile`, `TripReport` listings) **must** be `@Public()` — an anonymous visitor browsing Discover or reading an adventure page can't be made to authenticate first. Write actions (edit, like, kudos, comment, confirm) still require a logged-in user. Master data (`ActivityType`/`DifficultyLevel`/`Season`/location hierarchy) reads also become public, since they're needed for filter UI on a page anonymous visitors load.
2. **Surfaces a real gap in the auth flow (ARCHITECTURE.md §4/§10): there are now two frontends that both need Google login**, not one. The original design assumed a single `ADMIN_APP_URL` redirect target after the Google callback. With `apps/public` also needing sign-in, the API needs to know *which* frontend initiated the request to redirect back to the right one. Fix: `GET /auth/google?redirectUrl=...`, where `redirectUrl` must match an entry in a new `ALLOWED_REDIRECT_URLS` env var (comma-separated allowlist — both the admin and public app URLs) rather than being trusted as-is (an unvalidated open redirect would let anyone craft a login link that hands your access token to an attacker-controlled URL). The value is threaded through the OAuth `state` parameter (standard practice for carrying app-specific data through a third-party redirect) and read back on the callback to pick the right destination. This is a required update to ARCHITECTURE.md's auth section, not just a note here — applied below.

## Resolves ROADMAP.md's long-deferred pillar-priority question

ROADMAP.md's Deferred section has carried "which content pillar goes live first (Discover/Contribute/Share)" since Phase 1. Building the actual page list forces an answer, since pages have to exist in *some* order:

**Discover → Contribute → Share → Connect.** Reasoning: Discover (browse/search) and the adventure page itself (Article layer) are the backbone everything else hangs off of — trip reports and guide listings are both meaningless without adventure pages to attach to. Contribute (create/edit pages) comes right after Discover because editable content is the actual value proposition of a wiki-style platform, not an afterthought. Share (trip reports) and Connect (guide directory) both depend on pages existing, and can come in either order relative to each other, but after them — resolved here as Share before Connect, since a trip-report feed is native to an adventure page (needs it to have a "there's activity here" feel), whereas the guide directory is a comfortably standalone feature that can launch later without anything feeling incomplete.

## Page inventory

| Route | Purpose | Auth | Primary data (read) | Key actions (write) | SEO |
|---|---|---|---|---|---|
| `/` | Discover — map-first browse, filter by activity type / district / difficulty / season, plus a debounced full-text search box (Phase 14) that swaps the grid for ranked results | Public | `AdventurePage` list + master data for filter facets, `Trail`/`Spot` pins, `GET /adventure-pages/search?q=` results | — | Indexed, primary landing page |
| `/adventures/$slug` | Adventure page — infobox, prose from latest revision, photos, embedded map snippet, tag badges, "see also" related pages (Phase 13), trip report feed, contributors, like | Public read | `AdventurePage` + latest `PageRevision`, `Media`, `Trail`/`Spot`, `TripReport[]`, tags, `relatedPages`, derived contributor list | Like (`AdventurePageLike`), "log your trip" → trip report form, "edit this page" (auth), suggest a related page (auth) | **Primary indexable content** — title = page title, meta description = `summary`, JSON-LD `Article`/`TouristAttraction` |
| `/adventures/$slug/edit` | Submit a new revision | Required | current `PageRevision.content` pre-filled into the editor | Create `PageRevision` | noindex |
| `/adventures/$slug/history` | Revision list — version, editor, date, edit summary | Public | `PageRevision[]` for the page | — | noindex |
| `/adventures/$slug/history/$version` | Diff of one revision vs. the previous, revert action | Public read | two `PageRevision.content` snapshots, diffed at render time | Revert → new `PageRevision` (auth) | noindex |
| `/adventures/new` | Create a new adventure page, incl. a tag picker (Phase 13) | Required | master data for form selects, incl. `Tag[]` | Create `AdventurePage` + `PageRevision` v1 | n/a |
| `/adventures/$slug/trips/$tripReportId` | Trip report permalink, threaded comments (Phase 13) | Public read | `TripReport` (with `currency`) + `TripReportMedia` + nested `Comment[]` tree | Kudos, comment, reply (auth) | Indexed, secondary priority |
| `/adventures/$slug/trails/new` | Draw a new trail onto the map | Required | none (draws directly) | Create `Trail` | noindex |
| `/adventures/$slug/spots/new` | Place a new spot on the map | Required | `SpotType[]` for the form select | Create `Spot` | noindex |
| `/adventures/$slug/groups` | Trip-companion groups for this page (see TRIP_GROUPS.md, Phase 12) | Public | `TripGroup[]` for the page | — | Indexed |
| `/adventures/$slug/groups/new` | Start a trip group | Required | none | Create `TripGroup` (creator auto-joins as organizer) | noindex |
| `/adventures/$slug/groups/$groupId` | Trip group detail — dates, description, member list | Public read | one `TripGroup` + members | Join/leave (auth), cancel (organizer) | Indexed |
| `/guides` | Guide directory, filter by specialty/region/language | Public | `GuideProfile[]` + joins | — | Indexed |
| `/guides/$id` | Guide profile — certifications, languages, regions, rate range | Public | one `GuideProfile` | — | Indexed |
| `/account/guide-profile` | Create/edit your own guide profile | Required | own `GuideProfile` | Create/update `GuideProfile` + specialty/region/language joins | noindex |
| `/users/$id` | Public contributor page — edits, trips logged, kudos received (the Wikipedia-userpage concept from IDEA.md) | Public | derived counts/lists across `PageRevision`, `TripReport`, `TrailConfirmation`/`SpotConfirmation` by user, from `GET /users/:id/profile` | — | Indexed, low priority |
| `/login` | Trigger Google sign-in | Public | — | Redirects to `GET /auth/google?redirectUrl=...` | noindex |
| `/auth/callback` | Reads the access token fragment, stores it, redirects to the intended destination | Public (technical) | — | — | noindex |

`/users/$id`'s data source is `GET /users/:id/profile`, not `GET /users/:id` — that plainer path is the **admin** raw-record endpoint (role, isActive, email, for the admin Users edit form) added in the admin-beyond-master-data pass. The two were originally the same route; they were split once the admin edit form needed a different shape than the public contributor-profile aggregation.

Notifications and full-text search (both flagged as undesigned here originally) were built in Phase 14 — see SEARCH_AND_NOTIFICATIONS.md; the notification bell lives in the shared header (`__root.tsx`), not a dedicated route, and the search box lives on `/`. Still not designed here, flagged for later: any in-app messaging between users/guides (IDEA.md explicitly rules out in-app payment but is silent on messaging — contact is informational-only for now; trip-companion groups deliberately have no messaging either, see TRIP_GROUPS.md), i18n/language switching for the UI itself (distinct from `Language` master data, which is about *guides'* spoken languages, not the site's UI language), pagination/infinite-scroll mechanics (every list currently just requests a large page size).

## Routing structure (TanStack Router file convention)

```
apps/public/src/routes/
├── index.tsx                          # /
├── adventures/
│   ├── new.tsx                        # /adventures/new
│   └── $slug/
│       ├── index.tsx                  # /adventures/$slug
│       ├── edit.tsx                   # /adventures/$slug/edit
│       ├── history/
│       │   ├── index.tsx              # /adventures/$slug/history
│       │   └── $version.tsx           # /adventures/$slug/history/$version
│       ├── trips/
│       │   └── $tripReportId.tsx      # /adventures/$slug/trips/$tripReportId
│       ├── trails/
│       │   └── new.tsx                # /adventures/$slug/trails/new
│       ├── spots/
│       │   └── new.tsx                # /adventures/$slug/spots/new
│       └── groups/
│           ├── index.tsx              # /adventures/$slug/groups
│           ├── new.tsx                # /adventures/$slug/groups/new
│           └── $groupId.tsx           # /adventures/$slug/groups/$groupId
├── guides/
│   ├── index.tsx                      # /guides
│   └── $id.tsx                        # /guides/$id
├── users/
│   └── $id.tsx                        # /users/$id
├── account/
│   └── guide-profile.tsx              # /account/guide-profile
├── login.tsx                          # /login
└── auth/
    └── callback.tsx                   # /auth/callback
```

Also new since the original build: `apps/public/src/components/` (`Container`, `Button`, `Card`, `Badge`, `FormField`, `MultiSelectChips`, `Avatar`, `EmptyState`, `MarkdownContent`, `AdventureMap`/`LazyAdventureMap`, `DrawMap`/`LazyDrawMap`, `NotificationBell` (Phase 14)) — the reusable component/theme layer the visual-identity pass introduced, used across every route above.

## Data-loading pattern

- Server-side route loaders (TanStack Router's loader functions, run during SSR) call the NestJS API directly — same REST endpoints the admin app uses, just anonymous for public GETs (per the resolved open decision above) and bearer-token-authenticated for the logged-in user's own actions.
- The access token lives in memory client-side (per ARCHITECTURE.md §9's existing decision) but SSR loaders run *before* any client JS exists — meaning the very first server-rendered response for a page can't include personalized/authenticated data (e.g. "have I already kudos'd this"). That has to be filled in client-side after hydration, via a follow-up authenticated fetch. Worth knowing now so it doesn't come as a surprise mid-implementation: the SSR pass is for public content and SEO, not for "is this logged-in user's like already applied here" — that's a client-side enhancement layered on top.

## Required updates to already-written docs

- **ARCHITECTURE.md §4 (Auth design)**: add `redirectUrl` query param + `ALLOWED_REDIRECT_URLS` allowlist to the Google OAuth flow, so both `apps/admin` and `apps/public` can trigger login and land back on themselves.
- **ARCHITECTURE.md §11 (Open decisions)**: "public read access" is now resolved (public), not open — content and master-data GETs are `@Public()`.
- **ARCHITECTURE.md §1/§2**: `apps/public` joins the repo tree and docker-compose, same pattern as `apps/admin`.
