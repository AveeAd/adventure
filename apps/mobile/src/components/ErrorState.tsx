import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './Button';
import { Screen } from './Screen';

// Shared error view for every query-backed screen. `onRetry` is typically
// a query's own `refetch`. `message` is caller-supplied (often server text)
// so it stays untranslated - only the fallback and the button route through
// the catalogue.
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation('common');
  return (
    <Screen contentContainerClassName="items-center justify-center gap-4" scroll={false}>
      <Text className="text-center text-base text-stone-600 dark:text-stone-400">
        {message ?? t('errorState.defaultMessage')}
      </Text>
      {onRetry ? (
        <Button variant="secondary" onPress={onRetry}>
          {t('errorState.retry')}
        </Button>
      ) : null}
    </Screen>
  );
}
