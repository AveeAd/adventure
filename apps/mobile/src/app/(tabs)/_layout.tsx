import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FloatingHeader } from '@/components/FloatingHeader';
import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { RecordFAB } from '@/components/RecordFAB';
import { GLYPH_SHADOW, useGlassTokens } from '@/lib/glass';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '@/lib/tab-bar';

// Ionicons ships an "-outline" (thin stroke) and a filled/solid variant of
// most glyphs - swapping to the filled one on focus is the actual lever
// for "thicker stroke" on an icon font (there's no variable stroke-width
// API), same trick apps/public's own nav uses with filled vs. outline
// lucide icons for the active route. GLYPH_SHADOW (glass.ts) adds the
// white glow that makes either variant hold up against GradientMesh.
function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: string;
  focused: boolean;
  color: ColorValue;
  size: number;
}) {
  return (
    <Ionicons
      name={focused ? (name as never) : (`${name}-outline` as never)}
      color={color}
      size={size}
      style={GLYPH_SHADOW}
    />
  );
}

function TabLabel({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: ColorValue;
  children: string;
}) {
  return (
    <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500', marginTop: 2, ...GLYPH_SHADOW }}>
      {children}
    </Text>
  );
}

// Bottom-tab shell for the three primary browse destinations - see
// MOBILE_PLAN.md Phase 2. Guides and Account moved to FloatingHeader's
// right-hand pill (matching apps/public's own header, which separates
// "browse" nav from account/utility actions the same way) - they're still
// real routes under this group (still reachable, e.g. from a deep link),
// just no longer their own tab bar button. Adventure/trip-report detail
// screens live outside this group (app/adventures/...) since they're
// reached from Discover's list/search, not their own tab. Map is
// first/default: it needs no session and no async data beyond the one
// bbox fetch, so it's the cheapest, most "just open the app and see
// something" tab to land on.
const RADIUS = TAB_BAR_HEIGHT / 2;

export default function TabsLayout() {
  const { t } = useTranslation('common');
  const tokens = useGlassTokens();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // "index" is the Map tab's route (see the comment above) - matches '/'
  // exactly, not startsWith, so it doesn't also catch nested routes.
  const isMapTab = pathname === '/';

  return (
    <>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.iconActive,
        tabBarInactiveTintColor: tokens.iconInactive,
        // A floating glass pill (matches apps/public's floating header
        // pills, see CLAUDE.md "Design system") rather than a bar docked to
        // the screen edge - position: 'absolute' takes it out of layout
        // flow, so every scrollable tab screen adds its own bottom padding
        // via TAB_BAR_CLEARANCE (lib/tab-bar.ts) to keep content from
        // rendering underneath it. The Map tab is the deliberate exception:
        // full-bleed under a floating pill is the point there, same as
        // Apple/Google Maps' own floating bottom controls.
        // marginHorizontal/marginBottom, not left/right/bottom: the
        // library's own default tab bar style sets `width: '100%'`, which
        // wins over an explicit left+right offset (RN's box model ignores
        // `right` once `width` is set) - the bar rendered edge-to-edge
        // despite left/right: TAB_BAR_MARGIN for exactly that reason.
        // Margin shrinks the box within its own width instead of fighting it.
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: TAB_BAR_MARGIN,
          marginBottom: insets.bottom + TAB_BAR_MARGIN,
          height: TAB_BAR_HEIGHT,
          borderRadius: RADIUS,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: 'transparent',
          paddingHorizontal: 12,
          ...tokens.shadowStyle,
        },
        tabBarItemStyle: { paddingTop: 6, paddingBottom: 4, marginHorizontal: 4 },
        tabBarBackground: () => (
          <View style={{ flex: 1, borderRadius: RADIUS, overflow: 'hidden' }}>
            {/* blurMethod="none", not BLUR_METHOD: this pill floats over
                whatever a screen last scrolled under it, not a single fixed
                backdrop the way Card/Button sit over their own screen's
                GradientMesh (see glass.ts's BlurTargetContext note), so
                there's no blurTarget to give dimezisBlurView - passing it
                anyway just gets the same flat-tint fallback with a console
                warning on every render. Explicit "none" opts into that
                fallback silently instead. */}
            <BlurView intensity={70} tint={tokens.blurTint} blurMethod="none" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[tokens.bg1, tokens.bg2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <GlassEdgeHighlight />
          </View>
        ),
      }}
    >
      {/* "index" is Map now, not Discover - Expo Router treats the literal
          index.tsx file as a group's default route regardless of any
          initialRouteName prop, so the files were swapped (see the mv in
          git history) rather than relying on that prop, which didn't
          actually override it. */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="map" focused={focused} color={color} size={size} />,
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>
              {children}
            </TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="compass" focused={focused} color={color} size={size} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>
              {children}
            </TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: t('tabs.clubs'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="chatbubbles" focused={focused} color={color} size={size} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>
              {children}
            </TabLabel>
          ),
        }}
      />
      {/* Reached from FloatingHeader's right-hand pill now, not a tab bar
          button - href: null keeps the route mounted under this group
          (Tabs.Protected/router.push('/guides') etc. still work) without
          Expo Router auto-registering it as its own tab. */}
      <Tabs.Screen name="guides" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      {/* Nested routes reached by navigating from the Clubs/Guides tabs
          (not their own destinations) - without an explicit href: null
          entry here, Expo Router auto-registers every matched file under
          (tabs) as its own tab bar button, which is what was producing the
          extra "clubs...", "guide..." tabs. */}
      <Tabs.Screen name="clubs/[clubId]/index" options={{ href: null }} />
      <Tabs.Screen name="clubs/[clubId]/join-requests" options={{ href: null }} />
      <Tabs.Screen name="clubs/[clubId]/threads/new" options={{ href: null }} />
      <Tabs.Screen name="clubs/[clubId]/threads/[threadId]" options={{ href: null }} />
      <Tabs.Screen name="guides/[id]" options={{ href: null }} />
      </Tabs>
      <FloatingHeader />
      {isMapTab ? <RecordFAB /> : null}
    </>
  );
}
