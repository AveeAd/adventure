// Background location delivery (MOBILE_PLAN.md Phase 4). Must be imported
// once at app startup (see app/_layout.tsx) so `TaskManager.defineTask` runs
// before the OS ever needs to invoke it, including a cold relaunch that
// happens purely to deliver a background location batch.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { appendFixIfWorthKeeping, getActiveSessionId } from './store';

export const LOCATION_TASK_NAME = 'adventure-location-recording';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[recording] background location task error', error.message);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations?.length) return;

  // The task can fire in a fresh JS context after the OS relaunches the app
  // purely to deliver this batch - there's no in-memory "current session"
  // to rely on, hence reading it back from SQLite (see store.ts's
  // recording_meta table) rather than a module-level variable.
  const sessionId = await getActiveSessionId();
  if (!sessionId) return;

  for (const loc of locations) {
    await appendFixIfWorthKeeping(sessionId, {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      ele: loc.coords.altitude,
      t: loc.timestamp,
      accuracy: loc.coords.accuracy,
    });
  }
});
