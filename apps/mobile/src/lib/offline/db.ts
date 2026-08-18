import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'offline.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

// Schema is JSON-blob-per-row (see MOBILE_PLAN.md Phase 3 plan) - the only
// query pattern needed is "give me everything for adventure X," matching
// how the resource hooks already consume whole objects, so there's no
// normalized relational schema to migrate here.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS offline_adventure_pages (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    downloaded_at INTEGER NOT NULL,
    status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offline_trails (
    page_id TEXT NOT NULL REFERENCES offline_adventure_pages(id) ON DELETE CASCADE,
    trail_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (page_id, trail_id)
  );
  CREATE TABLE IF NOT EXISTS offline_spots (
    page_id TEXT NOT NULL REFERENCES offline_adventure_pages(id) ON DELETE CASCADE,
    spot_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (page_id, spot_id)
  );

  -- GPS-recorded activity tracks (MOBILE_PLAN.md Phase 4). id = clientUuid,
  -- doubling as the outbox key POST /activity-tracks is idempotent on
  -- (userId, clientUuid). points live in their own table so background
  -- location fixes can be appended one row at a time without rewriting a
  -- growing JSON blob on every fix.
  CREATE TABLE IF NOT EXISTS recording_sessions (
    id TEXT PRIMARY KEY,
    activity_type_id TEXT NOT NULL,
    adventure_page_id TEXT,
    name TEXT,
    notes TEXT,
    visibility TEXT NOT NULL DEFAULT 'PRIVATE',
    status TEXT NOT NULL DEFAULT 'recording',
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    point_count INTEGER NOT NULL DEFAULT 0,
    distance_meters REAL NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    sync_error TEXT,
    server_id TEXT
  );
  CREATE TABLE IF NOT EXISTS recording_points (
    session_id TEXT NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    ele REAL,
    t INTEGER NOT NULL,
    PRIMARY KEY (session_id, seq)
  );
  -- Single-row key/value table for state that must survive process restart
  -- and be readable from the background location TaskManager task, which
  -- can run in a fresh JS context - e.g. "which session is currently
  -- recording."
  CREATE TABLE IF NOT EXISTS recording_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    });
  }
  return dbPromise;
}
