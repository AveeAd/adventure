import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth/auth-context';

export default function Index() {
  const { status, user, signIn, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-primary-950">
        <ActivityIndicator className="text-primary-600 dark:text-primary-300" />
      </SafeAreaView>
    );
  }

  if (status === 'signed-out') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-white px-8 dark:bg-primary-950">
        <Text className="text-center text-3xl font-bold text-primary-900 dark:text-primary-100">
          Adventure
        </Text>
        <Text className="text-center text-base text-primary-700 dark:text-primary-300">
          Sign in to browse trails, spots, and trip reports.
        </Text>
        <Pressable
          onPress={signIn}
          className="rounded-full border-2 border-primary-600 px-6 py-3 active:opacity-70"
        >
          <Text className="text-base font-semibold text-primary-600 dark:text-primary-300">
            Sign in with Google
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-white px-8 dark:bg-primary-950">
      <Text className="text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
        Welcome, {user?.username}
      </Text>
      <Text className="text-center text-base text-primary-700 dark:text-primary-300">
        You&apos;re signed in. Browsing screens are coming in Phase 2.
      </Text>
      <Pressable
        onPress={signOut}
        className="rounded-full border-2 border-accent-500 px-6 py-3 active:opacity-70"
      >
        <Text className="text-base font-semibold text-accent-600 dark:text-accent-400">
          Sign out
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
