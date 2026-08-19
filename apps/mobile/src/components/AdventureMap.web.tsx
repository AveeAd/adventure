import type { Spot, Trail } from '@adventure/api-types';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

// @maplibre/maplibre-react-native has no web target (unlike e.g. Google
// Sign-In, which degrades gracefully with a console warning) - importing it
// on web crashes Metro's static export at module-load time
// (`codegenNativeComponent is not a function`). Metro's platform-extension
// resolution picks this file over AdventureMap.tsx for the web bundle, so
// `expo export --platform web` (used as a smoke test - apps/mobile isn't
// shipped to web, apps/public is the real web app) keeps working for every
// other route instead of failing outright.
export function AdventureMap(_props: { trails: Trail[]; spots: Spot[] }) {
  const { t } = useTranslation('adventurePage');
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-center text-stone-500 dark:text-stone-400">
        {t('map.webUnsupported')}
      </Text>
    </View>
  );
}
