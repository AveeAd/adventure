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
