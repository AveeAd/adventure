import type { AdventurePageDetail, Spot, Trail } from '@adventure/api-types';

import { getDb } from './db';

export type OfflineStatus = 'downloading' | 'downloaded' | 'failed';

export interface OfflinePage {
  payload: AdventurePageDetail;
  downloadedAt: number;
  status: OfflineStatus;
}

interface PageRow {
  payload: string;
  downloaded_at: number;
  status: OfflineStatus;
}

export async function getOfflinePage(slug: string): Promise<OfflinePage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PageRow>(
    'SELECT payload, downloaded_at, status FROM offline_adventure_pages WHERE slug = ?',
    slug,
  );
  if (!row) return null;
  return { payload: JSON.parse(row.payload), downloadedAt: row.downloaded_at, status: row.status };
}

export async function getOfflineTrails(pageId: string): Promise<Trail[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM offline_trails WHERE page_id = ?',
    pageId,
  );
  return rows.map((row) => JSON.parse(row.payload));
}

export async function getOfflineSpots(pageId: string): Promise<Spot[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM offline_spots WHERE page_id = ?',
    pageId,
  );
  return rows.map((row) => JSON.parse(row.payload));
}

// Writes the page + its trails/spots together, replacing whatever was there
// before - used both for the initial download and for silently re-syncing a
// standing download when a fresh fetch succeeds (see resources/adventure-pages.ts).
export async function saveOfflineAdventure(
  page: AdventurePageDetail,
  trails: Trail[],
  spots: Spot[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO offline_adventure_pages (id, slug, payload, downloaded_at, status)
       VALUES (?, ?, ?, ?, 'downloaded')
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, downloaded_at = excluded.downloaded_at, status = 'downloaded'`,
      page.id,
      page.slug,
      JSON.stringify(page),
      Date.now(),
    );
    await db.runAsync('DELETE FROM offline_trails WHERE page_id = ?', page.id);
    for (const trail of trails) {
      await db.runAsync(
        'INSERT INTO offline_trails (page_id, trail_id, payload) VALUES (?, ?, ?)',
        page.id,
        trail.id,
        JSON.stringify(trail),
      );
    }
    await db.runAsync('DELETE FROM offline_spots WHERE page_id = ?', page.id);
    for (const spot of spots) {
      await db.runAsync(
        'INSERT INTO offline_spots (page_id, spot_id, payload) VALUES (?, ?, ?)',
        page.id,
        spot.id,
        JSON.stringify(spot),
      );
    }
  });
}

export async function markOfflineAdventureFailed(pageId: string, slug: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_adventure_pages (id, slug, payload, downloaded_at, status)
     VALUES (?, ?, '{}', ?, 'failed')
     ON CONFLICT(id) DO UPDATE SET status = 'failed'`,
    pageId,
    slug,
    Date.now(),
  );
}

export async function deleteOfflineAdventure(pageId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM offline_trails WHERE page_id = ?', pageId);
    await db.runAsync('DELETE FROM offline_spots WHERE page_id = ?', pageId);
    await db.runAsync('DELETE FROM offline_adventure_pages WHERE id = ?', pageId);
  });
}

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days - see plan's staleness policy note

export function isStale(downloadedAt: number): boolean {
  return Date.now() - downloadedAt > STALE_AFTER_MS;
}
