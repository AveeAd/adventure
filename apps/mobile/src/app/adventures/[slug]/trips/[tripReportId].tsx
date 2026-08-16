import type { TripReportComment } from '@adventure/api-types';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Markdown } from '@/components/Markdown';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useTripReport, useTripReportComments } from '@/lib/resources/trip-reports';

function CommentItem({ comment }: { comment: TripReportComment }) {
  return (
    <View className="gap-2">
      <Card className="p-3">
        <UserRef
          userId={comment.authorId}
          className="text-sm font-medium text-primary-700 dark:text-primary-400"
        />
        <Text className="mt-1 text-sm text-stone-700 dark:text-stone-300">{comment.content}</Text>
      </Card>
      {comment.replies.length ? (
        <View className="ml-6 gap-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TripReportDetail() {
  const { tripReportId } = useLocalSearchParams<{ tripReportId: string }>();
  const { data: report, isLoading, isError, refetch } = useTripReport(tripReportId);
  const { data: comments } = useTripReportComments(tripReportId);

  if (isLoading) return <LoadingState />;
  if (isError || !report) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{report.title}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-stone-600 dark:text-stone-400">By</Text>
        <UserRef userId={report.authorId} />
        {report.club ? (
          <Text className="text-sm text-stone-600 dark:text-stone-400"> · {report.club.name}</Text>
        ) : null}
      </View>
      <Text className="text-sm text-stone-600 dark:text-stone-400">
        {new Date(report.dateCompleted).toLocaleDateString()}
        {report.durationDays ? ` · ${report.durationDays} day${report.durationDays === 1 ? '' : 's'}` : ''}
        {' · '}
        {report.kudosCount} kudos
      </Text>

      {report.activityTracks.length ? (
        <View className="flex-row flex-wrap gap-4">
          {report.activityTracks.map((track) => (
            <Text key={track.id} className="text-sm text-stone-600 dark:text-stone-400">
              {(track.distanceMeters / 1000).toFixed(1)} km
              {track.ascentMeters ? ` · +${Math.round(track.ascentMeters)}m` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {report.media.length ? (
        <View className="flex-row flex-wrap gap-2">
          {report.media.map((item) => (
            <Image
              key={item.id}
              source={{ uri: item.url }}
              style={{ width: 120, height: 120, borderRadius: 8 }}
              contentFit="cover"
            />
          ))}
        </View>
      ) : null}

      <Markdown>{report.description}</Markdown>

      <Text className="mt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
        Comments
      </Text>
      {comments?.length ? (
        <View className="gap-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </View>
      ) : (
        <EmptyState>No comments yet.</EmptyState>
      )}
    </Screen>
  );
}
