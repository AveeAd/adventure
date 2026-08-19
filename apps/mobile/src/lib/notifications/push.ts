import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';
import { useRegisterDeviceToken, useUnregisterDeviceToken } from '@/lib/resources/device-tokens';

// In memory only, mirrors auth/token-store.ts - the backend is the source
// of truth for which tokens are registered; this just remembers what to
// unregister on sign-out.
let lastRegisteredToken: string | null = null;

// Push is additive - every failure here logs and returns null rather than
// throwing, so a missing EAS project id or a denied permission never blocks
// sign-in or any other flow.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] no push tokens on simulators/most emulators');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('[push] no EAS project id configured (run `eas init`) - push registration skipped');
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('[push] failed to get Expo push token', err);
    return null;
  }
}

// Registers on sign-in (fresh login and cold-start session restore both
// resolve to status === 'signed-in') and unregisters on sign-out. Lives
// outside AuthProvider itself so push stays a plug-in concern rather than
// something auth-context needs to know about.
export function usePushRegistration() {
  const { status } = useAuth();
  const registerToken = useRegisterDeviceToken();
  const unregisterToken = useUnregisterDeviceToken();
  const previousStatus = useRef(status);

  useEffect(() => {
    if (status === 'signed-in') {
      registerForPushNotificationsAsync().then((token) => {
        if (!token) return;
        lastRegisteredToken = token;
        registerToken.mutate({ token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' });
      });
    }

    if (previousStatus.current === 'signed-in' && status === 'signed-out' && lastRegisteredToken) {
      unregisterToken.mutate(lastRegisteredToken);
      lastRegisteredToken = null;
    }

    previousStatus.current = status;
    // registerToken/unregisterToken are stable useMutation objects; including
    // them would re-fire this effect on every mutation state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
}

// Tap-to-navigate: backend linkUrl values are web-relative paths (e.g.
// `/adventures/${slug}/trips/${id}`) that, per Phase 2/5, mirror Expo
// Router's file-based paths in the common cases - passed straight to
// router.push with no translation table. An unmapped path is a follow-up
// fix, not something worth guarding against speculatively here.
export function useNotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const linkUrl = response.notification.request.content.data?.linkUrl as string | undefined;
      if (linkUrl) {
        router.push(linkUrl as never);
      }
    });
    return () => subscription.remove();
  }, [router]);
}
