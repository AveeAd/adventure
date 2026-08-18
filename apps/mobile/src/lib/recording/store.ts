// SQLite-backed persistence for GPS recording sessions (MOBILE_PLAN.md
// Phase 4). Reuses the single app db from offline/db.ts rather than opening
// a second connection. Two responsibilities live here:
//   - session/point CRUD for the recorder itself (recorder.ts) and the
//     background location task (location-task.ts), including the
//     `active_session_id` flag in recording_meta so a fix delivered while
//     the app was relaunched from the background still knows where to go
//   - hydrating an OutboxState (sync-reducer.ts) from whatever sessions are
//     sitting in SQLite, so outbox.ts has a starting point on app launch
import type { CreateActivityTrackRequest } from '@adventure/api-types';

import { getDb } from '../offline/db';
import { haversineMeters, shouldKeepFix, toKeptPoint, type KeptPoint, type RawFix } from './sampling';
import { initialOutboxState, reduceOutbox, type OutboxState } from './sync-reducer';

export type SessionStatus = 'recording' | 'paused' | 'stopped';
export type SyncStatus = 'pending' | 'uploading' | 'synced' | 'failed';

export interface RecordingSession {
  id: string; // clientUuid
  activityTypeId: string;
  adventurePageId: string | null;
  name: string | null;
  notes: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  status: SessionStatus;
  startedAt: number;
  finishedAt: number | null;
  pointCount: number;
  distanceMeters: number;
  syncStatus: SyncStatus;
  syncAttempts: number;
  syncError: string | null;
  serverId: string | null;
}

interface SessionRow {
  id: string;
  activity_type_id: string;
  adventure_page_id: string | null;
  name: string | null;
  notes: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  status: SessionStatus;
  started_at: number;
  finished_at: number | null;
  point_count: number;
  distance_meters: number;
  sync_status: SyncStatus;
  sync_attempts: number;
  sync_error: string | null;
  server_id: string | null;
}

function fromRow(row: SessionRow): RecordingSession {
  return {
    id: row.id,
    activityTypeId: row.activity_type_id,
    adventurePageId: row.adventure_page_id,
    name: row.name,
    notes: row.notes,
    visibility: row.visibility,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    pointCount: row.point_count,
    distanceMeters: row.distance_meters,
    syncStatus: row.sync_status,
    syncAttempts: row.sync_attempts,
    syncError: row.sync_error,
    serverId: row.server_id,
  };
}

export async function createSession(params: {
  id: string;
  activityTypeId: string;
  adventurePageId?: string | null;
  visibility?: 'PRIVATE' | 'PUBLIC';
  startedAt: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recording_sessions (id, activity_type_id, adventure_page_id, visibility, status, started_at)
     VALUES (?, ?, ?, ?, 'recording', ?)`,
    params.id,
    params.activityTypeId,
    params.adventurePageId ?? null,
    params.visibility ?? 'PRIVATE',
    params.startedAt,
  );
  await setActiveSessionId(params.id);
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recording_sessions SET status = ? WHERE id = ?', status, id);
  if (status !== 'recording') {
    // Clear the flag the background task reads (store.getActiveSessionId)
    // as soon as we're no longer actively recording - belt-and-braces
    // against the async gap between calling stopLocationUpdatesAsync and
    // the OS actually honoring it, so a late-delivered fix is dropped by
    // appendFixIfWorthKeeping's own status check even if this races.
    const active = await getActiveSessionId();
    if (active === id) {
      await setActiveSessionId(null);
    }
  }
}

// Resuming a paused session both flips its status back to `recording` and
// re-marks it as the `active_session_id` the background task reads on each
// fix (setSessionStatus alone only clears that flag, it never re-sets it).
export async function resumeSession(id: string): Promise<void> {
  await setSessionStatus(id, 'recording');
  await setActiveSessionId(id);
}

export async function finishSession(id: string, finishedAt: number, name?: string, notes?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE recording_sessions SET status = 'stopped', finished_at = ?, name = COALESCE(?, name), notes = COALESCE(?, notes) WHERE id = ?`,
    finishedAt,
    name ?? null,
    notes ?? null,
    id,
  );
  await setActiveSessionId(null);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM recording_points WHERE session_id = ?', id);
    await db.runAsync('DELETE FROM recording_sessions WHERE id = ?', id);
  });
}

export async function getSession(id: string): Promise<RecordingSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM recording_sessions WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function listSessions(): Promise<RecordingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>('SELECT * FROM recording_sessions ORDER BY started_at DESC');
  return rows.map(fromRow);
}

export async function getLastKeptPoint(sessionId: string): Promise<KeptPoint | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ lat: number; lng: number; ele: number | null; t: number }>(
    'SELECT lat, lng, ele, t FROM recording_points WHERE session_id = ? ORDER BY seq DESC LIMIT 1',
    sessionId,
  );
  return row ? { lat: row.lat, lng: row.lng, ele: row.ele ?? undefined, t: row.t } : null;
}

export async function getSessionPoints(sessionId: string): Promise<KeptPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ lat: number; lng: number; ele: number | null; t: number }>(
    'SELECT lat, lng, ele, t FROM recording_points WHERE session_id = ? ORDER BY seq ASC',
    sessionId,
  );
  return rows.map((r) => ({ lat: r.lat, lng: r.lng, ele: r.ele ?? undefined, t: r.t }));
}

async function setActiveSessionId(id: string | null): Promise<void> {
  const db = await getDb();
  if (id === null) {
    await db.runAsync('DELETE FROM recording_meta WHERE key = ?', 'active_session_id');
  } else {
    await db.runAsync(
      `INSERT INTO recording_meta (key, value) VALUES ('active_session_id', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      id,
    );
  }
}

export async function getActiveSessionId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM recording_meta WHERE key = 'active_session_id'",
  );
  return row?.value ?? null;
}

// Applies the adaptive distance filter (sampling.ts) and, if the fix is
// worth keeping, appends it and updates the session's running point_count/
// distance_meters. Called both from the foreground watcher and the
// background TaskManager task, so it's the single place a raw GPS fix
// becomes (or doesn't become) a stored point. No-ops quietly if the session
// isn't actively recording - a fix can arrive just after pause/stop due to
// the async gap between calling stopLocationUpdatesAsync and the OS
// actually honoring it.
export async function appendFixIfWorthKeeping(sessionId: string, fix: RawFix): Promise<boolean> {
  const db = await getDb();
  const session = await getSession(sessionId);
  if (!session || session.status !== 'recording') {
    return false;
  }
  const last = await getLastKeptPoint(sessionId);
  if (!shouldKeepFix(fix, last)) {
    return false;
  }
  const kept = toKeptPoint(fix);
  const addedDistance = last ? haversineMeters(last, kept) : 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO recording_points (session_id, seq, lat, lng, ele, t) VALUES (?, ?, ?, ?, ?, ?)',
      sessionId,
      session.pointCount,
      kept.lat,
      kept.lng,
      kept.ele ?? null,
      kept.t,
    );
    await db.runAsync(
      'UPDATE recording_sessions SET point_count = point_count + 1, distance_meters = distance_meters + ? WHERE id = ?',
      addedDistance,
      sessionId,
    );
  });
  return true;
}

export function toCreateActivityTrackRequest(
  session: RecordingSession,
  points: KeptPoint[],
): CreateActivityTrackRequest {
  return {
    activityTypeId: session.activityTypeId,
    name: session.name ?? undefined,
    notes: session.notes ?? undefined,
    visibility: session.visibility,
    clientUuid: session.id,
    points: points.map((p) => ({ lng: p.lng, lat: p.lat, ele: p.ele, t: new Date(p.t).toISOString() })),
  };
}

export async function setSyncProgress(id: string, syncStatus: SyncStatus, patch: { attempts?: number; error?: string | null; serverId?: string } = {}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE recording_sessions
     SET sync_status = ?,
         sync_attempts = COALESCE(?, sync_attempts),
         sync_error = ?,
         server_id = COALESCE(?, server_id)
     WHERE id = ?`,
    syncStatus,
    patch.attempts ?? null,
    patch.error ?? null,
    patch.serverId ?? null,
    id,
  );
}

// Rebuilds an OutboxState from whatever stopped sessions exist in SQLite -
// the reducer (sync-reducer.ts) has no persistence of its own, so this is
// how outbox.ts gets a starting point on cold start / after a crash mid-sync.
export async function hydrateOutboxState(): Promise<OutboxState> {
  const sessions = await listSessions();
  let state = initialOutboxState;
  for (const session of sessions) {
    if (session.status !== 'stopped') continue; // still recording/paused - not outbox-eligible yet
    state = reduceOutbox(state, { type: 'ENQUEUE', clientUuid: session.id });
    if (session.syncStatus === 'synced' && session.serverId) {
      state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: session.id });
      state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: session.id, serverId: session.serverId });
    } else if (session.syncStatus === 'failed') {
      for (let i = 0; i < session.syncAttempts; i++) {
        state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: session.id });
        state = reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid: session.id, error: session.syncError ?? 'unknown' });
      }
    }
  }
  return state;
}
