import { Linking, Platform, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ANDROID_STORE_URL, IOS_STORE_URL } from '@/lib/api';
import { Button } from './Button';
import { Screen } from './Screen';

// Rendered instead of the whole app (see app/_layout.tsx's useVersionGate)
// when this build is below the server's mobile.minVersion SystemSetting, or
// a live API call just came back 426 mid-session. No sign-in/tab chrome
// underneath - a stale client shouldn't be able to reach any screen that
// would just fail its own requests.
export function UpdateRequiredScreen({ minVersion }: { minVersion: string | null }) {
  const { t } = useTranslation('common');
  const storeUrl = Platform.select({ ios: IOS_STORE_URL, android: ANDROID_STORE_URL, default: null });

  // The minVersion clause is itself a catalogue string (not string-built
  // here) so a future locale can reorder/drop it entirely rather than being
  // stuck with English's own parenthetical-suffix phrasing.
  const minVersionSuffix = minVersion ? t('updateRequired.minVersionSuffix', { minVersion }) : '';

  return (
    <Screen contentContainerClassName="flex-1 items-center justify-center gap-4 px-6" scroll={false}>
      <Text className="text-center text-xl font-semibold text-stone-900 dark:text-white">
        {t('updateRequired.title')}
      </Text>
      <Text className="text-center text-base text-stone-600 dark:text-stone-400">
        {t('updateRequired.message', { minVersionSuffix })}
      </Text>
      {storeUrl ? (
        <Button onPress={() => Linking.openURL(storeUrl)}>{t('updateRequired.openStore')}</Button>
      ) : (
        <Text className="text-center text-sm text-stone-500 dark:text-stone-500">
          {t('updateRequired.checkStore')}
        </Text>
      )}
    </Screen>
  );
}
