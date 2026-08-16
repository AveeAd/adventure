import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Every route wraps its content in this - same role as apps/public's
// Container.tsx (consistent max width/padding), plus the SafeAreaView every
// RN screen needs. `scroll` defaults on since most Phase 2 screens are
// content lists/detail pages; pass false for screens that manage their own
// scrolling (e.g. a FlatList-based list screen). `contentContainerClassName`
// only applies when `scroll` is true - it styles the scrollable content
// (e.g. gap/padding), while `className` styles the outer container.
export function Screen({
  children,
  scroll = true,
  className = '',
  contentContainerClassName = 'px-4 py-4',
}: {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentContainerClassName?: string;
}) {
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-primary-950">
        <View className={`flex-1 ${contentContainerClassName} ${className}`}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-primary-950">
      <ScrollView className={`flex-1 ${className}`} contentContainerClassName={contentContainerClassName}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
