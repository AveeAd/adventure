import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useGlassTokens } from '@/lib/glass';

// A soft light-catching glare near the top-left corner, on top of the blur
// + tint + edge hairlines - this is the piece that actually makes a glass
// surface read as *glass* rather than frosted plastic; CSS backdrop-filter
// glass demos get it for free from real light refraction, RN's BlurView
// has no such thing, so it's faked as an SVG radial gradient (same
// technique GradientMesh.tsx already uses for its blob glows). Render last,
// inside a glass surface's clipped background layer.
export function GlassSpecular() {
  const { specularOpacity } = useGlassTokens();
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }} width="100%" height="100%">
      <Defs>
        <RadialGradient id="specular" cx="15%" cy="0%" r="85%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={specularOpacity} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#specular)" />
    </Svg>
  );
}
