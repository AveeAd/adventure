// Recording orchestration (MOBILE_PLAN.md Phase 4): permissions, starting/
// pausing/resuming/stopping the location stream, and wiring fixes into the
// SQLite-backed adaptive filter (store.ts/sampling.ts). UI state lives in
// recorder-context.tsx, which polls this module's session accessors -
// keeping this file framework-agnostic (no React) so recorder-context.tsx
// is the only place that has to know about React.
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';

import { LOCATION_TASK_NAME } from './location-task';
import { syncOutbox } from './outbox';
import {
  appendFixIfWorthKeeping,
  createSession,
  deleteSession,
  finishSession,
  getActiveSessionId,
  getSession,
  resumeSession,
  setSessionStatus,
  type RecordingSession,
} from './store';

export type PermissionResult = 'granted' | 'foreground-only' | 'denied';

// Foreground first, then background (MOBILE_PLAN.md) - requestBackground
// PermissionsAsync is a no-op/rejects on iOS unless foreground was already
// granted, and Android's separate ACCESS_BACKGROUND_LOCATION prompt is only
// meaningful once foreground access exists.
export async function requestPermissions(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return 'denied';
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'granted' : 'foreground-only';
}

// distanceInterval/timeInterval are the OS-level half of the two-layer
// filter described in sampling.ts - they throttle how often the OS even
// wakes JS/the background task, before the adaptive app-level gate runs.
const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000,
  distanceInterval: 8,
};

let foregroundSubscription: Location.LocationSubscription | null = null;

async function startLocationStream(sessionId: string, permission: PermissionResult): Promise<void> {
  if (permission === 'granted') {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (!alreadyRunning) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        ...WATCH_OPTIONS,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Fitness,
        foregroundService: {
          notificationTitle: 'Recording your activity',
          notificationBody: 'Tracking your route in the background.',
        },
      });
    }
    return;
  }
  // foreground-only: the subscription dies when the app backgrounds/is
  // killed - a known, surfaced degradation rather than a silent gap.
  foregroundSubscription?.remove();
  foregroundSubscription = await Location.watchPositionAsync(WATCH_OPTIONS, (loc) => {
    void appendFixIfWorthKeeping(sessionId, {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      ele: loc.coords.altitude,
      t: loc.timestamp,
      accuracy: loc.coords.accuracy,
    });
  });
}

async function stopLocationStream(): Promise<void> {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function startRecording(params: {
  activityTypeId: string;
  adventurePageId?: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
}): Promise<{ sessionId: string; permission: PermissionResult }> {
  const existing = await getActiveSessionId();
  if (existing) {
    throw new Error('A recording is already in progress.');
  }
  const permission = await requestPermissions();
  if (permission === 'denied') {
    throw new Error('Location permission is required to record an activity.');
  }

  const id = Crypto.randomUUID();
  await createSession({
    id,
    activityTypeId: params.activityTypeId,
    adventurePageId: params.adventurePageId,
    visibility: params.visibility,
    startedAt: Date.now(),
  });
  await startLocationStream(id, permission);
  return { sessionId: id, permission };
}

export async function pauseRecording(sessionId: string): Promise<void> {
  await stopLocationStream();
  await setSessionStatus(sessionId, 'paused');
}

export async function resumeRecording(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Recording session not found.');
  const permission = await requestPermissions();
  if (permission === 'denied') {
    throw new Error('Location permission is required to resume recording.');
  }
  await resumeSession(sessionId);
  await startLocationStream(sessionId, permission);
}

export async function stopRecording(sessionId: string, name?: string, notes?: string): Promise<RecordingSession | null> {
  await stopLocationStream();
  await finishSession(sessionId, Date.now(), name, notes);
  void syncOutbox();
  return getSession(sessionId);
}

export async function discardRecording(sessionId: string): Promise<void> {
  await stopLocationStream();
  await deleteSession(sessionId);
}
