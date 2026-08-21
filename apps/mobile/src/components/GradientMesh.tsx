import { StyleSheet, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

// RN port of apps/public/src/components/GradientMesh.tsx, since extended
// past a 1:1 port: the web version leans on a near-white/near-black base
// (bg-stone-50/950 in Screen.tsx) with a few faint blobs for texture, which
// read as flat rather than "gradient" once ported to a plain SVG on a flat
// base - this version adds a genuine diagonal LinearGradient wash (primary
// palette, pine-green-dominant) as the base layer underneath the same blob
// glows, so the background itself is the gradient rather than just a hint
// of color at fixed points. Blob1 (green) and blob3 (sage) got bigger/
// brighter to lean into that; blob2 (terracotta) stays as a small accent
// rather than a competing focal color. Purely decorative, pointerEvents
//="none" so it never intercepts touches. Dark-mode values mirror web's own
// dark: overrides rather than reusing the light ones, same OS-driven-only
// convention as everywhere else in this app.
export function GradientMesh() {
  const dark = useColorScheme() === 'dark';
  const blob1Opacity = dark ? 0.45 : 0.65;
  const blob2Opacity = dark ? 0.1 : 0.22;
  const blob3Opacity = dark ? 0.3 : 0.55;
  const topoOpacity = dark ? 0.6 : 1; // multiplier applied to each path's own strokeOpacity below
  const topoColor = dark ? '#5c9a76' : '#2f6b4f';
  const washColors = dark
    ? (['#0d1f17', '#1c3f30', '#234f3b'] as const)
    : (['#b9d7c3', '#dcebe1', '#f1f7f3'] as const);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={washColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="blob1" cx="15%" cy="8%" r="65%">
            <Stop offset="0%" stopColor="#3d7d5b" stopOpacity={blob1Opacity} />
            <Stop offset="100%" stopColor="#3d7d5b" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="blob2" cx="88%" cy="12%" r="45%">
            <Stop offset="0%" stopColor="#dd7c4f" stopOpacity={blob2Opacity} />
            <Stop offset="100%" stopColor="#dd7c4f" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="blob3" cx="30%" cy="65%" r="60%">
            <Stop offset="0%" stopColor="#5c9a76" stopOpacity={blob3Opacity} />
            <Stop offset="100%" stopColor="#5c9a76" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="60" cy="60" r="260" fill="url(#blob1)" />
        <Circle cx="352" cy="96" r="190" fill="url(#blob2)" />
        <Circle cx="120" cy="520" r="260" fill="url(#blob3)" />
        <Path
          d="M-20 220 C 120 180, 220 250, 340 215 S 560 170, 680 220 S 860 260, 900 230"
          stroke={topoColor}
          strokeOpacity={0.14 * topoOpacity}
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M-20 300 C 100 340, 240 250, 360 295 S 540 350, 660 300 S 840 250, 900 290"
          stroke={topoColor}
          strokeOpacity={0.11 * topoOpacity}
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M-20 620 C 130 580, 270 650, 410 615 S 610 570, 730 620 S 860 660, 900 620"
          stroke={topoColor}
          strokeOpacity={0.09 * topoOpacity}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    </View>
  );
}
