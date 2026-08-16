import { Text } from 'react-native';

import { useUserRef } from '@/lib/resources/users';

// Ported from apps/public/src/components/UserRef.tsx. No navigation to a
// user profile screen yet (that route doesn't exist in apps/mobile) - just
// the resolved name, falling back to a truncated id while loading/on error,
// same as web.
export function UserRef({ userId, className }: { userId: string; className?: string }) {
  const { data } = useUserRef(userId);
  return (
    <Text className={className ?? 'text-primary-700 dark:text-primary-400'}>
      {data?.displayName ?? `${userId.slice(0, 8)}…`}
    </Text>
  );
}
