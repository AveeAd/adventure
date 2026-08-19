import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
// Registers the foreground notification handler + Android channel (Phase 6)
// - same "register before the OS can need it" convention as location-task.ts
// below.
import '@/lib/notifications/handler';
import { useNotificationTapHandler, usePushRegistration } from '@/lib/notifications/push';
import { queryClient } from '@/lib/query-client';
// Registers the background location TaskManager task (MOBILE_PLAN.md Phase
// 4) - must be imported at module scope somewhere the app always loads, so
// `TaskManager.defineTask` has run before the OS can invoke it, including a
// cold relaunch purely to deliver a background location batch.
import '@/lib/recording/location-task';
import { Sentry } from '@/lib/sentry';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  usePushRegistration();
  useNotificationTapHandler();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  // Splash screen stays up (see preventAutoHideAsync above) until the
  // cold-start session check resolves - nothing to render underneath it.
  if (status === 'loading') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signed-in'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="adventures/new" />
        <Stack.Screen name="adventures/[slug]/index" />
        <Stack.Screen name="adventures/[slug]/edit" />
        <Stack.Screen name="adventures/[slug]/map" />
        <Stack.Screen name="adventures/[slug]/trips/[tripReportId]" />
        <Stack.Screen name="adventures/[slug]/trips/new" />
        <Stack.Screen name="adventures/[slug]/trails/new" />
        <Stack.Screen name="adventures/[slug]/spots/new" />
        <Stack.Screen name="tracks/index" />
        <Stack.Screen name="tracks/new" />
        <Stack.Screen name="tracks/record" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signed-in'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
