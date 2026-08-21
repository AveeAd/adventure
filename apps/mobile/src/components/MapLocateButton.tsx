import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPill } from '@/components/GlassPill';
import { GLYPH_SHADOW, useGlassTokens } from '@/lib/glass';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '@/lib/tab-bar';

// A floating "recenter on me" button, bottom-right, sitting just above the
// floating tab bar - same glass treatment as the header pills (CLAUDE.md
// "Design system": "map overlay buttons (fullscreen/locate toggles)" get
// the glass surface on apps/public too). Map-tab-specific: onPress re-runs
// the same fly-to-user-location logic the tab already runs once on focus
// ((tabs)/index.tsx), for whenever the user has since panned away.
export function MapLocateButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const insets = useSafeAreaInsets();
  const tokens = useGlassTokens();

  return (
    <GlassPill
      className="absolute right-4"
      style={{ bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2 + 12 }}
    >
      <Pressable onPress={onPress} disabled={loading} className="p-3 active:opacity-70" hitSlop={4}>
        {loading ? (
          <ActivityIndicator size="small" color={tokens.iconActive} />
        ) : (
          <Ionicons name="locate" size={22} color={tokens.iconActive} style={GLYPH_SHADOW} />
        )}
      </Pressable>
    </GlassPill>
  );
}
