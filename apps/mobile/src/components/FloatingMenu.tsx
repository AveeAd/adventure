import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPill } from '@/components/GlassPill';
import { GLYPH_SHADOW, useGlassTokens } from '@/lib/glass';
import { HEADER_HEIGHT, HEADER_MARGIN } from '@/lib/header';

// A dropdown-positioned stack of *independent* floating glass pills, not
// one shared panel - each action is its own GlassPill (icon + label),
// fanned out below the trigger with a gap between them, closer to how
// apps/public's own floating buttons read than a single boxed menu would.
// A transparent Modal + full-screen backdrop Pressable still handles
// outside-tap-to-close and sits above the rest of the screen.
export function FloatingMenu({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1" onPress={onClose} style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
        <View
          style={{
            position: 'absolute',
            top: insets.top + HEADER_MARGIN + HEADER_HEIGHT + 10,
            right: HEADER_MARGIN,
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

export function FloatingMenuItem({
  icon,
  label,
  onPress,
  disabled = false,
  loading = false,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'default' | 'danger';
}) {
  const tokens = useGlassTokens();
  const color = tone === 'danger' ? '#a3502f' : tokens.iconActive;

  return (
    // Stops the tap from bubbling to the backdrop (which would just close
    // the menu instead of firing onPress) - Pressable.onPress alone
    // doesn't stop propagation the way DOM's stopPropagation does, so this
    // wraps each pill rather than relying on the backdrop's own handler.
    <Pressable onPress={(e) => e.stopPropagation()}>
      <GlassPill className="gap-2 py-2.5 pl-3 pr-4">
        <Pressable
          onPress={onPress}
          disabled={disabled || loading}
          className={`flex-row items-center gap-2 ${disabled || loading ? 'opacity-50' : 'active:opacity-70'}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name={icon} size={18} color={color} style={GLYPH_SHADOW} />
          )}
          <Text className="text-sm font-medium" style={{ color }}>
            {label}
          </Text>
        </Pressable>
      </GlassPill>
    </Pressable>
  );
}
