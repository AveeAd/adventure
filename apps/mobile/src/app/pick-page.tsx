import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { TextInput } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { authGet } from '@/lib/auth-fetch';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  activityTypeName: string | null;
}

// Spot/Trail creation is hard-scoped to exactly one AdventurePage (see
// CLAUDE.md: Trail/Spot are exclusive to one page) - neither can be
// recorded from the Map tab's FAB (RecordFAB.tsx) without picking a page
// first, so this is that hop, shared by both via `?kind=spot|trail`.
// Reuses the same full-text /adventure-pages/search endpoint
// AttachmentPicker.tsx already calls, but keeps `slug` (needed to route
// into spots/new.tsx or trails/new.tsx) instead of collapsing to
// AttachmentPicker's generic {id, label} shape.
export default function PickPage() {
  const { t } = useTranslation('adventurePage');
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind: 'spot' | 'trail' }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const handle = setTimeout(
      () => {
        if (!trimmed) {
          setResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        authGet<{ data: SearchResult[] }>(`/adventure-pages/search?q=${encodeURIComponent(trimmed)}`)
          .then((body) => setResults(body.data))
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      },
      trimmed ? 250 : 0,
    );
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Screen scroll={false} contentContainerClassName="gap-3">
      <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
        {t('pickPage.title')}
      </Text>
      <View className="mx-4">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('pickPage.searchPlaceholder')}
          autoFocus
        />
      </View>
      <FlatList
        className="px-4"
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && query.trim() ? <EmptyState>{t('pickPage.empty')}</EmptyState> : null
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.replace(`/adventures/${item.slug}/${kind === 'trail' ? 'trails' : 'spots'}/new`)}
            className="p-4"
          >
            <Text className="font-medium text-primary-900 dark:text-primary-100">{item.title}</Text>
            {item.activityTypeName ? (
              <Text className="text-sm text-stone-600 dark:text-stone-400">{item.activityTypeName}</Text>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}
