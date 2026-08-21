import type { NotificationPreferences } from '@adventure/api-types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/auth/apple-signin';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/lib/resources/notification-preferences';
import { useAuthIdentities, useLinkAppleIdentity } from '@/lib/resources/auth-identities';
import { HEADER_CLEARANCE } from '@/lib/header';
import { TAB_BAR_CLEARANCE } from '@/lib/tab-bar';

const PREFERENCE_KEYS: { key: keyof NotificationPreferences; labelKey: string }[] = [
  { key: 'socialEnabled', labelKey: 'notifications.social' },
  { key: 'contributionsEnabled', labelKey: 'notifications.contributions' },
  { key: 'moderationEnabled', labelKey: 'notifications.moderation' },
  { key: 'clubsEnabled', labelKey: 'notifications.clubs' },
];

function NotificationSettings() {
  const { t } = useTranslation('account');
  const { data: preferences } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  return (
    <Card className="w-full gap-4 p-4">
      <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">
        {t('notifications.title')}
      </Text>
      {PREFERENCE_KEYS.map((row) => (
        <View key={row.key} className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm text-stone-700 dark:text-stone-200">{t(row.labelKey)}</Text>
          <Switch
            value={preferences?.[row.key] ?? true}
            onValueChange={(value) => updatePreferences.mutate({ [row.key]: value })}
          />
        </View>
      ))}
    </Card>
  );
}

// Apple sign-in is required as the primary auth provider, but a user who
// signed up with Google needs an explicit way to attach Apple too - see
// AuthService.linkAppleIdentity for why an Apple private-relay email can't
// auto-link the way a real Google email does.
function ConnectedAccounts() {
  const { t } = useTranslation('account');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { data } = useAuthIdentities();
  const linkApple = useLinkAppleIdentity();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  if (!appleAvailable) {
    return null;
  }

  const appleLinked = data?.providers.includes('APPLE') ?? false;

  return (
    <Card className="w-full gap-3 p-4">
      <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">
        {t('connectedAccounts.title')}
      </Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-stone-700 dark:text-stone-200">
          {t('connectedAccounts.appleId')}
        </Text>
        {appleLinked ? (
          <Text className="text-sm text-primary-700 dark:text-primary-300">
            {t('connectedAccounts.linked')}
          </Text>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onPress={async () => {
              const result = await signInWithApple();
              if (result) {
                linkApple.mutate(result.identityToken);
              }
            }}
          >
            {t('connectedAccounts.linkButton')}
          </Button>
        )}
      </View>
    </Card>
  );
}

export default function Account() {
  const { t } = useTranslation('account');
  const { status, user, signOut, deleteAccount } = useAuth();
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount.confirmTitle'),
      t('deleteAccount.confirmMessage'),
      [
        { text: t('deleteAccount.cancel'), style: 'cancel' },
        { text: t('deleteAccount.confirmButton'), style: 'destructive', onPress: deleteAccount },
      ],
    );
  };

  if (status !== 'signed-in') {
    // Browsing is allowed without a session (see _layout.tsx) - everything
    // below this point (tracks, connected accounts, notification prefs,
    // delete account) is inherently tied to a real account, so a guest gets
    // a prompt here instead rather than a broken/empty version of each.
    return (
      <Screen
        contentContainerClassName="flex-1 items-center justify-center gap-3 px-6"
        contentContainerStyle={{ paddingTop: HEADER_CLEARANCE }}
        scroll={false}
      >
        <Text className="text-center text-xl font-bold text-primary-900 dark:text-primary-100">
          {t('guest.heading')}
        </Text>
        <Text className="text-center text-base text-primary-700 dark:text-primary-300">
          {t('guest.subheading')}
        </Text>
        <Button variant="primary" className="mt-3" onPress={() => router.push('/sign-in')}>
          {t('guest.signInButton')}
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      contentContainerClassName="items-center gap-6"
      contentContainerStyle={{ paddingTop: HEADER_CLEARANCE, paddingBottom: TAB_BAR_CLEARANCE }}
      scroll
    >
      <Text className="text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
        {user?.username}
      </Text>
      <Button variant="primary" onPress={() => router.push('/tracks')}>
        {t('activityTracksButton')}
      </Button>
      <ConnectedAccounts />
      <NotificationSettings />
      <Button variant="accent" onPress={signOut}>
        {t('signOut')}
      </Button>
      <Button variant="danger" size="sm" onPress={handleDeleteAccount}>
        {t('deleteAccount.button')}
      </Button>
    </Screen>
  );
}
