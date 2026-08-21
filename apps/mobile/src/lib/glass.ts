import { createContext, useContext, type RefObject } from 'react';
import { useColorScheme, type View } from 'react-native';

// Mirrors apps/public/src/styles.css's --glass-bg-1/2/3 + --glass-border
// tokens exactly (same rgba values), so a glass surface reads the same on
// mobile as it does on web. RN has no CSS custom properties, so this is a
// plain lookup keyed by color scheme instead of a `prefers-color-scheme`
// media query - `useColorScheme()` is the RN equivalent, and the app
// already goes OS-driven-only everywhere else (no manual toggle), so this
// stays consistent with that.
// shadowColor/shadowOpacity mirror web's --glass-shadow (light:
// rgba(28,63,48,0.2), dark: rgba(0,0,0,0.55)) - RN's shadow* props don't
// take an rgba string, so the color and alpha are split.
const LIGHT = {
  bg1: 'rgba(255, 255, 255, 0.14)',
  bg2: 'rgba(255, 255, 255, 0.1)',
  bg3: 'rgba(255, 255, 255, 0.2)',
  border: 'rgba(35, 79, 59, 0.14)',
  shadowColor: '#1c3f30',
  shadowOpacity: 0.2,
  // The top/left light-catching hairlines a CSS glass card gets for free
  // from `::before`/`::after` gradient lines - RN has no pseudo-elements,
  // so GlassEdgeHighlight (glass.tsx) paints them as two 1px
  // LinearGradients instead. Bright-to-transparent, brightest at the
  // top-left corner where the light source reads as coming from.
  edgeTop: ['transparent', 'rgba(255, 255, 255, 0.85)', 'transparent'] as const,
  edgeLeft: ['rgba(255, 255, 255, 0.85)', 'transparent', 'rgba(255, 255, 255, 0.35)'] as const,
  // A soft light-catching glare in the top-left corner - real glass (and
  // CSS backdrop-filter surfaces) pick up a specular highlight from
  // whatever's lighting the scene; a flat tint + hairline border alone
  // reads as frosted plastic rather than glass without one. GlassSpecular
  // paints this as an SVG radial gradient (see GlassSpecular.tsx).
  specularOpacity: 0.55,
  // Icon/label tints for glass surfaces (tab bar, header) - deliberately
  // higher-contrast than the brand palette's mid tones (e.g. primary-400
  // '#5c9a76'), which read as too washed-out sitting directly on a
  // translucent, textured background rather than a solid card surface.
  // primary-900/primary-600.
  iconActive: '#163024',
  iconInactive: '#2f6b4f',
};

const DARK = {
  bg1: 'rgba(28, 25, 23, 0.14)',
  bg2: 'rgba(28, 25, 23, 0.1)',
  bg3: 'rgba(28, 25, 23, 0.2)',
  border: 'rgba(255, 255, 255, 0.08)',
  shadowColor: '#000000',
  shadowOpacity: 0.55,
  edgeTop: ['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent'] as const,
  edgeLeft: ['rgba(255, 255, 255, 0.3)', 'transparent', 'rgba(255, 255, 255, 0.1)'] as const,
  specularOpacity: 0.2,
  // primary-50/primary-300 - near-white active vs. a still-legible mid
  // green for inactive, both far higher contrast against dark glass than
  // the previous shared '#8ebe9d'/'#2f6b4f' pair (which was tuned for a
  // light background only and read as muddy in dark mode).
  iconActive: '#f1f7f3',
  iconInactive: '#8ebe9d',
};

// A white glow behind icon/label glyphs floating over GradientMesh (tab
// bar, header) - Ionicons and RN Text both render as a font glyph, so
// textShadow* works on either. tokens.iconActive/iconInactive already
// have real contrast against a solid surface, but GradientMesh's wash is
// variable and textured, so even a dark glyph can lose its edge against a
// similarly dark patch of it; the halo keeps a consistent edge regardless
// of what's directly behind it at that moment. Same value in both themes
// on purpose - it's an edge/rim effect, not a tint, so it doesn't need to
// invert for dark mode.
export const GLYPH_SHADOW = {
  textShadowColor: 'rgba(255, 255, 255, 0.9)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 4,
} as const;

// expo-blur's default Android BlurView implementation (RenderEffect-based)
// frequently renders no visible blur at all inside scroll views/lists -
// a known expo-blur limitation, not something specific to this app. The
// community-backed 'dimezisBlurView' method (github.com/Dimezis/BlurView)
// is what actually produces real blur on Android; iOS's native blur
// materials work fine without it. Passed on every BlurView in the app so
// there's one place to change if a better method ships later.
export const BLUR_METHOD = 'dimezisBlurView' as const;

// Android's dimezisBlurView method (see BLUR_METHOD above) needs an
// explicit `blurTarget` ref to a BlurTargetView wrapping whatever should
// be blurred - without it, expo-blur just warns and silently falls back
// to a flat tint. Screen.tsx is the one place that mounts a
// BlurTargetView (around GradientMesh, its only real blur backdrop -
// scrolled list content never sits behind another glass surface in a
// vertical list, so there's nothing else worth targeting); every glass
// surface rendered inside that screen (Card, Button, the search bar)
// reads the ref back out through this context instead of each needing
// its own target plumbed through props.
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

export function useGlassTokens() {
  const scheme = useColorScheme();
  const tokens = scheme === 'dark' ? DARK : LIGHT;
  return {
    ...tokens,
    // expo-blur's BlurView tint - 'dark'/'light' select its own internal
    // blur material, independent of (but matched to) the tint color above.
    blurTint: scheme === 'dark' ? ('dark' as const) : ('light' as const),
    // Web's glass surfaces get `box-shadow: var(--glass-highlight),
    // var(--glass-shadow)` (styles.css) - a real drop shadow is what
    // actually reads as "floating glass panel" rather than a plain matte
    // card, especially wherever GradientMesh itself is faint behind it
    // (blur alone isn't enough of a visual cue on a light background).
    // `elevation` is Android's equivalent of the iOS shadow* props below.
    shadowStyle: {
      shadowColor: tokens.shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: tokens.shadowOpacity,
      shadowRadius: 24,
      elevation: 10,
    },
  };
}
