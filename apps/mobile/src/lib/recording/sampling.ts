// Adaptive distance-filtered sampling for GPS recording (MOBILE_PLAN.md
// Phase 4: "sampling must be distance-filtered and adaptive, not
// time-based — naive 1 Hz GPS drains a phone in ~5 hours"). Two layers:
// `expo-location`'s own `distanceInterval`/`timeInterval` options throttle
// fixes at the OS level (see recorder.ts), and `shouldKeepFix` below is a
// second, app-level gate deciding whether an incoming fix is worth
// persisting at all, using a threshold that widens/narrows with the
// implied speed between fixes.
//
// Pure functions only - no SQLite/Location imports - so this is testable
// without device/native mocks.

export interface RawFix {
  lat: number;
  lng: number;
  ele?: number | null;
  t: number; // ms epoch
  accuracy?: number | null; // meters, from Location.LocationObject
}

export interface KeptPoint {
  lat: number;
  lng: number;
  ele?: number;
  t: number;
}

// Fixes worse than this are noise (indoor/urban-canyon multipath, cold GPS
// lock) - reject outright rather than let them corrupt the distance filter.
export const MIN_ACCURACY_METERS = 30;

const STATIONARY_SPEED_MPS = 0.3; // ~1 km/h - below this, treat as "not moving"
const FAST_SPEED_MPS = 3; // ~11 km/h - above this, treat as "moving fast" (descending/running)

const THRESHOLD_STATIONARY_M = 15; // wide gate at rest, rejects GPS drift jitter
const THRESHOLD_WALK_M = 8;
const THRESHOLD_FAST_M = 20; // fewer points per meter when covering ground quickly

// A heartbeat point still gets recorded at this cadence even while
// stationary and under threshold, so a paused-in-place track (lunch break,
// viewpoint) doesn't look like recording silently died - but bounded, not
// 1 Hz.
export const MAX_KEEP_INTERVAL_MS = 120_000;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function thresholdForSpeed(speedMps: number): number {
  if (speedMps < STATIONARY_SPEED_MPS) return THRESHOLD_STATIONARY_M;
  if (speedMps > FAST_SPEED_MPS) return THRESHOLD_FAST_M;
  return THRESHOLD_WALK_M;
}

// Decides whether `fix` should become a new kept point given the last one
// kept for this session (null if this is the first fix).
export function shouldKeepFix(fix: RawFix, lastKept: KeptPoint | null): boolean {
  if (fix.accuracy != null && fix.accuracy > MIN_ACCURACY_METERS) {
    return false;
  }
  if (!lastKept) {
    return true;
  }
  const dtMs = fix.t - lastKept.t;
  if (dtMs <= 0) {
    return false; // out-of-order or duplicate fix
  }
  const dist = haversineMeters(lastKept, fix);
  const speedMps = dist / (dtMs / 1000);
  const threshold = thresholdForSpeed(speedMps);
  if (dist >= threshold) {
    return true;
  }
  return dtMs >= MAX_KEEP_INTERVAL_MS;
}

export function toKeptPoint(fix: RawFix): KeptPoint {
  return { lat: fix.lat, lng: fix.lng, ele: fix.ele ?? undefined, t: fix.t };
}
