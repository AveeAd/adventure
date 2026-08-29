import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { GlassSpecular } from '@/components/GlassSpecular';
import { BLUR_METHOD, useActiveBlurTarget, useGlassTokens } from '@/lib/glass';

// The floating-pill shape shared by the header (FloatingHeader.tsx), the
// map's locate button (MapLocateButton.tsx), and, in spirit, the tab bar's
// own background - same blur + gradient tint + edge highlight + specular
// recipe as Card's glass variant, just rounded-full and sized to its
// content instead of a fixed card. Pulled out on its own since callers
// need independent pills positioned individually rather than one
// full-width surface.
export function GlassPill({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  // For positioning (e.g. `position: 'absolute'` + a numeric offset pulled
  // from a shared constant) that doesn't make sense as a Tailwind class.
  style?: StyleProp<ViewStyle>;
}) {
  const tokens = useGlassTokens();
  // Blurs whichever screen currently has focus (see glass.ts) - a GlassPill
  // shows up over many different backdrops (header, map, list content), so
  // unlike Card/Button (fixed to their own screen's own GradientMesh) it
  // needs the dynamic "active" target rather than a static one. Falls back
  // to "none" (flat tint, no console warning) until a target has registered.
  const blurTarget = useActiveBlurTarget();
  return (
    // overflow-hidden has to live on an inner wrapper, not this outer view -
    // it would clip tokens.shadowStyle's drop shadow away along with the
    // blur if it sat on the same element (same reasoning as Card/Button's
    // glass variant).
    <View className={`flex-row items-center rounded-full ${className}`} style={[tokens.shadowStyle, style]}>
      <View className="absolute inset-0 overflow-hidden rounded-full" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={70}
          tint={tokens.blurTint}
          blurMethod={blurTarget ? BLUR_METHOD : 'none'}
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
      {children}
    </View>
  );
}
