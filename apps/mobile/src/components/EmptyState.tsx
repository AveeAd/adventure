import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

// Ported from apps/public/src/components/EmptyState.tsx.
export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <View className="items-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-10 dark:border-stone-700">
      {icon}
      <Text className="text-center text-sm text-stone-500 dark:text-stone-400">{children}</Text>
    </View>
  );
}
