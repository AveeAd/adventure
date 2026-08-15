# Mobile App (`apps/mobile`) — Plan

## Context

The web platform (`apps/api`, `apps/admin`, `apps/public`) is feature-complete per CLAUDE.md's three build rounds. The goal is a React Native mobile app with **full feature parity** with `apps/public`, plus capabilities the web app structurally can't offer: **offline maps and offline content**, **background GPS activity-track recording**, **push notifications**, and **native camera upload**.

A pre-planning audit of the codebase surfaced nineteen gaps, several of them store-mandated blockers that force revisiting locked architectural decisions. All have now been resolved into the decisions below; the audit findings themselves are preserved in "Why these decisions" at the end for future reference.

---

## Locked decisions

| Area | Decision |
|---|---|
| Framework | React Native via Expo, **EAS dev builds from day one** (Expo Go is unusable — background location, MapLibre, and SQLite are all native modules) |
| Location | `apps/mobile` workspace in this monorepo, **running on the host, not in Docker** |
| Auth identity | New **`AuthIdentity` table** (`provider`, `providerId`) replacing `User.googleId` — one user can hold both Google and Apple |
| Account linking | **Auto-link on a matching provider-verified email**; manual "link account" flow in settings for Apple private-relay addresses |
| Account deletion | **Soft-delete + anonymize** — retain revision/report authorship as "[deleted user]", hard-delete `ActivityTrack`s |
| Shared types | New **`packages/api-types`** workspace, hand-written, consumed by all clients |
| Offline content | **Explicit per-adventure download** into local SQLite |
| Offline tiles | **Per-adventure bounding box**, buffered — same gesture as the content download |
| API compatibility | **Min-version check + additive-only policy** on `/api/v1` |
| Styling | **NativeWind** (ports the existing Tailwind palette and dark-mode conventions) |
| Testing | **Sync/offline logic only** (Jest); everything else manual, per repo convention |
| Photo uploads | **Client-side transcode + resize** (`expo-image-manipulator`); server stays strict |
| Sequencing | Schema-affecting and hard-to-retrofit work now; store-compliance surfaces before submission |

Two of these knowingly diverge from CLAUDE.md's locked decisions and should be written back into it: **"Auth is Google OAuth only"** (Apple sign-in is App Store–mandated) and **"full container dev"** (`apps/mobile` cannot run in Docker). A third CLAUDE.md item is simply stale and should be dropped: the "known gap" claiming `/trails/bbox` and `/spots/bbox` lack `LIMIT`/simplification/DTO validation — `BboxQueryDto`, `LIMIT 500`, and zoom-adaptive `ST_SimplifyPreserveTopology` are already implemented.

---

## Phase 0 — API prerequisites (blocking)

Everything here is additive: the existing cookie-based browser flow must keep working untouched, verified before moving on.

**1. `AuthIdentity` migration.** Introduce the table and backfill from existing users, then drop `User.googleId`:

```prisma
model AuthIdentity {
  id         String       @id @default(uuid())
  userId     String
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider   AuthProvider // GOOGLE | APPLE
  providerId String
  email      String?      // per-provider email; Apple relay differs from User.email
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@unique([provider, providerId])
  @@index([userId])
}
```

This is a **data-moving migration**: insert one `GOOGLE` row per existing user from their `googleId`, verify counts match, then drop the column. Per CLAUDE.md, `prisma migrate dev` has consistently refused to run non-interactively in the container — use `prisma migrate diff` + hand-stripped SQL + `prisma migrate deploy`, and check the generated SQL for spurious `DROP INDEX` statements on unrelated tables.

`AuthService.handleGoogleLogin` changes from "upsert User by googleId" to "find `AuthIdentity` by `(GOOGLE, sub)` → else find User by verified email and attach a new identity → else create User + identity", all inside the existing transaction that also upserts `Profile` and `GuideProfile`. **Only auto-link when the provider asserts the email is verified** (Google's `email_verified` claim; Apple always verifies) — linking on an unverified email is an account-takeover vector.

**2. JSON mobile login** — `POST /api/v1/auth/google/mobile`. Accepts a Google ID token from the native SDK, verifies it server-side via `google-auth-library`'s `OAuth2Client.verifyIdToken` with the **iOS, Android, and web client IDs all accepted as valid audiences**, then routes into the same identity resolution as above so there stays exactly one place that creates users. Returns `{ accessToken, refreshToken, user }` as JSON — refresh token in the body because RN has no shared browser cookie jar. Add the native client IDs to the Zod schema in `config.module.ts`.

**3. Body-based refresh & logout fallback** — extend `POST /auth/refresh` and `POST /auth/logout` in `auth.controller.ts` to fall back to `req.body.refreshToken` when the cookie is absent. `AuthService.refresh()`/`logout()` already take a raw token string and are transport-agnostic, so only the controller's extraction needs a second branch. Cookie keeps priority; web is unchanged.

**4. Fix the missing `secure` cookie flag** — `setRefreshCookie` sets `httpOnly`/`sameSite`/`path`/`maxAge` but never `secure`. Add `secure: NODE_ENV === 'production'` so local HTTP dev still works. Pre-existing bug, worth fixing regardless.

**5. Rate limiting + `trust proxy`** — set `app.set('trust proxy', 1)` in `main.ts` **in the same change** as adding `@nestjs/throttler`. Caddy proxies every request, so without it `req.ip` is Caddy's container IP and the limiter becomes global rather than per-IP — locking out all users at once. Apply `@Throttle()` to the auth routes specifically rather than globally; map panning legitimately hammers the bbox and search endpoints and shouldn't share a budget with login.

**6. Sync correctness in `tracks.service.ts`:**
   - **Tombstones** — `listSince` currently filters `WHERE t."isActive" = true` (line 266), so a track deleted on one device never disappears from another. Return soft-deleted rows (at minimum `{id, isActive: false, updatedAt}`) so clients can reconcile.
   - **Bounded initial sync** — `listSince` is unpaginated, which is fine for deltas but unbounded on a fresh install where `since` is epoch. Add a cap plus continuation.

**7. `packages/api-types`** — new workspace, `packages/*` added to the root `workspaces` glob. Seed it with the shapes mobile needs first; migrating `apps/public`/`apps/admin` off their inline types can follow opportunistically rather than as a big-bang refactor.

**Deferred to Phase 7** (schema already accommodates them, so they're no longer retrofit risks): the Apple sign-in endpoint and UI, and `DELETE /api/v1/users/me`.

**Verification**: full manual login/refresh/logout pass on `apps/public` and `apps/admin` confirming no regression, then the new endpoints exercised via `curl` with a real Google ID token before any client code depends on them.

---

## Phase 1 — Scaffold + auth

1. **Scaffold** — `create-expo-app apps/mobile` (TypeScript), Expo Router for file-based navigation, mirroring the mental model TanStack Router already establishes in `apps/public`.
2. **Metro monorepo config** — `apps/public` pins `react@^19.2.0` and `apps/admin` `react@^19.2.7`, while Expo pins its own exact React. npm workspaces hoists aggressively and has no `nohoist`, so Metro can resolve two Reacts. Needs explicit `watchFolders` + `nodeModulesPaths` in `metro.config.js`. **Budget real time here** — this is the standard RN-in-a-monorepo tax and it is easier to fix before there's app code than after.
3. **API client** — `apps/mobile/src/lib/api.ts`, modeled on `apps/public/src/lib/auth/auth-fetch.ts` minus the SSR URL branching (mobile is always the "client" branch), pointed at `EXPO_PUBLIC_API_URL`. Send a client-version header from the start so the Phase 7 gate has something to read.
4. **Token storage** — access token in memory (same rationale as web), refresh token in `expo-secure-store`. On cold start, if a stored refresh token exists, mint an access token via the body-based `/auth/refresh`. Refresh tokens are single-use and rotating, so concurrent refreshes race — reuse the in-flight-promise dedupe that `apps/public/src/lib/auth/session.ts` already implements for exactly this.
5. **Login/logout** — `@react-native-google-signin/google-signin` (native sheet, no browser bounce; viable because dev builds are assumed) → `POST /auth/google/mobile`. Logout clears secure store and calls `/auth/logout` with the token in the body.
6. **NativeWind + palette tokens**, ported from `apps/public/src/styles.css`. Dark mode via `useColorScheme`.
7. **Sentry** wired up now, so every later phase reports crashes.

**Verification**: sign in with a real Google account on a physical device, land on an authenticated placeholder, cold-restart and stay signed in, log out cleanly.

---

## Later phases

Each gets its own planning pass when reached.

- **Phase 2 — Read-only browsing.** Adventure pages, trails/spots, trip reports, guides, clubs/threads. Screens map roughly 1:1 from `apps/public/src/routes/*`. Establishes the navigation skeleton and UI primitives (Card/Button/Badge/EmptyState equivalents) before any write flows.

- **Phase 3 — Offline.** Two coupled tracks behind one "Download for offline" gesture on an adventure page: a **local SQLite content mirror** (page, trails, spots, elevation profiles) with a staleness/refresh policy, and **map tiles for that adventure's buffered bounding box**.
  **Spike required before scheduling.** `maplibre-gl-js` supports `pmtiles://` through a JS protocol handler; the native SDKs behind `@maplibre/maplibre-react-native` do not. Candidate approaches: an in-app local HTTP server serving range requests over a PMTiles file; MBTiles + local server; or MapLibre's native offline-region download API against a hosted tile endpoint. Per-adventure bboxes keep each download to tens of MB, which sidesteps the 300–800MB whole-Nepal problem — but the protocol question still has to be answered first.

- **Phase 4 — GPS recording.** Foreground first, then background. Sampling must be **distance-filtered and adaptive**, not time-based — naive 1 Hz GPS drains a phone in ~5 hours, shorter than a day hike. Requires `UIBackgroundModes: location` with a specific purpose string, Android's separate `ACCESS_BACKGROUND_LOCATION` flow and Play Console declaration, and a visible ongoing indicator. Background location is the most review-scrutinized permission there is; recording a hike justifies it, but the paperwork is real.
  Local SQLite outbox syncs via `POST /activity-tracks` with `clientUuid` idempotency — `@@unique([userId, clientUuid])` + `ON CONFLICT DO NOTHING` is already built for exactly this retry pattern — and the now-tombstone-aware `GET /me/activity-tracks?since=`. **Unit-test the sync reducer** (outbox, retry, tombstone reconciliation); this is the one place where the failure mode is silent data loss.

- **Phase 5 — Contribute/write flows.** Page/trail/spot create and edit through the same approval-pipeline endpoints the web uses (no new backend logic, only new UI), trip reports, club/thread posting, kudos/comments. Native camera via `expo-image-picker`, with `expo-image-manipulator` transcoding HEIC→JPEG and downscaling before upload — required, since the API whitelists only `jpeg|png|webp|gif` at 5MB and iOS shoots HEIC by default.

- **Phase 6 — Push notifications.** Net-new backend: device-token table, FCM + APNs sender, fired from the same `NotificationsService.notify()` call sites that already write the in-app row — push as an additional delivery channel on an existing event, not a parallel system. **Must include per-category preferences.** CLAUDE.md lists "no notification preferences" as a known gap; that's tolerable for a polling bell icon but a direct route to uninstalls and OS-level notification blocking once it's push.

- **Phase 7 — Release readiness.** Apple sign-in endpoint + iOS UI; `DELETE /api/v1/users/me` implementing soft-delete + anonymize; min-version gate enforcement; search parity; i18n wiring; deep links (`apple-app-site-association` + `assetlinks.json` served from the Caddy-fronted domain, so the shipped SEO work opens the app); EAS Build/Submit pipeline with signing credentials — entirely separate from the existing GH Actions → SSH → compose flow; privacy policy and data-safety forms. Decide explicitly whether the moderator review-queue belongs on mobile at all, since it's a staff tool.

---

## Why these decisions (audit findings)

Kept for future reference — the reasoning behind the non-obvious calls above.

**Store-mandated, and the reason Phase 0 touches the schema at all:**
- **Sign in with Apple is required** (App Store Guideline 4.8) whenever third-party social login is the primary auth. Google Sign-In doesn't satisfy the exemption criteria — no email masking. This contradicts CLAUDE.md's locked "Auth is Google OAuth only" decision. The `AuthIdentity` table was chosen over a nullable `appleId` column specifically because it lets one user hold both providers, which is what makes the private-relay linking flow possible at all.
- **In-app account deletion is required** (Guideline 5.1.1(v)). There is no delete route today. It's non-trivial because `TripReport.authorId` is `Restrict` and revisions carry `editorId` — a hard delete would tear holes in the wiki's revision history, hence anonymize-and-retain.

**Correctness issues found in existing code:**
- `main.ts` never sets `trust proxy`, which would have turned a naively-added throttler into a global lockout.
- `listSince` filters `isActive = true`, so track deletions never propagate between a user's devices.
- `listSince` is unpaginated — fine for deltas, unbounded on first install.
- The uploads MIME whitelist omits `image/heic`, so iOS camera uploads would fail out of the box.

**Structural:**
- Expo cannot run in the Docker dev setup — the iOS Simulator needs a macOS host with Xcode, the Android emulator needs host virtualization, and Metro serves devices over the LAN. `apps/mobile` is the first deliberate exception to "full container dev"; the API stays containerized and mobile talks to it over a LAN IP.
- There is no `packages/` directory today; API shapes are declared inline per route (e.g. `interface ClubsSearch` in `apps/public/src/routes/clubs/index.tsx`). Mobile would have been a third hand-maintained copy, hence `packages/api-types` now, while there's only one new consumer.
- Offline *content* was the largest omission in the first draft of this plan. A basemap tells a trekker where they are; the actual value on the Annapurna circuit is the route description and safety notes, which live in Postgres.

---

## Verification approach

- Phase 0 is backend-only: confirm **no regression** on the existing web apps first, then exercise the new endpoints directly.
- Phase 1 onward runs on a physical device or simulator against the dockerized API (`docker-compose up`) over the host's LAN IP — remembering `apps/mobile` itself runs on the host.
- Repo convention is manual verification with no test suite; the single exception is unit tests around offline sync logic.
