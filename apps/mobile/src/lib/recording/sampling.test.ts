import { MAX_KEEP_INTERVAL_MS, shouldKeepFix, thresholdForSpeed, toKeptPoint } from './sampling';

const BASE = { lat: 27.7, lng: 85.3, t: 0 };

describe('shouldKeepFix', () => {
  it('always keeps the first fix of a session', () => {
    expect(shouldKeepFix({ ...BASE }, null)).toBe(true);
  });

  it('rejects a fix with poor accuracy even as the first point', () => {
    expect(shouldKeepFix({ ...BASE, accuracy: 80 }, null)).toBe(false);
  });

  it('drops a fix that moved less than the walking threshold within a second', () => {
    const last = toKeptPoint(BASE);
    // ~0.00003 deg lat ~= 3m at this latitude
    const fix = { lat: BASE.lat + 0.00003, lng: BASE.lng, t: 1000 };
    expect(shouldKeepFix(fix, last)).toBe(false);
  });

  it('keeps a fix once it clears the walking threshold', () => {
    const last = toKeptPoint(BASE);
    // ~0.0001 deg lat ~= 11m
    const fix = { lat: BASE.lat + 0.0001, lng: BASE.lng, t: 5000 };
    expect(shouldKeepFix(fix, last)).toBe(true);
  });

  it('uses a wider gate when nearly stationary, rejecting GPS drift jitter', () => {
    const last = toKeptPoint(BASE);
    // ~9m over 60s => 0.15 m/s, well under the stationary speed cutoff
    const fix = { lat: BASE.lat + 0.00008, lng: BASE.lng, t: 60_000 };
    expect(shouldKeepFix(fix, last)).toBe(false);
  });

  it('keeps a heartbeat point after MAX_KEEP_INTERVAL_MS even with no movement', () => {
    const last = toKeptPoint(BASE);
    const fix = { lat: BASE.lat, lng: BASE.lng, t: MAX_KEEP_INTERVAL_MS + 1 };
    expect(shouldKeepFix(fix, last)).toBe(true);
  });

  it('rejects an out-of-order or duplicate-timestamp fix', () => {
    const last = toKeptPoint({ ...BASE, t: 10_000 });
    const fix = { lat: BASE.lat + 0.001, lng: BASE.lng, t: 5000 };
    expect(shouldKeepFix(fix, last)).toBe(false);
  });
});

describe('thresholdForSpeed', () => {
  it('widens at rest and tightens at a normal walking pace, then widens again when moving fast', () => {
    const stationary = thresholdForSpeed(0.1);
    const walking = thresholdForSpeed(1.2);
    const fast = thresholdForSpeed(4);
    expect(walking).toBeLessThan(stationary);
    expect(walking).toBeLessThan(fast);
  });
});
