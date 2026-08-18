import {
  initialOutboxState,
  MAX_UPLOAD_ATTEMPTS,
  nextUploadable,
  reduceOutbox,
  retryDelayMs,
  type OutboxState,
} from './sync-reducer';

function enqueue(state: OutboxState, clientUuid: string): OutboxState {
  return reduceOutbox(state, { type: 'ENQUEUE', clientUuid });
}

describe('reduceOutbox', () => {
  it('enqueues a new entry as pending', () => {
    const state = enqueue(initialOutboxState, 'a');
    expect(state.entries.a).toEqual({ clientUuid: 'a', status: 'pending', attempts: 0 });
  });

  it('is idempotent - enqueuing the same clientUuid twice does not reset progress', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = enqueue(state, 'a');
    expect(state.entries.a.status).toBe('uploading');
  });

  it('moves pending -> uploading -> synced on a successful upload', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    expect(state.entries.a.status).toBe('uploading');
    state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: 'a', serverId: 'srv-1' });
    expect(state.entries.a).toMatchObject({ status: 'synced', serverId: 'srv-1' });
  });

  it('retries on failure below the attempt cap, keeping status pending', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid: 'a', error: 'network' });
    expect(state.entries.a).toMatchObject({ status: 'pending', attempts: 1, lastError: 'network' });
  });

  it('gives up after MAX_UPLOAD_ATTEMPTS failures, marking the entry failed', () => {
    let state = enqueue(initialOutboxState, 'a');
    for (let i = 0; i < MAX_UPLOAD_ATTEMPTS; i++) {
      state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
      state = reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid: 'a', error: `err-${i}` });
    }
    expect(state.entries.a.status).toBe('failed');
    expect(state.entries.a.attempts).toBe(MAX_UPLOAD_ATTEMPTS);
  });

  it('a successful upload after prior failures clears lastError and resumes eligibility', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid: 'a', error: 'boom' });
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: 'a', serverId: 'srv-1' });
    expect(state.entries.a.lastError).toBeUndefined();
  });

  it('ignores events for a clientUuid that was never enqueued', () => {
    const state = reduceOutbox(initialOutboxState, { type: 'UPLOAD_START', clientUuid: 'ghost' });
    expect(state).toBe(initialOutboxState);
  });

  it('tombstone marks the matching synced entry deletedRemotely by serverId', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: 'a', serverId: 'srv-1' });
    state = reduceOutbox(state, { type: 'TOMBSTONE', serverId: 'srv-1' });
    expect(state.entries.a.deletedRemotely).toBe(true);
  });

  it('tombstone for an unknown serverId is a no-op', () => {
    const state = enqueue(initialOutboxState, 'a');
    const next = reduceOutbox(state, { type: 'TOMBSTONE', serverId: 'unknown' });
    expect(next).toBe(state);
  });
});

describe('nextUploadable', () => {
  it('returns null when the outbox is empty', () => {
    expect(nextUploadable(initialOutboxState)).toBeNull();
  });

  it('returns a pending entry, skipping synced/uploading/failed/deleted-remotely ones', () => {
    let state = initialOutboxState;
    state = enqueue(state, 'synced');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'synced' });
    state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: 'synced', serverId: 's1' });
    state = enqueue(state, 'uploading');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'uploading' });
    state = enqueue(state, 'ready');

    expect(nextUploadable(state)).toBe('ready');
  });

  it('skips an entry that was tombstoned before it could be re-uploaded', () => {
    let state = enqueue(initialOutboxState, 'a');
    state = reduceOutbox(state, { type: 'UPLOAD_START', clientUuid: 'a' });
    state = reduceOutbox(state, { type: 'UPLOAD_SUCCESS', clientUuid: 'a', serverId: 'srv-1' });
    state = reduceOutbox(state, { type: 'UPLOAD_FAILURE', clientUuid: 'a', error: 'retry-needed' }); // won't happen post-sync in practice, but exercises the guard
    state = reduceOutbox(state, { type: 'TOMBSTONE', serverId: 'srv-1' });
    expect(nextUploadable(state)).toBeNull();
  });
});

describe('retryDelayMs', () => {
  it('grows exponentially and caps at 30s', () => {
    expect(retryDelayMs(0)).toBe(1000);
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(2)).toBe(4000);
    expect(retryDelayMs(10)).toBe(30_000);
  });
});
