import { LinearGradient } from 'expo-linear-gradient';

import { useGlassTokens } from '@/lib/glass';

// The top/left light-catching hairlines a CSS glass card gets for free from
// `::before`/`::after` gradient lines (see the reference glassmorphism CSS
// this was ported from) - RN has no pseudo-elements, so this paints the
// same two 1px gradients as real LinearGradient views instead. Render
// inside a glass surface's clipped background layer, after the blur/tint.
export function GlassEdgeHighlight() {
  const { edgeTop, edgeLeft } = useGlassTokens();
  return (
    <>
      <LinearGradient
        colors={edgeTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
      />
      <LinearGradient
        colors={edgeLeft}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1 }}
      />
    </>
  );
}
