import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { GlassSpecular } from '@/components/GlassSpecular';
import { BLUR_METHOD, useBlurTarget, useGlassTokens } from '@/lib/glass';

type Variant = 'primary' | 'accent' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

// Ported from apps/public/src/components/Button.tsx - same outline
// convention (transparent fill, thick colored border, no glow) plus the
// backdrop-blur every variant gets there too, now that expo-blur's
// BlurView gives RN a real blur-behind-content primitive (Card.tsx's own
// comment has the fuller "why now, not before" note).
const VARIANT_CLASSES: Record<Variant, { border: string; text: string }> = {
  primary: { border: 'border-primary-500', text: 'text-primary-700 dark:text-primary-300' },
  accent: { border: 'border-accent-500', text: 'text-accent-700 dark:text-accent-300' },
  secondary: { border: 'border-stone-400', text: 'text-stone-800 dark:text-stone-100' },
  danger: { border: 'border-red-500', text: 'text-red-700 dark:text-red-400' },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2.5',
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  glass = false,
  icon,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  className?: string;
  // Opt-in tinted glass fill on top of the usual blur-behind-transparent
  // fill, mirroring Card's own `glass` prop - most buttons stay the locked
  // flat-outline look, this is for the rare button sitting directly on a
  // glass surface (e.g. sign-in) where a plain blur reads as barely-there.
  glass?: boolean;
  // Optional leading icon (e.g. a provider logo on a sign-in button) -
  // rendered next to the label in a row rather than inside the Text node,
  // since RN's Text can't host arbitrary icon components.
  icon?: ReactNode;
}) {
  const { border, text } = VARIANT_CLASSES[variant];
  const tokens = useGlassTokens();
  const blurTarget = useBlurTarget();
  const shape = glass ? 'rounded-lg' : `rounded-full border-[3px] ${border}`;
  const blurLayer = (
    <>
      <BlurView
        intensity={32}
        tint={tokens.blurTint}
        blurMethod={BLUR_METHOD}
        blurTarget={blurTarget ?? undefined}
        style={StyleSheet.absoluteFill}
      />
      {glass && (
        <LinearGradient
          colors={[tokens.bg3, tokens.bg1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {glass && <GlassSpecular />}
      {glass && <GlassEdgeHighlight />}
    </>
  );
  const label = (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className={`text-sm font-semibold ${text}`}>{children}</Text>
    </View>
  );

  if (glass) {
    // Same reasoning as Card.tsx's glass variant: the drop shadow has to
    // sit on an outer, unclipped container, while the blur/tint layer is
    // clipped to rounded corners on its own inner wrapper - overflow-hidden
    // on the outer element would clip the shadow away along with it.
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className={`items-center justify-center border ${shape} ${SIZE_CLASSES[size]} ${disabled ? 'opacity-50' : 'active:opacity-70'} ${className}`}
        style={[{ borderColor: tokens.border }, tokens.shadowStyle]}
      >
        <View className={`absolute inset-0 overflow-hidden ${shape}`} style={StyleSheet.absoluteFill}>
          {blurLayer}
        </View>
        {label}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center overflow-hidden ${shape} ${SIZE_CLASSES[size]} ${disabled ? 'opacity-50' : 'active:opacity-70'} ${className}`}
    >
      {blurLayer}
      {label}
    </Pressable>
  );
}
