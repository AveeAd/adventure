import type { TripReportComment } from '@adventure/api-types';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { TextArea } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { Markdown } from '@/components/Markdown';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useCreateComment, useTripReport, useTripReportComments, useTripReportKudos } from '@/lib/resources/trip-reports';

function CommentComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useTranslation(['tripReports', 'common']);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content.trim());
      setContent('');
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tripReports:commentComposer.postError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="gap-2">
      <TextArea
        value={content}
        onChangeText={setContent}
        placeholder={t('tripReports:commentComposer.placeholder')}
        numberOfLines={3}
      />
      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button size="sm" disabled={submitting || !content.trim()} onPress={handleSubmit}>
          {submitting ? t('common:actions.posting') : t('common:actions.post')}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onPress={onCancel}>
            {t('common:actions.cancel')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: TripReportComment;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
}) {
  const { t } = useTranslation('tripReports');
  const [replying, setReplying] = useState(false);
  return (
    <View className="gap-2">
      <Card className="p-3">
        <UserRef
          userId={comment.authorId}
          className="text-sm font-medium text-primary-700 dark:text-primary-400"
        />
        <Text className="mt-1 text-sm text-stone-700 dark:text-stone-300">{comment.content}</Text>
        <Button size="sm" variant="secondary" className="mt-2 self-start" onPress={() => setReplying((r) => !r)}>
          {t('reply')}
        </Button>
      </Card>
      {replying ? (
        <View className="ml-6">
          <CommentComposer
            onSubmit={(content) => onReply(comment.id, content)}
            onCancel={() => setReplying(false)}
          />
        </View>
      ) : null}
      {comment.replies.length ? (
        <View className="ml-6 gap-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TripReportDetail() {
  const { t } = useTranslation('tripReports');
  const { tripReportId } = useLocalSearchParams<{ tripReportId: string }>();
  const { data: report, isLoading, isError, refetch } = useTripReport(tripReportId);
  const { data: comments } = useTripReportComments(tripReportId);
  const kudos = useTripReportKudos(tripReportId);
  const createComment = useCreateComment(tripReportId);

  if (isLoading) return <LoadingState />;
  if (isError || !report) return <ErrorState onRetry={() => refetch()} />;

  const handleReply = async (parentCommentId: string, content: string) => {
    await createComment.mutateAsync({ content, parentCommentId });
  };

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{report.title}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-stone-600 dark:text-stone-400">{t('detail.by')}</Text>
        <UserRef userId={report.authorId} />
        {report.club ? (
          <Text className="text-sm text-stone-600 dark:text-stone-400"> · {report.club.name}</Text>
        ) : null}
      </View>
      <Text className="text-sm text-stone-600 dark:text-stone-400">
        {new Date(report.dateCompleted).toLocaleDateString()}
        {report.durationDays ? ` · ${t('detail.durationDays', { count: report.durationDays })}` : ''}
      </Text>

      <Button
        size="sm"
        variant={report.kudosByMe ? 'accent' : 'secondary'}
        className="self-start"
        disabled={kudos.isPending}
        onPress={() => kudos.mutate(report.kudosByMe)}
      >
        {report.kudosByMe ? t('detail.kudosGiven') : t('detail.giveKudos')} · {report.kudosCount}
      </Button>

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
        {t('detail.comments')}
      </Text>
      <CommentComposer onSubmit={async (content) => { await createComment.mutateAsync({ content }); }} />
      {comments?.length ? (
        <View className="gap-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
          ))}
        </View>
      ) : (
        <EmptyState>{t('detail.emptyComments')}</EmptyState>
      )}
    </Screen>
  );
}
