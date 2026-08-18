import type { AdventurePageSummary } from '@adventure/api-types';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useAdventurePages } from '@/lib/resources/adventure-pages';

// Debounced same as apps/public's routes/index.tsx (300ms) before hitting
// /adventure-pages/search.
function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function AdventureCard({ page }: { page: AdventurePageSummary }) {
  const cover = page.media[0];
  return (
    <Link href={`/adventures/${page.slug}`} asChild>
      <Card className="mb-3 overflow-hidden" onPress={() => {}}>
        {cover ? (
          <Image
            source={{ uri: cover.url }}
            style={{ width: '100%', height: 140 }}
            contentFit="cover"
          />
        ) : null}
        <View className="gap-2 p-3">
          <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">
            {page.title}
          </Text>
          {page.summary ? (
            <Text
              className="text-sm text-stone-600 dark:text-stone-400"
              numberOfLines={2}
            >
              {page.summary}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1.5">
            {page.activityType ? <Badge>{page.activityType.name}</Badge> : null}
            {page.difficultyLevel ? <Badge tone="warning">{page.difficultyLevel.name}</Badge> : null}
          </View>
        </View>
      </Card>
    </Link>
  );
}

export default function Discover() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data, isLoading, isError, refetch } = useAdventurePages(debouncedQuery);

  return (
    <Screen scroll={false}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">Discover</Text>
        <Button size="sm" onPress={() => router.push('/adventures/new')}>
          New adventure
        </Button>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search adventures"
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
          keyExtractor={(page) => page.id}
          renderItem={({ item }) => <AdventureCard page={item} />}
          ListEmptyComponent={<EmptyState>No adventures found.</EmptyState>}
        />
      )}
    </Screen>
  );
}
