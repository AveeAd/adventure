import { Text } from 'react-native';

import { Button } from './Button';
import { Screen } from './Screen';

// Shared error view for every query-backed screen. `onRetry` is typically
// a query's own `refetch`.
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Screen contentContainerClassName="items-center justify-center gap-4" scroll={false}>
      <Text className="text-center text-base text-stone-600 dark:text-stone-400">
        {message ?? 'Something went wrong loading this.'}
      </Text>
      {onRetry ? (
        <Button variant="secondary" onPress={onRetry}>
          Try again
        </Button>
      ) : null}
    </Screen>
  );
}
