import { ActivityIndicator } from 'react-native';

import { Screen } from './Screen';

// Shared loading view for every query-backed screen - see ErrorState.tsx
// for its counterpart.
export function LoadingState() {
  return (
    <Screen contentContainerClassName="items-center justify-center" scroll={false}>
      <ActivityIndicator className="text-primary-600 dark:text-primary-300" />
    </Screen>
  );
}
