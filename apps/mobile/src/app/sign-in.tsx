import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/auth-context';

export default function SignIn() {
  const { signIn } = useAuth();

  return (
    <Screen contentContainerClassName="items-center justify-center gap-6 px-8" scroll={false}>
      <Text className="text-center text-3xl font-bold text-primary-900 dark:text-primary-100">
        Adventure
      </Text>
      <Text className="text-center text-base text-primary-700 dark:text-primary-300">
        Sign in to browse trails, spots, and trip reports.
      </Text>
      <Button onPress={signIn}>Sign in with Google</Button>
    </Screen>
  );
}
