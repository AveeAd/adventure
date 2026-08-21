import type { AdventurePageSummary } from '@adventure/api-types';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { HEADER_CLEARANCE } from '@/lib/header';
import { useAdventurePagesInfinite } from '@/lib/resources/adventure-pages';
import { TAB_BAR_CLEARANCE } from '@/lib/tab-bar';

function AdventureCard({ page }: { page: AdventurePageSummary }) {
  const cover = page.media[0];
  return (
    <Link href={`/adventures/${page.slug}`} asChild>
      <Card className="mx-4 mb-3" glass onPress={() => {}}>
        {cover ? (
          <Image
            source={{ uri: cover.mediumUrl ?? cover.url }}
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

// Trending only now - the search bar (and the query/debounce state it
// needed) was removed along with the heading/New Adventure row in this
// redesign pass. Screen's own horizontal/vertical padding is stripped to
// nothing here so the FlatList scrolls edge-to-edge behind the floating
// header/tab bar, same full-bleed treatment the Map tab already has -
// individual cards carry their own mx-4 instead of a container-level px-4.
// Infinite scroll: onEndReached fetches the next page once the list is
// within one screen's height of the bottom (onEndReachedThreshold: 0.5),
// with a footer spinner while a next page is in flight - isFetchingNextPage
// specifically, not the initial isLoading, so a refresh doesn't show the
// "loading more" spinner instead of the pull-to-refresh spinner (refetch()
// on an infinite query re-fetches every page already loaded, not just the
// first, which is also why isRefetching is gated on !isFetchingNextPage -
// otherwise the two flags briefly overlap and the pull spinner would stick
// around into the next-page fetch that follows it).
export default function Discover() {
  const { t } = useTranslation('discover');
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdventurePagesInfinite();
  const pages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen scroll={false} contentContainerClassName="" contentContainerStyle={{ flex: 1 }}>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={pages}
          keyExtractor={(page) => page.id}
          renderItem={({ item }) => <AdventureCard page={item} />}
          ListEmptyComponent={<EmptyState>{t('empty')}</EmptyState>}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null}
          refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={() => refetch()} />}
          contentContainerStyle={{ paddingTop: HEADER_CLEARANCE, paddingBottom: TAB_BAR_CLEARANCE }}
        />
      )}
    </Screen>
  );
}
