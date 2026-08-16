import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

// Ported from apps/public/src/components/Card.tsx, minus the `glass`
// variant - glassmorphism is an apps/public-only surface treatment
// (CLAUDE.md "Design system"); apps/mobile follows the apps/admin
// precedent instead: same palette, solid surfaces.
export function Card({
  children,
  onPress,
  className = '',
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  const surface =
    'rounded-xl border border-stone-200 bg-white shadow-sm dark:border-primary-800 dark:bg-primary-900';
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${surface} ${className} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={`${surface} ${className}`}>{children}</View>;
}
