import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/auth-context';

export default function Account() {
  const { user, signOut } = useAuth();

  return (
    <Screen contentContainerClassName="items-center justify-center gap-6" scroll={false}>
      <Text className="text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
        {user?.username}
      </Text>
      <Button variant="accent" onPress={signOut}>
        Sign out
      </Button>
    </Screen>
  );
}
