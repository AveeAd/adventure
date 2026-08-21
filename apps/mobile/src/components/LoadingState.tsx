import { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Screen } from './Screen';

const LOGO_SIZE = 64;

// Shared loading view for every query-backed screen - shown at exactly the
// moment a screen navigated to is still fetching its own data before it
// can render, which is the same moment a "between screens" transition
// loader would fire - see ErrorState.tsx for its counterpart. The logo
// itself is the loading indicator (a looping breathe: scale + opacity) -
// no separate spinner glyph, so this stays a single recognizable brand
// mark instead of a generic indicator with an icon floating in it.
// react-native-reanimated, not RN's built-in Animated API - this app has
// `experiments.reactCompiler: true` (app.json), and Animated's usual
// useRef(new Animated.Value(...)) + .interpolate() pattern reads a ref's
// .current during render, which the compiler's eslint rule (and the
// compiler itself) flags as unsafe; useSharedValue's return isn't a plain
// ref, so it doesn't hit that rule. Already an installed dependency
// (babel-preset-expo wires up its plugin automatically), just unused
// elsewhere in this app until now.
export function LoadingState() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + pulse.value * 0.2 }],
    opacity: 0.5 + pulse.value * 0.5,
  }));

  return (
    <Screen contentContainerClassName="items-center justify-center" scroll={false}>
      <Animated.View style={style}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>
    </Screen>
  );
}
