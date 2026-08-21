import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { GlassSpecular } from '@/components/GlassSpecular';
import { useGlassTokens } from '@/lib/glass';

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
  return (
    // overflow-hidden has to live on an inner wrapper, not this outer view -
    // it would clip tokens.shadowStyle's drop shadow away along with the
    // blur if it sat on the same element (same reasoning as Card/Button's
    // glass variant).
    <View className={`flex-row items-center rounded-full ${className}`} style={[tokens.shadowStyle, style]}>
      <View className="absolute inset-0 overflow-hidden rounded-full" style={StyleSheet.absoluteFill}>
        {/* blurMethod="none": this pill floats over the header overlay,
            not a single fixed backdrop with a BlurTargetView to reference
            (see (tabs)/_layout.tsx's tab bar background for the same
            reasoning) - passing BLUR_METHOD here would just warn and fall
            back to this same flat tint anyway. */}
        <BlurView intensity={70} tint={tokens.blurTint} blurMethod="none" style={StyleSheet.absoluteFill} />
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
