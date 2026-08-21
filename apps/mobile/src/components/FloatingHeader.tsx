import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GlassPill } from '@/components/GlassPill';
import { useAuth } from '@/lib/auth/auth-context';
import { GLYPH_SHADOW, useGlassTokens } from '@/lib/glass';
import { HEADER_MARGIN } from '@/lib/header';
import { useUserRef } from '@/lib/resources/users';

// Two independent floating glass pills - matches apps/public's own header
// (CLAUDE.md "Design system": "the sticky header ... two independent
// floating pills - logo left, nav+auth right - rather than one continuous
// bar") - ported to mobile as a persistent overlay across every tab
// screen, since Guides and Account moved here out of the bottom tab bar
// (which now only holds the three primary browse destinations: Map,
// Discover, Clubs).
export function FloatingHeader() {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const tokens = useGlassTokens();
  const { status, user } = useAuth();

  // Same "filled icon + higher-contrast tint on the active route" treatment
  // as the tab bar's TabIcon (_layout.tsx), so Guides/Account read as
  // current the same way Map/Discover/Clubs already do.
  const guidesActive = pathname.startsWith('/guides');
  const accountActive = pathname.startsWith('/account');

  // Signed-in users get their own avatar instead of the generic person
  // glyph - GET /users/:id/profile is the same endpoint UserRef.tsx
  // already uses to resolve a display name for other users, since nothing
  // joins one onto CurrentUser directly (see MOBILE_PLAN.md Phase 2's
  // "no endpoint joins a display name" note); avatarUrl rides along on
  // that same response.
  const { data: profile } = useUserRef(user?.userId ?? '', { enabled: status === 'signed-in' });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + HEADER_MARGIN,
        left: HEADER_MARGIN,
        right: HEADER_MARGIN,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      <GlassPill className="p-2">
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
          accessibilityLabel={t('appName')}
        />
      </GlassPill>
      <GlassPill className="gap-1 p-1.5">
        <Pressable
          onPress={() => router.push('/guides')}
          className="rounded-full p-2 active:opacity-70"
          hitSlop={4}
        >
          <Ionicons
            name={guidesActive ? 'people' : 'people-outline'}
            size={20}
            color={guidesActive ? tokens.iconActive : tokens.iconInactive}
            style={GLYPH_SHADOW}
          />
        </Pressable>
        <Pressable
          onPress={() => router.push('/account')}
          className="rounded-full p-2 active:opacity-70"
          hitSlop={4}
        >
          {status === 'signed-in' && profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={[
                { width: 20, height: 20, borderRadius: 10 },
                accountActive && { borderWidth: 2, borderColor: tokens.iconActive },
              ]}
              accessibilityLabel={profile.displayName}
            />
          ) : (
            <Ionicons
              name={accountActive ? 'person' : 'person-outline'}
              size={20}
              color={accountActive ? tokens.iconActive : tokens.iconInactive}
              style={GLYPH_SHADOW}
            />
          )}
        </Pressable>
      </GlassPill>
    </View>
  );
}
