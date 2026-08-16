import { useLocalSearchParams } from 'expo-router';

import { AdventureMap } from '@/components/AdventureMap';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useAdventurePage, useSpots, useTrails } from '@/lib/resources/adventure-pages';

export default function AdventureMapScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: page, isLoading: isPageLoading, isError, refetch } = useAdventurePage(slug);
  const { data: trails, isLoading: isTrailsLoading } = useTrails(page?.id);
  const { data: spots, isLoading: isSpotsLoading } = useSpots(page?.id);

  if (isPageLoading || isTrailsLoading || isSpotsLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  return <AdventureMap trails={trails ?? []} spots={spots ?? []} />;
}
