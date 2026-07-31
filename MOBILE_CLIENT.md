# Mobile client readiness — auth, offline sync, offline basemap

What the API and infrastructure must grow before a native mobile app (record a track Strava-style, follow trails offline maps.me-style) can be built — so that work isn't discovered mid-build. No mobile app code exists or is planned in this repo; this is pure future-readiness. Companion to ACTIVITY_TRACKS.md (the server-side track model this client would record into and sync) and CLAUDE.md's locked auth and map-rendering decisions, both of which this doc proposes explicit extensions to rather than reversals. Depends on ACTIVITY_TRACKS.md's `ActivityTrack`/import pipeline existing first for the sync section to have something to sync. Design-process record: TRACKS_AND_MOBILE_PLAN.md.

**Status**: designed, not built. No app code, no mobile project scaffold — this doc only.

## Scope

Two purposes drive everything below: **record a track/activity** and **follow existing trails using offline maps**. Both require the mobile client to authenticate without a browser redirect, sync data intermittently over unreliable connections, and render a basemap without a live network connection or an API key (CLAUDE.md's locked no-vendor-map-API constraint carries over unchanged).

Not designed here: the mobile app itself, its UI, its framework choice (React Native vs. native vs. Flutter — irrelevant to the server contract), push notification content/copy.

## Auth — the concrete blockers

The current auth flow is entirely browser-shaped: `GET /auth/google` redirects to Google, Google redirects back, the API issues tokens via `res.redirect(\`${redirectUrl}/auth/callback#access_token=…\`)` — a 302 with the access token in a URL fragment, and the refresh token set only via `Set-Cookie`. A native app has no browser chrome to catch a fragment redirect and no cookie jar shared with a web session.

| Blocker | Current state | What mobile needs |
|---|---|---|
| No non-browser login | Token issuance ends in a redirect with the token in a URL fragment. No JSON login endpoint exists. | `POST /auth/google/token` taking a native Google Sign-In ID token (or code + PKCE verifier), returning tokens in the response body. |
| Refresh is cookie-only | Read exclusively from `req.cookies['refresh_token']`; the rotated token is returned only via `Set-Cookie`, never in the body. `path=/api/v1/auth`, `sameSite=lax`, host-only. | A body-based `{ refreshToken }` variant of the refresh endpoint. |
| **`secure` is never set on the refresh cookie** | Grep for `secure:` in `apps/api/src` returns nothing — the production refresh cookie is transmittable over plaintext. | Flag as a current bug worth fixing independently of mobile — not a mobile-only concern. |
| No reuse detection, no device column | Single-use rotation, but replaying a revoked token just 401s without invalidating its descendants. No `deviceLabel` column, so no "sign out other devices". No cleanup job for expired rows. | Token-family revocation (revoking one token in a rotation chain revokes all its descendants) + a `deviceLabel` column on `RefreshToken`. |
| 401s are indistinguishable | Expired, malformed, and revoked tokens all yield `message: "Unauthorized"`. Neither web client auto-refreshes on this signal today. | A machine-readable `code` on the exception filter — the same single choke point I18N.md already named for error codes, extended here rather than duplicated. |
| `forbidNonWhitelisted: true` | Any unknown body property is a hard 400 on every DTO. | `clientUuid` (ACTIVITY_TRACKS.md) must be an explicit DTO field, not an ad-hoc extra — already designed that way there. |
| **No rate limiting anywhere** | No throttler, no helmet, a bare `reverse_proxy` in Caddy. `/auth/refresh` and `/auth/google` are unthrottled and `@Public()`. | `@nestjs/throttler` on auth + upload routes, before a retry-happy offline client starts hammering them on reconnect. |
| Concurrent refresh is fatal | Single-use rotation; the web clients work around it with a shared in-flight promise (`apps/public/src/lib/auth/session.ts`). | The same single-flight mutex, ported to the mobile client's token layer. |

## Offline sync

Idempotent upload keyed on `(userId, clientUuid)` — ACTIVITY_TRACKS.md's `ActivityTrack.clientUuid` and its `@@unique([userId, clientUuid])` constraint exist specifically so a retried offline upload can't duplicate a track. Delta pull via `?since=updatedAt` (`GET /me/activity-tracks?since=`, already named in ACTIVITY_TRACKS.md). The server stays authoritative on every derived field — distance, ascent, simplified geometry are always recomputed server-side from uploaded raw points, never trusted from the client. This is the same "don't trust the client to keep derived state honest" instinct CLAUDE.md records for `searchVector` and `verificationStatus`, applied to a third case.

A device that recorded a track fully offline uploads it through the same `POST /activity-tracks` JSON endpoint ACTIVITY_TRACKS.md defines for client-recorded points — no separate "sync" endpoint, since import-from-file and upload-from-device converge on the same normalized `ParsedTrack` shape once points exist in memory.

## Offline basemap

"Can't we just download and save tiles to the device like maps.me?" — yes, and that's the recommended approach. The correction is only about *what* gets downloaded, not whether. maps.me / Organic Maps don't bulk-download rendered PNG tiles; they ship a compact vector map file derived from OSM's raw data and render it on-device. Two different things with two different rules:

- OSM **data** (Geofabrik/planet extracts) is ODbL-licensed — free to download, process, and redistribute with attribution. This is what maps.me uses.
- OSM's **tile server** (`tile.openstreetmap.org` — what all three of this app's map components hardcode today) is donated infrastructure whose Tile Usage Policy forbids bulk downloading.

So: do what maps.me does, sourcing from a Nepal OSM extract rather than the tile CDN. No API key, no vendor, still free — consistent with CLAUDE.md's locked no-API-key decision; this is an implementation detail of *how* that decision gets served offline, not a departure from it.

Pipeline:

1. Fetch the Geofabrik **Nepal extract** (~200 MB PBF, updated daily upstream).
2. Build a single-file **`nepal.pmtiles`** vector tileset with Planetiler (z0–14, roughly 200–400 MB).
3. **Out-of-band build step, not CI.** Deploys already `git reset --hard` and build directly on the VPS (FEATURE.md §10); git-lfs isn't configured and the largest file tracked in git today is 466 KB — a tile artifact must never enter git.
4. Store on a new `tiles_data` Docker volume, serve via **Caddy's `file_server` directly**. Critically *not* through `apps/public/server.prod.mjs`, which has no Range/206 support, no `ETag`, no `Cache-Control` — and PMTiles fundamentally requires HTTP Range requests to work.
5. **Cheaper v1 worth building first: per-page tile packs** rather than the full-country file — clip to a buffer around one adventure page's trails, tens of MB instead of hundreds. `GET /adventure-pages/:slug/offline-pack` returns a manifest plus a download URL, pairing with ACTIVITY_TRACKS.md's `GET /adventure-pages/:slug/offline-bundle` (data) to give one page a complete offline package (data + basemap tiles).

Consequences to state plainly:

- This introduces **MapLibre alongside Leaflet** — PMTiles vector rendering needs a vector-tile-capable renderer, which Leaflet isn't. CLAUDE.md's locked "Leaflet + OSM raster tiles" decision needs an explicit offline caveat, not a reversal: **MapLibre on mobile only**, web stays on Leaflet + raster tiles unchanged. The two-renderer duplication is a named, accepted cost, not an oversight.
- **No CDN and no egress budget.** The VPS serving hundred-MB tile downloads to every mobile install is a real bandwidth line item that doesn't exist today — worth sizing before this ships, not after.

## Also deferred, named (not designed)

- **Push notifications.** The current `Notification` model (FEATURE.md §9) is DB rows polled every 60 s by a bell icon — fine for a web tab, useless for a backgrounded phone. FCM/APNs delivery needs a device-token table (`userId`, platform, token, last-seen) and a dispatch step in `NotificationsService`. Not designed here.
- **Background-location permissions and battery drain.** iOS "Always Allow" location, Android's foreground-service notification requirement for background recording, and the battery cost of continuous GPS sampling are the dominant product risks of the "record a track" purpose — flagged as a paragraph, not designed, since they're client-platform concerns with no server-side shape.

## Required additions to existing models

| Existing model | Field to add |
|---|---|
| `RefreshToken` | `deviceLabel String?`, a token-family id for chained revocation |

Not added retroactively now, same reasoning as every other "required additions" table in this project's docs.

## API (`apps/api/src/auth/`)

| Endpoint | Note |
|---|---|
| `POST /auth/google/token` | body-based token exchange for native Google Sign-In, returns tokens in the response body |
| `POST /auth/refresh` | gains a body-based `{ refreshToken }` variant alongside the existing cookie-based flow |
| `POST /auth/logout-all-devices` | revokes an entire refresh-token family |

## Open decisions

1. **Whether the mobile client is React Native or fully native.** Irrelevant to this doc's server contract either way; left to whenever the app is actually started.
2. **Whether `deviceLabel` is user-editable or a fixed platform+model string.** Not designed.
3. **Whether the full-country `nepal.pmtiles` is ever built, or per-page offline packs turn out to be sufficient permanently.** Left open — start with per-page packs (point 5 above) and revisit only if usage shows people want whole-country offline coverage.
4. **Push notification transport (FCM+APNs directly vs. a unified service).** Named above, not designed.
