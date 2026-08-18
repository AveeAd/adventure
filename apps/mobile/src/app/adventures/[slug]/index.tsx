import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Markdown } from '@/components/Markdown';
import { OfflineDownloadButton } from '@/components/OfflineDownloadButton';
import { Screen } from '@/components/Screen';
import {
  useAdventurePage,
  useSpots,
  useToggleLike,
  useToggleVisit,
  useTrails,
  useTripReports,
} from '@/lib/resources/adventure-pages';

function formatDuration(minDays: number | null, maxDays: number | null) {
  if (!minDays && !maxDays) return null;
  if (minDays === maxDays) return `${minDays} day${minDays === 1 ? '' : 's'}`;
  return `${minDays ?? '?'}–${maxDays ?? '?'} days`;
}

export default function AdventureDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: page, isLoading, isError, refetch } = useAdventurePage(slug);
  const { data: trails } = useTrails(page?.id);
  const { data: spots } = useSpots(page?.id);
  const { data: tripReports } = useTripReports(page?.id);
  const toggleLike = useToggleLike(page?.id ?? '', slug);
  const toggleVisit = useToggleVisit(page?.id ?? '', slug);

  if (isLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  const cover = page.media[0];
  const duration = formatDuration(page.durationMinDays, page.durationMaxDays);

  return (
    <Screen scroll className="px-0 py-0" contentContainerClassName="gap-4 px-4 py-4">
      {cover ? (
        <Image source={{ uri: cover.url }} style={{ width: '100%', height: 220 }} contentFit="cover" />
      ) : null}

      <View className="gap-3 px-4">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-2xl font-bold text-primary-900 dark:text-primary-100">
            {page.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Button size="sm" variant="secondary" onPress={() => router.push(`/adventures/${slug}/edit`)}>
              Edit
            </Button>
            <OfflineDownloadButton slug={slug} />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {page.activityType ? <Badge>{page.activityType.name}</Badge> : null}
          {page.difficultyLevel ? <Badge tone="warning">{page.difficultyLevel.name}</Badge> : null}
          {!page.approvedRevision ? <Badge tone="warning">Unapproved</Badge> : null}
          {page.districts.map((d) => (
            <Badge key={d.district.name} tone="neutral">
              {d.district.name}
            </Badge>
          ))}
          {page.seasons.map((s) => (
            <Badge key={s.season.name} tone="success">
              {s.season.name}
            </Badge>
          ))}
        </View>

        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant={page.likedByMe ? 'accent' : 'secondary'}
            disabled={toggleLike.isPending}
            onPress={() => toggleLike.mutate(page.likedByMe)}
          >
            {page.likedByMe ? 'Liked' : 'Like'} · {page.likeCount}
          </Button>
          <Button
            size="sm"
            variant={page.visitedByMe ? 'accent' : 'secondary'}
            disabled={toggleVisit.isPending}
            onPress={() => toggleVisit.mutate(page.visitedByMe)}
          >
            {page.visitedByMe ? "Been here" : "Mark as been here"} · {page.visitCount}
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-4">
          {duration ? (
            <Text className="text-sm text-stone-600 dark:text-stone-400">Duration: {duration}</Text>
          ) : null}
          {page.maxAltitudeMeters ? (
            <Text className="text-sm text-stone-600 dark:text-stone-400">
              Max altitude: {page.maxAltitudeMeters}m
            </Text>
          ) : null}
        </View>

        {page.approvedRevision?.content ? <Markdown>{page.approvedRevision.content}</Markdown> : null}

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            Trails &amp; spots
          </Text>
          <View className="flex-row gap-2">
            {trails?.length || spots?.length ? (
              <Button size="sm" onPress={() => router.push(`/adventures/${slug}/map`)}>
                View map
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onPress={() => router.push(`/adventures/${slug}/trails/new`)}>
              {trails?.length ? 'Edit trail' : 'Add trail'}
            </Button>
            <Button size="sm" variant="secondary" onPress={() => router.push(`/adventures/${slug}/spots/new`)}>
              Add spot
            </Button>
          </View>
        </View>
        {trails?.length || spots?.length ? (
          <View className="gap-2">
            {trails?.map((trail) => (
              <Card key={trail.id} className="p-3">
                <Text className="font-medium text-primary-900 dark:text-primary-100">
                  {trail.name ?? 'Unnamed trail'}
                </Text>
                <Text className="text-sm text-stone-600 dark:text-stone-400">
                  {trail.distanceMeters ? `${(trail.distanceMeters / 1000).toFixed(1)} km` : null}
                  {trail.ascentMeters ? ` · +${Math.round(trail.ascentMeters)}m` : null}
                </Text>
              </Card>
            ))}
            {spots?.map((spot) => (
              <Card key={spot.id} className="p-3">
                <Text className="font-medium text-primary-900 dark:text-primary-100">{spot.name}</Text>
                <Text className="text-sm text-stone-600 dark:text-stone-400">
                  {spot.spotTypeName}
                  {spot.elevationMeters ? ` · ${spot.elevationMeters}m` : null}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState>No trails or spots yet.</EmptyState>
        )}

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            Trip reports
          </Text>
          <Button size="sm" onPress={() => router.push(`/adventures/${slug}/trips/new`)}>
            Share a trip report
          </Button>
        </View>
        {tripReports?.data.length ? (
          <View className="gap-2">
            {tripReports.data.map((report) => (
              <Link key={report.id} href={`/adventures/${slug}/trips/${report.id}`} asChild>
                <Card className="p-3" onPress={() => {}}>
                  <Text className="font-medium text-primary-900 dark:text-primary-100">
                    {report.title}
                  </Text>
                  <Text className="text-sm text-stone-600 dark:text-stone-400">
                    {new Date(report.dateCompleted).toLocaleDateString()} · {report.kudosCount} kudos
                  </Text>
                </Card>
              </Link>
            ))}
          </View>
        ) : (
          <EmptyState>No trip reports yet. Be the first to share one.</EmptyState>
        )}
      </View>
    </Screen>
  );
}
