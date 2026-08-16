import type { ThreadReply } from '@adventure/api-types';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useThread, useThreadReplies } from '@/lib/resources/threads';

function ReplyItem({ reply }: { reply: ThreadReply }) {
  return (
    <View className="gap-2">
      <Card className="p-3">
        <UserRef userId={reply.authorId} className="text-sm font-medium text-primary-700 dark:text-primary-400" />
        <Text className="mt-1 text-sm text-stone-700 dark:text-stone-300">{reply.content}</Text>
      </Card>
      {reply.replies.length ? (
        <View className="ml-6 gap-2">
          {reply.replies.map((nested) => (
            <ReplyItem key={nested.id} reply={nested} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { data: thread, isLoading, isError, refetch } = useThread(threadId);
  const { data: replies } = useThreadReplies(threadId);

  if (isLoading) return <LoadingState />;
  if (isError || !thread) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <View className="flex-row items-center gap-2">
        <UserRef userId={thread.authorId} className="text-base font-semibold text-primary-900 dark:text-primary-100" />
        <Badge tone="neutral">{thread.tag}</Badge>
        {thread.isPinned ? <Badge tone="warning">Pinned</Badge> : null}
      </View>
      <Text className="text-base text-stone-700 dark:text-stone-300">{thread.content}</Text>

      <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">Replies</Text>
      {replies?.length ? (
        <View className="gap-2">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
        </View>
      ) : (
        <EmptyState>No replies yet.</EmptyState>
      )}
    </Screen>
  );
}
