import type { ReactElement, ReactNode } from 'react';
import { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type View as RNView,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';

import { BlurTargetContext } from '@/lib/glass';
import { GradientMesh } from './GradientMesh';

// Every route wraps its content in this - same role as apps/public's
// Container.tsx (consistent max width/padding), plus the SafeAreaView every
// RN screen needs. `scroll` defaults on since most Phase 2 screens are
// content lists/detail pages; pass false for screens that manage their own
// scrolling (e.g. a FlatList-based list screen). `contentContainerClassName`/
// `contentContainerStyle` style the content area either way (a plain View
// when `scroll` is false, the ScrollView's content container when true),
// while `className` styles the outer SafeAreaView.
//
// GradientMesh + the stone-50/950 base render unconditionally on every
// screen now, matching apps/public's own setup where GradientMesh is a
// single global layer behind the entire site, not a per-page opt-in - see
// apps/public/src/routes/__root.tsx. It's mounted per-Screen instance
// rather than once at the navigator root: React Navigation's native-stack
// screens are opaque by default, and making every screen's own background
// genuinely transparent so a single shared root-level layer shows through
// is a known source of white-flash/Android quirks - a cheap per-screen SVG
// mount avoids that fragility for a purely decorative element.
export function Screen({
  children,
  scroll = true,
  className = '',
  contentContainerClassName = 'px-4 py-4',
  contentContainerStyle,
  edges,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentContainerClassName?: string;
  // Only applies when `scroll` is true - for style values (e.g. a numeric
  // paddingBottom pulled from a shared constant like TAB_BAR_CLEARANCE)
  // that don't make sense as a Tailwind class.
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Forwarded to SafeAreaView - omit 'top' for a screen whose own first
  // element (e.g. a full-bleed hero image) should bleed under the status
  // bar instead of starting below it, same as apps/public's own hero
  // sitting under its header via a negative margin. Defaults to every
  // edge, matching SafeAreaView's own default.
  edges?: Edge[];
  // Only applies when `scroll` is true - a <RefreshControl /> element,
  // forwarded straight to the ScrollView (a FlatList-based screen sets
  // this on its own FlatList instead, since it doesn't render inside a
  // Screen ScrollView at all - see (tabs)/discover.tsx or clubs/index.tsx).
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const targetRef = useRef<RNView>(null);

  if (!scroll) {
    return (
      <SafeAreaView edges={edges} className="flex-1 bg-stone-50 dark:bg-stone-950">
        <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
          <GradientMesh />
        </BlurTargetView>
        <BlurTargetContext.Provider value={targetRef}>
          <View className={`flex-1 ${contentContainerClassName} ${className}`} style={contentContainerStyle}>
            {children}
          </View>
        </BlurTargetContext.Provider>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-stone-50 dark:bg-stone-950">
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
        <GradientMesh />
      </BlurTargetView>
      <BlurTargetContext.Provider value={targetRef}>
        <ScrollView
          className={`flex-1 ${className}`}
          contentContainerClassName={contentContainerClassName}
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </BlurTargetContext.Provider>
    </SafeAreaView>
  );
}
