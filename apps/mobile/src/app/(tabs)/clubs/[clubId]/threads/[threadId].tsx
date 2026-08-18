import type { ThreadReply } from '@adventure/api-types';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { TextArea } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useCreateThreadReply, useThread, useThreadReplies } from '@/lib/resources/threads';

function ReplyComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
}) {
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
      setError(err instanceof Error ? err.message : 'Could not post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="gap-2">
      <TextArea value={content} onChangeText={setContent} placeholder="Write a reply…" numberOfLines={3} />
      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button size="sm" disabled={submitting || !content.trim()} onPress={handleSubmit}>
          {submitting ? 'Posting…' : 'Post'}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function ReplyItem({
  reply,
  onReply,
}: {
  reply: ThreadReply;
  onReply: (parentReplyId: string, content: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <View className="gap-2">
      <Card className="p-3">
        <UserRef userId={reply.authorId} className="text-sm font-medium text-primary-700 dark:text-primary-400" />
        <Text className="mt-1 text-sm text-stone-700 dark:text-stone-300">{reply.content}</Text>
        <Button size="sm" variant="secondary" className="mt-2 self-start" onPress={() => setReplying((r) => !r)}>
          Reply
        </Button>
      </Card>
      {replying ? (
        <View className="ml-6">
          <ReplyComposer onSubmit={(content) => onReply(reply.id, content)} onCancel={() => setReplying(false)} />
        </View>
      ) : null}
      {reply.replies.length ? (
        <View className="ml-6 gap-2">
          {reply.replies.map((nested) => (
            <ReplyItem key={nested.id} reply={nested} onReply={onReply} />
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
  const createReply = useCreateThreadReply(threadId);

  if (isLoading) return <LoadingState />;
  if (isError || !thread) return <ErrorState onRetry={() => refetch()} />;

  const handleReply = async (parentReplyId: string, content: string) => {
    await createReply.mutateAsync({ content, parentReplyId });
  };

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <View className="flex-row items-center gap-2">
        <UserRef userId={thread.authorId} className="text-base font-semibold text-primary-900 dark:text-primary-100" />
        <Badge tone="neutral">{thread.tag}</Badge>
        {thread.isPinned ? <Badge tone="warning">Pinned</Badge> : null}
      </View>
      <Text className="text-base text-stone-700 dark:text-stone-300">{thread.content}</Text>

      <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">Replies</Text>
      <ReplyComposer onSubmit={async (content) => { await createReply.mutateAsync({ content }); }} />
      {replies?.length ? (
        <View className="gap-2">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} onReply={handleReply} />
          ))}
        </View>
      ) : (
        <EmptyState>No replies yet.</EmptyState>
      )}
    </Screen>
  );
}
