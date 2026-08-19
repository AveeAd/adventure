import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useClubs } from '@/lib/resources/clubs';

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function ClubsList() {
  const { t } = useTranslation('clubs');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data, isLoading, isError, refetch } = useClubs(debouncedQuery);

  return (
    <Screen scroll={false}>
      <Text className="mb-4 text-2xl font-bold text-primary-900 dark:text-primary-100">{t('title')}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchPlaceholder')}
        placeholderTextColor="#8ebe9d"
        className="mb-4 rounded-full border-[3px] border-primary-300 px-4 py-2.5 text-base text-primary-900 dark:border-primary-700 dark:text-primary-100"
      />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(club) => club.id}
          contentContainerClassName="gap-3"
          renderItem={({ item }) => (
            <Link href={`/clubs/${item.id}`} asChild>
              <Card className="p-3" onPress={() => {}}>
                <Text className="font-medium text-primary-900 dark:text-primary-100">{item.name}</Text>
                {item.description ? (
                  <Text className="mt-1 text-sm text-stone-600 dark:text-stone-400" numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Badge tone="neutral">{t('memberCount', { count: item.memberCount })}</Badge>
              </Card>
            </Link>
          )}
          ListEmptyComponent={<EmptyState>{t('empty')}</EmptyState>}
        />
      )}
    </Screen>
  );
}
