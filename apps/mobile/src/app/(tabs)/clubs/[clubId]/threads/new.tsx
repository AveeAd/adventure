import type { ThreadTag } from '@adventure/api-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Field, TextArea } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { useCreateThread } from '@/lib/resources/threads';

const TAG_OPTIONS: { id: ThreadTag; label: string }[] = [
  { id: 'DISCUSSION', label: 'Discussion' },
  { id: 'TRIP_SHARE', label: 'Trip share' },
  { id: 'QUESTION', label: 'Question' },
  { id: 'ANNOUNCEMENT', label: 'Announcement' },
  { id: 'RANDOM', label: 'Random' },
];

export default function NewThread() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const createThread = useCreateThread(clubId);
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<ThreadTag>('DISCUSSION');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setError(null);
    try {
      const thread = await createThread.mutateAsync({ content: content.trim(), tag });
      router.replace(`/clubs/${clubId}/threads/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post thread.');
    }
  };

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">New thread</Text>
      <Select
        label="Tag"
        value={tag}
        options={TAG_OPTIONS}
        onChange={(id) => setTag(id as ThreadTag)}
      />
      <Field label="Content">
        <TextArea value={content} onChangeText={setContent} placeholder="What's on your mind?" numberOfLines={6} />
      </Field>
      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={createThread.isPending || !content.trim()} onPress={handleSubmit}>
        {createThread.isPending ? 'Posting…' : 'Post thread'}
      </Button>
    </Screen>
  );
}
