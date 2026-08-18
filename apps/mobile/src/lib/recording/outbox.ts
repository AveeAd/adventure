// Wraps the pure sync-reducer with SQLite persistence and the actual
// network calls (MOBILE_PLAN.md Phase 4). Two directions:
//   - push: upload stopped-but-not-yet-synced sessions via
//     POST /activity-tracks, clientUuid making retries idempotent
//     (TracksService.persist's ON CONFLICT (userId, clientUuid) DO NOTHING)
//   - pull: GET /me/activity-tracks?since= to learn about tombstones (a
//     track deleted from another device/the admin moderation queue) so a
//     locally-synced session that no longer exists server-side doesn't get
//     silently re-uploaded or linger forever
import type { ActivityTrackFull, CreateActivityTrackRequest } from '@adventure/api-types';

import { authGet, authPost } from '@/lib/auth-fetch';
import { getDb } from '@/lib/offline/db';
import { isConnected } from '@/lib/offline/connectivity';

import {
  deleteSession,
  getSession,
  getSessionPoints,
  hydrateOutboxState,
  listSessions,
  setSyncProgress,
  toCreateActivityTrackRequest,
} from './store';
import { nextUploadable, reduceOutbox, retryDelayMs, type OutboxState } from './sync-reducer';

let inFlight: Promise<void> | null = null;

// Attempts to upload every eligible stopped session, one at a time
// (sequential on purpose - these are large point arrays and there's no
// value in racing multiple uploads against a single-user API). Safe to call
// repeatedly (app foreground, after a recording finishes, on a timer) -
// concurrent calls collapse into the one already running.
export async function syncOutbox(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<void> {
  if (!(await isConnected())) return;

  let state = await hydrateOutboxState();
  let clientUuid = nextUploadable(state);
  while (clientUuid) {
    state = await uploadOne(state, clientUuid);
    clientUuid = nextUploadable(state);
  }

  await reconcileTombstones();
}

async function uploadOne(state: OutboxState, clientUuid: string): Promise<OutboxState> {
  const session = await getSession(clientUuid);
  if (!session) {
    // Enqueued from a hydrate pass but deleted locally since - drop it.
    return reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid, error: 'session missing locally' });
  }

  const attemptsBefore = session.syncAttempts;
  let next = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid });
  await setSyncProgress(clientUuid, 'uploading');

  try {
    const points = await getSessionPoints(clientUuid);
    if (points.length < 2) {
      // Too short to be a valid ActivityTrack (API requires >=2 points) -
      // don't retry forever, just drop it as failed so the UI can surface
      // "recording too short to save" rather than looping.
      await setSyncProgress(clientUuid, 'failed', { attempts: attemptsBefore + 1, error: 'Recording too short to save' });
      return reduceOutbox(next, { type: 'UPLOAD_FAILURE', clientUuid, error: 'Recording too short to save' });
    }
    const body: CreateActivityTrackRequest = toCreateActivityTrackRequest(session, points);
    const created = await authPost<ActivityTrackFull>('/activity-tracks', body);
    await setSyncProgress(clientUuid, 'synced', { serverId: created.id, error: null });
    return reduceOutbox(next, { type: 'UPLOAD_SUCCESS', clientUuid, serverId: created.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    const attempts = attemptsBefore + 1;
    await setSyncProgress(clientUuid, 'pending', { attempts, error: message });
    next = reduceOutbox(next, { type: 'UPLOAD_FAILURE', clientUuid, error: message });
    // Small inline backoff before letting the caller try the next entry -
    // real retries happen on the next syncOutbox() call (app foreground,
    // recording-stopped, etc.), this just avoids hammering a flaky network
    // within a single pass.
    await sleep(retryDelayMs(attemptsBefore));
    return next;
  }
}

// Pulls the delta sync endpoint and evicts any local session whose upload
// succeeded previously but whose server row is now a tombstone (deleted
// elsewhere) - see TracksService.listSince's tombstone shape.
async function reconcileTombstones(): Promise<void> {
  const since = await getLastSyncCursor();
  let cursor: string | null = null;
  let latestUpdatedAt = since;

  do {
    const page: { data: { id: string; isActive: boolean; updatedAt: string }[]; nextCursor: string | null } =
      await authGet(`/me/activity-tracks?since=${encodeURIComponent(since)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const item of page.data) {
      if (item.updatedAt > latestUpdatedAt) latestUpdatedAt = item.updatedAt;
      if (item.isActive === false) {
        await evictByServerId(item.id);
      }
    }
    cursor = page.nextCursor;
  } while (cursor);

  await setLastSyncCursor(latestUpdatedAt);
}

async function evictByServerId(serverId: string): Promise<void> {
  const sessions = await listSessions();
  const match = sessions.find((s) => s.serverId === serverId);
  if (match) {
    await deleteSession(match.id);
  }
}

async function getLastSyncCursor(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM recording_meta WHERE key = 'last_sync_cursor'");
  return row?.value ?? new Date(0).toISOString();
}

async function setLastSyncCursor(value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recording_meta (key, value) VALUES ('last_sync_cursor', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    value,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
