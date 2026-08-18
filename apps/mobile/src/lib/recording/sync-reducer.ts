// Pure state machine for the recording outbox (MOBILE_PLAN.md Phase 4:
// "Unit-test the sync reducer (outbox, retry, tombstone reconciliation);
// this is the one place where the failure mode is silent data loss").
//
// Deliberately has no SQLite/network imports - outbox.ts wraps this with
// persistence and the actual authPost/listSince calls, but every state
// transition itself is decided here and is unit-testable in isolation.

export type OutboxStatus = 'pending' | 'uploading' | 'synced' | 'failed';

export interface OutboxEntry {
  clientUuid: string;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  serverId?: string;
  // Set when a `TOMBSTONE` event (from GET /me/activity-tracks?since=) shows
  // the server-side row was deleted after we uploaded it - e.g. the user
  // deleted the track from another device. The local copy should be evicted
  // rather than re-synced.
  deletedRemotely?: boolean;
}

export interface OutboxState {
  entries: Record<string, OutboxEntry>;
}

export type OutboxEvent =
  | { type: 'ENQUEUE'; clientUuid: string }
  | { type: 'UPLOAD_START'; clientUuid: string }
  | { type: 'UPLOAD_SUCCESS'; clientUuid: string; serverId: string }
  | { type: 'UPLOAD_FAILURE'; clientUuid: string; error: string }
  | { type: 'TOMBSTONE'; serverId: string };

export const initialOutboxState: OutboxState = { entries: {} };

// Past this many failed attempts, stop auto-retrying and surface the entry
// as needing manual attention (e.g. a "retry" button) rather than retrying
// forever against a permanently-rejecting server (e.g. a 400).
export const MAX_UPLOAD_ATTEMPTS = 5;

export function reduceOutbox(state: OutboxState, event: OutboxEvent): OutboxState {
  switch (event.type) {
    case 'ENQUEUE': {
      if (state.entries[event.clientUuid]) {
        return state; // idempotent - a session can only be enqueued once
      }
      return {
        entries: {
          ...state.entries,
          [event.clientUuid]: { clientUuid: event.clientUuid, status: 'pending', attempts: 0 },
        },
      };
    }
    case 'UPLOAD_START': {
      const entry = state.entries[event.clientUuid];
      if (!entry) return state;
      return { entries: { ...state.entries, [event.clientUuid]: { ...entry, status: 'uploading' } } };
    }
    case 'UPLOAD_SUCCESS': {
      const entry = state.entries[event.clientUuid];
      if (!entry) return state;
      return {
        entries: {
          ...state.entries,
          [event.clientUuid]: { ...entry, status: 'synced', serverId: event.serverId, lastError: undefined },
        },
      };
    }
    case 'UPLOAD_FAILURE': {
      const entry = state.entries[event.clientUuid];
      if (!entry) return state;
      const attempts = entry.attempts + 1;
      return {
        entries: {
          ...state.entries,
          [event.clientUuid]: {
            ...entry,
            status: attempts >= MAX_UPLOAD_ATTEMPTS ? 'failed' : 'pending',
            attempts,
            lastError: event.error,
          },
        },
      };
    }
    case 'TOMBSTONE': {
      const match = Object.values(state.entries).find((e) => e.serverId === event.serverId);
      if (!match) return state; // a track we never uploaded, or already evicted
      return { entries: { ...state.entries, [match.clientUuid]: { ...match, deletedRemotely: true } } };
    }
    default:
      return state;
  }
}

// The next entry outbox.ts should attempt to upload, or null if nothing is
// eligible - synced/failed/uploading/deleted-remotely entries are all
// excluded.
export function nextUploadable(state: OutboxState): string | null {
  const entry = Object.values(state.entries).find((e) => e.status === 'pending' && !e.deletedRemotely);
  return entry?.clientUuid ?? null;
}

// Exponential backoff capped at 30s, keyed on attempts-so-far (0-indexed,
// i.e. called with the *pre*-failure attempt count).
export function retryDelayMs(attempts: number): number {
  return Math.min(30_000, 1000 * 2 ** attempts);
}
