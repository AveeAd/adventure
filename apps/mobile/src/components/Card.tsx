import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { GlassSpecular } from '@/components/GlassSpecular';
import { BLUR_METHOD, useBlurTarget, useGlassTokens } from '@/lib/glass';

// Ported from apps/public/src/components/Card.tsx, `glass` variant
// included now - CLAUDE.md's "Design system" locked glassmorphism as an
// apps/public-only treatment on top of the shared palette, but that's
// being extended to mobile (Card/Button/Screen plus every screen where
// web opts a Card into `glass`: Discover, Guides, club detail, adventure
// detail) rather than kept as a permanent web-only exception. Web's own
// glass Badge variant is hero-photo-specific (see apps/public's Badge.tsx)
// and has no mobile equivalent yet since no mobile screen has a photo-hero
// treatment to sit on top of.
// Web fakes translucency with `backdrop-blur` (CSS); RN has no such thing,
// so this layers expo-blur's BlurView (real native blur of whatever's
// behind it) under a tinted semi-transparent overlay matching web's
// --glass-bg-2 token, same as every glass surface on web uses by default.
export function Card({
  children,
  onPress,
  className = '',
  glass = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  glass?: boolean;
}) {
  const tokens = useGlassTokens();
  const blurTarget = useBlurTarget();

  if (glass) {
    // The blurred/tinted background layer is clipped to the card's rounded
    // corners on its own, inner wrapper rather than on the outer container
    // - overflow-hidden on the outer element would clip the drop shadow
    // below right along with it, and that shadow (mirroring web's
    // --glass-shadow) is what actually reads as "floating glass panel"
    // rather than a plain matte card once it's sitting over GradientMesh's
    // fairly subtle color.
    const background = (
      <View className="absolute inset-0 overflow-hidden rounded-xl" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={45}
          tint={tokens.blurTint}
          blurMethod={BLUR_METHOD}
          blurTarget={blurTarget ?? undefined}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[tokens.bg1, tokens.bg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <GlassSpecular />
        <GlassEdgeHighlight />
      </View>
    );
    const glassSurface = `rounded-xl ${className}`;
    const glassStyle = [tokens.shadowStyle];
    if (onPress) {
      return (
        <Pressable onPress={onPress} className={`${glassSurface} active:opacity-80`} style={glassStyle}>
          {background}
          {children}
        </Pressable>
      );
    }
    return (
      <View className={glassSurface} style={glassStyle}>
        {background}
        {children}
      </View>
    );
  }

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
