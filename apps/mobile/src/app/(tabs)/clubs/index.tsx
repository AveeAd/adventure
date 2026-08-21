import type { ClubSummary } from '@adventure/api-types';
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
import { useClubsInfinite } from '@/lib/resources/clubs';
import { TAB_BAR_CLEARANCE } from '@/lib/tab-bar';

// Same card recipe as Discover's AdventureCard - glass surface, optional
// cover image, title/description, a badge row - even though nothing in
// the create-club form sets coverImageUrl yet (apps/public's own ClubCard
// doesn't render one either), the field exists on the model
// (CreateClubDto includes it), so this renders one whenever a club has one
// rather than assuming it never will.
function ClubCard({ club }: { club: ClubSummary }) {
  const { t } = useTranslation('clubs');
  return (
    <Link href={`/clubs/${club.id}`} asChild>
      <Card className="mx-4 mb-3" glass onPress={() => {}}>
        {club.coverImageUrl ? (
          <Image source={{ uri: club.coverImageUrl }} style={{ width: '100%', height: 140 }} contentFit="cover" />
        ) : null}
        <View className="gap-2 p-3">
          <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">{club.name}</Text>
          {club.description ? (
            <Text className="text-sm text-stone-600 dark:text-stone-400" numberOfLines={2}>
              {club.description}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1.5">
            <Badge tone="neutral">{t('memberCount', { count: club._count.members })}</Badge>
            {club.visibility === 'PRIVATE' ? <Badge tone="warning">{t('private')}</Badge> : null}
          </View>
        </View>
      </Card>
    </Link>
  );
}

// Same redesign as Discover ((tabs)/discover.tsx): heading and search bar
// dropped, FlatList scrolls edge-to-edge behind the floating header/tab bar
// with infinite scroll instead of a single fixed page - see that screen's
// own comment for the full reasoning, identical here.
export default function ClubsList() {
  const { t } = useTranslation('clubs');
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClubsInfinite();
  const clubs = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen scroll={false} contentContainerClassName="" contentContainerStyle={{ flex: 1 }}>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(club) => club.id}
          renderItem={({ item }) => <ClubCard club={item} />}
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
