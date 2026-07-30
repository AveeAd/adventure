# Plan — activity tracks, file import, and mobile/offline readiness

## Context

A future mobile app has two purposes: **record a track/activity** (Strava / maps.me style) and **follow existing trails using offline maps**. The app is not being built now — but the data model and API have to be shaped so it's possible later, and the import path for tracks exported from maps.me/Strava/Garmin is wanted regardless.

The blocking discovery: **this system has no concept of personal geodata at all.** Every geometry row today is `AdventurePage`-scoped, publicly readable, wiki-editable by anyone signed in, and peer-confirmed. A recorded activity is the opposite on all four axes. And `TripReport` — the Strava-analogue that already carries `dateCompleted`, cost, media, kudos, comments — has **zero geometry**, not even a start coordinate. Its media table has no per-photo coordinates either. So a recorded track has literally nowhere to live.

Deliverable this round: **two design docs, no implementation** — matching the repo's design-doc-first rhythm and the same "designed, not built" status the four existing specs carry.

### Decisions locked

| Question | Decision |
|---|---|
| Mobile app | **Not being built now.** Design the server side so it's possible; document what the client will require. |
| Recorded track destination | **Both** — lives in the owner's profile as a saved track, *and* can be contributed to create or update an adventure page's `Trail`. |
| Import formats | **GPX / KML / KMZ / GeoJSON files only.** No OSM-way import (avoids ODbL share-alike and route conflation). |
| Offline basemap | **Self-hosted vector tiles built from an OSM data extract** — which is exactly what maps.me does (see below). |
| This round's output | **Both design docs, nothing implemented.** `apps/api/prisma/schema.prisma` and all app code stay untouched; the prisma blocks below are specifications. |

### Answering "can't we download and save to the device like maps.me?"

Yes — and that's the recommended approach. The correction is only about *what* gets downloaded. maps.me / Organic Maps don't bulk-download rendered PNG tiles; they ship a compact **vector map file derived from OSM's raw data** and render it on-device. Two different things with two different rules:

- OSM **data** (Geofabrik/planet extracts) is ODbL — free to download, process, and redistribute with attribution. This is what maps.me uses.
- OSM's **tile server** (`tile.openstreetmap.org` — what all three of our map components hardcode today) is donated infrastructure whose Tile Usage Policy forbids bulk downloading.

So: do what maps.me does, sourcing from a Nepal OSM extract rather than the tile CDN. No API key, no vendor, still free — consistent with CLAUDE.md's locked no-API-key decision.

---

## Doc A — `ACTIVITY_TRACKS.md` (buildable now, no mobile app required)

Server-side only. The existing web app can consume it immediately: upload a GPX from maps.me, see your tracks, contribute one as a trail.

### The central split, and why

| | `Trail` (exists) | `ActivityTrack` (new) |
|---|---|---|
| Ownership | adventure-page-scoped, wiki-editable | user-owned |
| Mutability | edited in place / revisioned | immutable — a record of what happened |
| Trust model | peer-confirmed | none — testimony, not a claim |
| Timestamps | stripped for privacy | the entire point |
| Visibility | always public | private by default |

Overloading `Trail` with a nullable `userId` fights all five. The repo's own stated convention — "prefer one duplicated-but-simple table over a shared/polymorphic one," precedent `Media` vs. `TripReportMedia` and three separate `*Confirmation` tables — says duplicate. And the "no verification tier here, it's a personal account not a fact-checked claim" reasoning is exactly what FEATURE.md §5 already used for `TripReport`.

### Schema

```prisma
enum ActivityTrackVisibility { PRIVATE  PUBLIC }
enum ActivityTrackSource     { RECORDED  IMPORTED }

model ActivityTrack {
  id                 String   @id @default(uuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Nullable, unlike TripReport.adventurePageId - recording an unlisted
  // route is the case that grows the map. SetNull, not Cascade: deleting a
  // page must not destroy someone's personal record of their own hike.
  adventurePageId    String?
  adventurePage      AdventurePage? @relation(fields: [adventurePageId], references: [id], onDelete: SetNull)
  // Many tracks per report - a 12-day trek is 12 daily tracks, one story.
  tripReportId       String?
  tripReport         TripReport? @relation(fields: [tripReportId], references: [id], onDelete: SetNull)

  activityTypeId     String
  activityType       ActivityType @relation(fields: [activityTypeId], references: [id], onDelete: Restrict)
  name               String?
  notes              String?

  // Simplified path, for map rendering and spatial queries only. Full-fidelity
  // series lives in `samples` - the same sidecar split TrailElevationProfile
  // uses, for the same reason: geometry(LineString, 4326) forbids Z and M.
  geometry           Unsupported("geometry(LineString, 4326)")
  // [{ t: <s from startedAt>, d: <m along path>, e: <m elevation> }, ...]
  // Whole-object read, never queried into. Timestamps are legitimate here
  // because this row is user-owned and private by default - see the
  // privacy note below on why TRAIL_ELEVATION.md strips them and this doesn't.
  samples            Json
  sampleCount        Int

  startedAt          DateTime
  finishedAt         DateTime
  elapsedSeconds     Int
  movingSeconds      Int?
  distanceMeters     Int
  ascentMeters       Int?
  descentMeters      Int?
  minElevationMeters Int?
  maxElevationMeters Int?

  source             ActivityTrackSource
  visibility         ActivityTrackVisibility @default(PRIVATE)
  privacyTrimMeters  Int?     // metres trimmed from each end for non-owners
  // Client-generated, so an offline upload retry is idempotent instead of
  // duplicating the track. Nullable; Postgres treats two NULLs as unequal,
  // so the composite unique still permits many server-created rows.
  clientUuid         String?
  originalFileUrl    String?  // uploaded GPX/KML retained for re-parsing

  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([userId, clientUuid])
  @@index([userId, startedAt])
  @@map("activity_tracks")
}
```

`onDelete: Cascade` on `userId` is a deliberate divergence from `TripReport.authorId`'s `Restrict`. Restrict exists there to preserve authorship of *public content*; a private GPS recording is personal data closer to `Profile`/`RefreshToken`, where "delete the account, delete the data" is the right default.

### Storage volume — the real numbers

A 6-hour trek at 1 Hz is ~21,600 points: ~350 KB as full-fidelity geometry, plus ~200–300 KB of TOAST-compressed `samples`. Call it ~0.5–1 MB per activity; 10,000 activities ≈ 10 GB. This is the first feature that can materially grow the database, and the VPS has one `db_data` volume with **no resource limits, no quota, and no monitoring**.

Mitigation, specified in the doc: store `geometry` **simplified** (Douglas–Peucker at ~5 m drops 80–90% of points with no visible change at any map zoom), downsample `samples` adaptively (one per ~10 m or ~5 s, whichever comes first), and hard-cap `sampleCount`. Target ~50–100 KB per activity.

### Import pipeline — one parser, two destinations

This is the part that resolves a live contradiction. `TRAIL_ELEVATION.md` already designs `POST /adventure-pages/:pageId/trails/import-gpx` and **bolds a rule to discard GPX `<time>` elements** for privacy. A track recorder needs timestamps — pace and moving time are the whole value.

Both are correct, because **stripping time is a property of the destination, not the parser**: a public wiki `Trail` has no business carrying when someone walked it; a user-owned `ActivityTrack` does. The doc must say this explicitly so it doesn't read as reversing a deliberate decision.

```
apps/api/src/tracks/
├── parsers/
│   ├── parse-track-file.ts   # sniff format by MIME + extension + magic bytes
│   ├── gpx.parser.ts         # fast-xml-parser, per TRAIL_ELEVATION.md's choice
│   ├── kml.parser.ts         # KML + KMZ (zip) — what maps.me actually exports
│   └── geojson.parser.ts
├── track-geometry.util.ts    # simplify, aggregates, Nepal bbox guard
└── tracks.{module,controller,service}.ts
```

Normalized intermediate consumed by both endpoints:

```ts
interface ParsedTrackPoint { lng: number; lat: number; ele?: number; t?: Date }
interface ParsedTrack {
  name?: string;
  points: ParsedTrackPoint[];
  waypoints: { lng: number; lat: number; ele?: number; name?: string }[];
}
```

Guardrails, extending TRAIL_ELEVATION.md's five:
- **New `MAX_TRACK_UPLOAD_SIZE_MB` (default 25).** The existing `MAX_UPLOAD_SIZE_MB` defaults to 5, too small for a long GPX. Multer reads its limit from `process.env` at decorator-evaluation time (already documented in `uploads.controller.ts`), so a second env var is the path — not a ConfigService lookup.
- Accept `application/gpx+xml`, `application/vnd.google-earth.kml+xml`, `.kmz`, `application/geo+json`, plus `application/octet-stream` with extension sniffing — phones and browsers send inconsistent MIME types for `.gpx`.
- KMZ is a zip: guard decompressed size against zip bombs.
- Hard reject above ~100k parsed points; simplify everything below that.
- Reject tracks whose bbox falls outside Nepal (reuse TRAIL_ELEVATION.md's rule).
- **Resolve TRAIL_ELEVATION.md's open question** on multi-`<trkseg>`: segments join into one track (a segment break is GPS signal loss, not a new activity); separate `<trk>` elements become separate tracks.
- Waypoints (maps.me bookmarks) → candidate `Spot`s: designed, deferred to open decisions.

### Contributing a track to a trail

Two operations, both reusing existing write paths rather than adding parallel ones:

1. `POST /activity-tracks/:id/promote-to-trail` `{ adventurePageId, name }` — creates a new `Trail` from the simplified, time-stripped geometry, `source: RECORDED_ACTIVITY` (a **third variant** extending TRAIL_ELEVATION.md's `TrailSource`).
2. `POST /activity-tracks/:id/propose-trail-update` `{ trailId }` — routes through `TrailsService.update`, so once GEODATA_HISTORY.md lands this becomes a `TrailRevision` with `editSummary: "From recorded activity"` and inherits revision-scoped confirmation invalidation for free.

Quality point the doc must make: **a raw GPS trace is a poor canonical trail** — noise, switchback jitter, point clusters where someone stopped. Promotion always simplifies (`ST_SimplifyPreserveTopology`), and should show a preview diff first. GEODATA_HISTORY.md's `ST_HausdorffDistance` stat is exactly the primitive for "your track deviates up to N m from the existing trail."

### Retrieval — including two pre-existing holes this must fix

**Prerequisite fixes** (a track recorder is precisely the workload that turns these into outages):
- `GET /trails/bbox` and `/spots/bbox` have **no `LIMIT` and no simplification** — they return every intersecting row at full vertex resolution. Add `ST_Simplify` with tolerance derived from a `zoom` param, a `LIMIT`, and a bbox-area cap.
- bbox params are raw `@Query` strings coerced with `Number(...)` — **no DTO, so `NaN` flows straight into the SQL.** Add a validated DTO.
- `LineStringGeometryDto` validates only the outer array — no element type check, no lat/lng range check, no max size. Add `@ArrayMaxSize` and coordinate-range validation.

New reads:
- `GET /users/:id/activity-tracks` — public tracks only unless it's you. **Cursor pagination** (`?cursor=&limit=`), a deliberate first divergence from the repo's offset-only convention, which has no `pageSize` cap and is wrong for an infinite activity feed.
- `GET /activity-tracks/:id` — full `samples` for the owner; end-trimmed and downsampled for everyone else.
- `GET /me/activity-tracks?since=` — delta sync for a future client.
- `GET /adventure-pages/:slug/offline-bundle` — one JSON payload (page + latest revision content + simplified trails + spots + elevation profiles + a `version`), served with `ETag`/`If-None-Match` so a device revalidates cheaply. This is the offline-navigation payload.

Also needed and currently absent: the codebase's **only spatial predicate is `ST_Intersects` + `ST_MakeEnvelope`**. Off-trail detection and "nearest lodge" require the first `ST_DWithin` proximity query.

### Privacy

`PRIVATE`/`PUBLIC` only — there's no follower model to hang a `FOLLOWERS` tier on. Plus the real hazard: on a public, anonymously-readable site, a track's endpoints reveal where someone lives. `privacyTrimMeters` trims both ends of the served geometry for non-owners; the stored geometry stays intact for the owner.

---

## Doc B — `MOBILE_CLIENT.md` (pure future-readiness)

No app code in this repo. This doc records what the API must grow, so the work isn't discovered mid-build.

### Auth — the concrete blockers

| Blocker | Current state | What mobile needs |
|---|---|---|
| No non-browser login | The only token-issuing path ends in `res.redirect(\`${redirectUrl}/auth/callback#access_token=…\`)` — a 302 with the token in a URL fragment. No JSON login endpoint exists. | `POST /auth/google/token` taking a native Google Sign-In ID token (or code + PKCE verifier), returning tokens in the **body**. |
| Refresh is cookie-only | Read exclusively from `req.cookies['refresh_token']`; the rotated token is returned **only** via `Set-Cookie`, never in the body. `path=/api/v1/auth`, `sameSite=lax`, host-only. | A body-based `{ refreshToken }` variant. |
| **`secure` is never set on the refresh cookie** | Grep for `secure:` in `apps/api/src` returns nothing — the production refresh cookie is transmittable over plaintext. | **Flag as a current bug worth fixing independently of mobile.** |
| No reuse detection, no device column | Single-use rotation, but replaying a revoked token just 401s without invalidating its descendants. No `deviceLabel`, so no "sign out other devices". No cleanup job for expired rows. | Token-family revocation + a device column. |
| 401s are indistinguishable | Expired, malformed, and revoked all yield `message: "Unauthorized"`. Neither web client auto-refreshes. | A machine-readable `code` on the exception filter — the same single choke point I18N.md already named for error codes. |
| `forbidNonWhitelisted: true` | Any unknown body property is a hard 400. | `clientUuid` must be an explicit DTO field (it is, above) — not an ad-hoc extra. |
| **No rate limiting anywhere** | No throttler, no helmet, bare `reverse_proxy` in Caddy. `/auth/refresh` and `/auth/google` are unthrottled and `@Public()`. | `@nestjs/throttler` on auth + upload routes, before a retry-happy offline client arrives. |
| Concurrent refresh is fatal | Single-use rotation; the web clients work around it with a shared in-flight promise (`apps/public/src/lib/auth/session.ts`). | The same single-flight mutex on device. |

### Offline sync

Idempotent upload keyed on `(userId, clientUuid)`; delta pull via `?since=updatedAt`; server authoritative on all derived fields (distance, ascent, simplified geometry) — the same "don't trust the client to keep derived state honest" instinct CLAUDE.md records for `searchVector` and `verificationStatus`.

### Offline basemap

1. Fetch the Geofabrik **Nepal extract** (~200 MB PBF, daily).
2. Build a single-file **`nepal.pmtiles`** vector tileset with Planetiler (z0–14, roughly 200–400 MB).
3. **Out-of-band build step**, not in CI. Deploys already `git reset --hard` and build *on the VPS*; git-lfs isn't configured and the largest tracked file today is 466 KB — a tile artifact must never enter git.
4. Store on a new `tiles_data` volume, serve via **Caddy `file_server` directly**. Critically *not* through `apps/public/server.prod.mjs`, which has **no Range/206 support, no ETag, no `Cache-Control`** — and PMTiles fundamentally requires HTTP Range requests.
5. **Cheaper v1 worth doing first: per-page tile packs** — clip to a buffer around one adventure page's trails, tens of MB instead of hundreds. `GET /adventure-pages/:slug/offline-pack` returns a manifest plus URL.

Consequences to state plainly: this introduces **MapLibre alongside Leaflet**, so CLAUDE.md's locked "Leaflet + OSM raster tiles" decision needs an explicit offline caveat. Recommend MapLibre on mobile only at first (web unaffected), and name the two-renderer duplication as the accepted cost. Also: no CDN and no egress budget — a VPS serving hundred-MB downloads is a real bandwidth line item.

### Also deferred, named

Push notifications: the current `Notification` model is DB rows polled every 60 s by a bell icon. FCM/APNs needs a device-token table. Background-location permissions (iOS "Always Allow", Android foreground-service notification) and battery drain are the dominant product risks and get a paragraph, not a design.

---

## Reconciling edits to existing docs

| File | Edit |
|---|---|
| `TRAIL_ELEVATION.md` | Extend `TrailSource` with `RECORDED_ACTIVITY`; note the parser module is shared with the track importer; resolve the multi-`<trkseg>` open question; clarify that "discard `<time>`" is destination-scoped, not parser-wide |
| `FEATURE.md` §1 | Two new rows in the roadmap table (designed, not built) |
| `FEATURE.md` §4 | Note the bbox `LIMIT`/`ST_Simplify`/DTO-validation fix as a prerequisite |
| `FEATURE.md` §5 | Note that `TripReport` gains an optional `activityTracks` relation — the geometry it never had |
| `FEATURE.md` §11 | Fold in the new open decisions |
| `CLAUDE.md` | Doc map + the Leaflet/tiles locked decision's offline caveat + the designed-not-built list |

Per CLAUDE.md's convention, "required additions to existing models" stay specifications — `apps/api/prisma/schema.prisma` is untouched this round.

## Verification

No test suite exists in this repo (zero `*.spec.ts`, no jest/vitest, no `test` script, no CI test step). Verification for a docs round is review:

1. **Internal consistency** — every prisma block typechecks *as a specification* against the live schema: no name collisions, every relation has its reverse side listed, `RECORDED_ACTIVITY` extends rather than redefines `TrailSource`.
2. **No contradiction with the four existing designed-not-built docs** — specifically that the timestamp rule is reframed as destination-scoped rather than reversed, and that trail contribution reuses `TrailsService.update` instead of adding a parallel write path.
3. **Cross-reference integrity** — every `[Doc](Doc.md)` link resolves; grep for text still claiming tracks/offline are undesigned.
4. **No code touched** — `git status` shows only `.md` files.

When Doc A is later implemented, the migration must be generated `--create-only` and hand-edited: `activity_tracks` needs a hand-added `USING GIST (geometry)` index, and the generated SQL must be audited for spurious `DROP INDEX` on `trails_geometry_idx`/`spots_geometry_idx` — Prisma has done that twice already, and migrations run automatically on container startup, so a bad one breaks the deploy.
