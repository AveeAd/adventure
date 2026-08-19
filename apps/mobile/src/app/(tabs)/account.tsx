import type { NotificationPreferences } from '@adventure/api-types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/auth/apple-signin';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/lib/resources/notification-preferences';
import { useAuthIdentities, useLinkAppleIdentity } from '@/lib/resources/auth-identities';

const PREFERENCE_ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'socialEnabled', label: 'Comments, replies & kudos' },
  { key: 'contributionsEnabled', label: 'Edit approvals & verifications' },
  { key: 'moderationEnabled', label: 'Reports & moderator applications' },
  { key: 'clubsEnabled', label: 'Club join requests' },
];

function NotificationSettings() {
  const { data: preferences } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  return (
    <Card className="w-full gap-4 p-4">
      <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">Notifications</Text>
      {PREFERENCE_ROWS.map((row) => (
        <View key={row.key} className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm text-stone-700 dark:text-stone-200">{row.label}</Text>
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
        Connected accounts
      </Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-stone-700 dark:text-stone-200">Apple ID</Text>
        {appleLinked ? (
          <Text className="text-sm text-primary-700 dark:text-primary-300">Linked</Text>
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
            Link Apple ID
          </Button>
        )}
      </View>
    </Card>
  );
}

export default function Account() {
  const { user, signOut, deleteAccount } = useAuth();
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      "This permanently deletes your recorded activity tracks and signs you out. Your trip reports, edits, and comments stay attributed to \"[deleted user]\" rather than being removed, since other people's content links to them.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
      ],
    );
  };

  return (
    <Screen contentContainerClassName="items-center gap-6 py-8" scroll>
      <Text className="text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
        {user?.username}
      </Text>
      <Button variant="primary" onPress={() => router.push('/tracks')}>
        Activity Tracks
      </Button>
      <ConnectedAccounts />
      <NotificationSettings />
      <Button variant="accent" onPress={signOut}>
        Sign out
      </Button>
      <Button variant="danger" size="sm" onPress={handleDeleteAccount}>
        Delete account
      </Button>
    </Screen>
  );
}
