# Full-text search & notifications

Design + build record for the last two items in ROADMAP.md's "Platform/infra" deferred bucket (the other two — UI i18n and hosting — are scoped separately; i18n still needs a target-languages decision, hosting is [DEPLOYMENT.md](DEPLOYMENT.md)). Companion to [ADVENTURE_PAGES.md](ADVENTURE_PAGES.md) (search indexes adventure pages), [TRIP_REPORTS.md](TRIP_REPORTS.md) (comments/kudos are notification sources), [MAP_GEODATA.md](MAP_GEODATA.md) and [GUIDES.md](GUIDES.md) (verification events are notification sources). Builds on [DATABASE.md](DATABASE.md)'s conventions.

**Status**: built (Phase 14).

## Full-text search

Postgres `tsvector`/`GIN`, not a separate search service (Elasticsearch, Algolia, etc.) — "no new infra," consistent with this being a solo side project, and Postgres full-text search is more than adequate at this data scale.

The tricky part is that what should be searchable — an adventure page's title, summary, *and current content* — spans two tables (`AdventurePage` and its latest `PageRevision`). Two options were available: a plain `to_tsvector(...)` expression computed at query time (simple, no schema change, but can't be indexed across the join), or a denormalized, trigger-maintained column on `AdventurePage` (indexable, but needs triggers to stay in sync). Went with the second — search performance matters more than avoiding a bit of trigger SQL.

```prisma
model AdventurePage {
  // ...existing fields...

  // trigger-maintained (title + summary + latest revision content) - never
  // written to by Prisma or application code. Unsupported columns aren't
  // diff-managed by `prisma migrate dev`, same gotcha as the Trail/Spot
  // geometry columns in MAP_GEODATA.md - the GIN index below has to be
  // hand-added/restored in migrations the same way those GiST indexes are.
  searchVector Unsupported("tsvector")?
}
```

Two Postgres triggers keep it current, both calling one shared function so the combining logic (`title || summary || latest revision content`) lives in exactly one place:

- `AFTER INSERT OR UPDATE OF title, summary ON adventure_pages` — fires on page metadata edits.
- `AFTER INSERT ON page_revisions` — fires on every new revision (i.e. every content edit).

```sql
CREATE OR REPLACE FUNCTION refresh_adventure_page_search_vector(p_id TEXT) RETURNS void AS $$
BEGIN
  UPDATE adventure_pages ap
  SET "searchVector" = to_tsvector('english',
    coalesce(ap.title, '') || ' ' || coalesce(ap.summary, '') || ' ' || coalesce((
      SELECT pr.content FROM page_revisions pr
      WHERE pr."adventurePageId" = ap.id
      ORDER BY pr.version DESC
      LIMIT 1
    ), '')
  )
  WHERE ap.id = p_id;
END;
$$ LANGUAGE plpgsql;
```

`GET /adventure-pages/search?q=` ranks matches with `ts_rank` against `plainto_tsquery('english', q)`. An empty/blank query short-circuits to an empty result set rather than hitting the database — `plainto_tsquery('')` matches nothing usefully anyway, so there's no reason to round-trip for it. Wired into a debounced search box on the Discover page (`apps/public/src/routes/index.tsx`) that swaps the page grid for ranked results while a query is active.

## Notifications

A `Notification` model — **one-way system messages, not user chat**. This doesn't reopen IDEA.md's no-in-app-messaging ruling (same framing TRIP_GROUPS.md used for why trip groups have no chat model): these are the platform telling a user something happened, never a channel between two users.

```prisma
enum NotificationType {
  COMMENT
  REPLY
  KUDOS
  PAGE_VERIFIED
  TRAIL_VERIFIED
  SPOT_VERIFIED
  GUIDE_VERIFIED
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  message   String
  linkUrl   String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
  @@map("notifications")
}
```

- **`message` is a precomputed string, not a template + params.** Simpler to read (both in the DB and in the admin, if a moderation view is ever needed) at the cost of not being retroactively re-localizable — an acceptable tradeoff since i18n is still an open decision anyway (see ROADMAP.md).
- **No read-per-recipient fan-out table** — `isRead` is a plain column on `Notification` because each notification already belongs to exactly one recipient (`userId`). This isn't a broadcast/announcement system; if one ever gets added, that's a different table, not a retrofit of this one.
- **A global `NotificationsModule`** (`apps/api/src/notifications/`), `@Global()` like `PrismaModule`, since triggers fire from otherwise-unrelated modules — comments, kudos, adventure-page/trail/spot confirmation thresholds, guide-profile admin verification. Importing it into every one of those modules individually would be pure boilerplate.
- **Self-notifications are suppressed at the service layer** (`NotificationsService.notify`/`notifyMany` take an `actorId` and skip it), not filtered in the UI — you never get told about your own comment, kudos, or edit.

### Where notifications fire from

| Event | Type | Recipient |
|---|---|---|
| New comment on a trip report | `COMMENT` | Trip report author |
| Reply to a comment | `REPLY` | Parent comment's author |
| Kudos given to a trip report | `KUDOS` | Trip report author |
| Adventure page confirmations cross the threshold | `PAGE_VERIFIED` | All page contributors (distinct `editorId`s across its revisions) |
| Trail/spot confirmations cross the threshold | `TRAIL_VERIFIED` / `SPOT_VERIFIED` | The trail/spot's `createdById` |
| Admin sets a guide profile to `VERIFIED` | `GUIDE_VERIFIED` | The guide (`GuideProfile.userId`) |

`GET/PATCH /notifications` (list + mark-one-read) and `POST /notifications/read-all` are the only endpoints — no per-type filtering or preferences yet, not asked for. Surfaced in `apps/public` as a bell icon in the header (`components/NotificationBell.tsx`) with an unread-count badge and a dropdown; polls every 60s rather than pushing over a socket, which is simple and adequate at this traffic scale.

## Open decisions

- **No notification preferences** — a user can't opt out of a category (e.g. mute kudos notifications but keep comments). Worth adding if the notification volume ever becomes noisy; not designed against here.
- **No push/email delivery** — notifications only ever show up in-app via the bell. Real-time push (web push, email digests) is a bigger feature with its own tradeoffs, out of scope for this pass.
- **Search covers adventure pages only** — trip reports, trails/spots, and guide profiles aren't indexed. Revisit if Discover-only search turns out to be too narrow in practice.
