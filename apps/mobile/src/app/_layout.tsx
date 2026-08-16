import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { queryClient } from '@/lib/query-client';
import { Sentry } from '@/lib/sentry';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();

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
        <Stack.Screen name="adventures/[slug]/index" />
        <Stack.Screen name="adventures/[slug]/map" />
        <Stack.Screen name="adventures/[slug]/trips/[tripReportId]" />
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
