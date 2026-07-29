# Trip reports — the social layer

Design for IDEA.md's "Share" pillar and Activity layer (inherited from Strava): "a Strava-style trip reports: what someone actually did, real dates, real costs, kudos/comments." Companion to [ADVENTURE_PAGES.md](ADVENTURE_PAGES.md) (trip reports live on an adventure page's feed) and [MAP_GEODATA.md](MAP_GEODATA.md).

**Status**: built (Phase 8) — public logging/kudos/comments UI on the adventure page view and a trip report permalink page, plus an admin view/delete area (Users beyond master data pass). Schema below is unchanged from what shipped; the multi-currency-cost and threaded-reply gaps noted below are still open, see ROADMAP.md's Deferred section.

## Scope and the one big departure from the content layer

Trip reports get **no verification/trust tier** — no `verificationStatus`, no confirmation table. Everywhere else in the content layer (`AdventurePage`, `Trail`, `Spot`), an unverified → verified pipeline exists because that content is a factual claim other people rely on for planning (is this route safe, is this teahouse real). A trip report isn't that — it's "here's what I did," a personal account. IDEA.md's own wording is "kudos/comments," not a confirmation mechanism, so kudos and comments are the only trust/engagement signal here. This is a deliberate asymmetry with the rest of the schema, not an oversight.

## Schema (additions to `prisma/schema.prisma`)

```prisma
model TripReport {
  id                String   @id @default(uuid())
  adventurePageId   String
  adventurePage     AdventurePage @relation(fields: [adventurePageId], references: [id], onDelete: Cascade)
  authorId          String
  author            User     @relation(fields: [authorId], references: [id], onDelete: Restrict)
  title             String?
  description       String?
  dateCompleted     DateTime
  durationDays      Int?
  actualCostAmount  Int?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  media    TripReportMedia[]
  kudos    TripReportKudos[]
  comments Comment[]

  @@map("trip_reports")
}

model TripReportMedia {
  id           String   @id @default(uuid())
  tripReportId String
  tripReport   TripReport @relation(fields: [tripReportId], references: [id], onDelete: Cascade)
  url          String
  caption      String?
  altText      String?
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  @@map("trip_report_media")
}

model TripReportKudos {
  id           String   @id @default(uuid())
  tripReportId String
  tripReport   TripReport @relation(fields: [tripReportId], references: [id], onDelete: Cascade)
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())

  @@unique([tripReportId, userId])
  @@map("trip_report_kudos")
}

model Comment {
  id           String   @id @default(uuid())
  tripReportId String
  tripReport   TripReport @relation(fields: [tripReportId], references: [id], onDelete: Cascade)
  authorId     String
  author       User       @relation(fields: [authorId], references: [id], onDelete: Restrict)
  content      String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("comments")
}
```

## Entity relationships

```mermaid
erDiagram
    AdventurePage ||--o{ TripReport : has
    TripReport }o--|| User : "authored by"
    TripReport ||--o{ TripReportMedia : has
    TripReport ||--o{ TripReportKudos : has
    TripReport ||--o{ Comment : has
    TripReportKudos }o--|| User : "given by"
    Comment }o--|| User : "authored by"

    TripReport {
        string id PK
        string adventurePageId FK
        string authorId FK
        string title "nullable"
        string description "nullable"
        datetime dateCompleted
        int durationDays "nullable"
        int actualCostAmount "nullable, implicit currency"
        boolean isActive
    }
    TripReportMedia {
        string id PK
        string tripReportId FK
        string url
        string caption
        string altText
        int sortOrder
    }
    TripReportKudos {
        string id PK
        string tripReportId FK
        string userId FK
    }
    Comment {
        string id PK
        string tripReportId FK
        string authorId FK
        string content
        boolean isActive
    }
```

## Per-table notes

- **`TripReport`**: `onDelete: Cascade` from `adventurePageId` (a trip report is exclusively owned by the page it's logged against, same ownership pattern as `Trail`/`Spot`/`Media`). `onDelete: Restrict` on `authorId` — same reasoning as `PageRevision.editorId`/`Media.uploadedById`: don't lose content by cascading through a hard-deleted user. `dateCompleted` (when the trip happened) is deliberately separate from `createdAt` (when the report was posted) — the same "date posted vs. date the content is actually about" distinction ADVENTURE_PAGES.md draws between `AdventurePage.createdAt` and a revision's `createdAt`.
- **`actualCostAmount` assumes a single implicit currency** (Nepali Rupees) — no `currency` column. This is a simplification worth revisiting if the platform ever needs to show costs to non-Nepali users in their own currency; flagged, not solved, here.
- **`TripReportMedia` is its own table**, not a shared/polymorphic media table with `Media` (which belongs to `AdventurePage`). Prisma has no clean polymorphic-association pattern, and this project has consistently preferred a duplicated-but-simple table over forcing shared shape (see `PageConfirmation`/`TrailConfirmation`/`SpotConfirmation` as three separate tables rather than one generic one). Unlike `Media`, there's no `uploadedById` here — a trip report has exactly one author, so attribution is already on the parent `TripReport`, not needed per-photo.
- **`TripReportKudos`**: a simple like, `@@unique([tripReportId, userId])` stops a user from kudos-ing their own report a hundred times to appear more popular.
- **`Comment` is flat** — no parent/reply threading. `isActive` gives moderators a way to hide a comment without hard-deleting it (consistent with the soft-delete convention everywhere else), same reasoning as everywhere else: undo is flipping a flag, not losing data. Threaded replies are a real future feature, not designed here — would need a self-referencing `parentId` like `ActivityType`'s, but isn't justified by anything IDEA.md asks for yet.

## Required additions to existing models

| Existing model | Field to add |
|---|---|
| `AdventurePage` | `tripReports TripReport[]` |
| `User` | `tripReports TripReport[]`, `tripReportKudos TripReportKudos[]`, `comments Comment[]` |

Not added retroactively now, same reasoning as ADVENTURE_PAGES.md/MAP_GEODATA.md's equivalent tables.
