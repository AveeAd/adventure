import * as Sentry from '@sentry/react-native';

// No-op without a DSN so local dev (no EXPO_PUBLIC_SENTRY_DSN set) doesn't
// need a Sentry project to run. Wired up from Phase 1 per MOBILE_PLAN.md so
// every later phase reports crashes from day one.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}

export { Sentry };
