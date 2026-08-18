import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/auth-context';

export default function Account() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <Screen contentContainerClassName="items-center justify-center gap-6" scroll={false}>
      <Text className="text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
        {user?.username}
      </Text>
      <Button variant="primary" onPress={() => router.push('/tracks')}>
        Activity Tracks
      </Button>
      <Button variant="accent" onPress={signOut}>
        Sign out
      </Button>
    </Screen>
  );
}
