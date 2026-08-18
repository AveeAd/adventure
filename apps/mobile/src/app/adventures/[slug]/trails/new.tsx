import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DrawMap } from '@/components/DrawMap';
import { ErrorState } from '@/components/ErrorState';
import { Field, TextInput } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useAdventurePage, useCreateTrail, useTrails, useUpdateTrail } from '@/lib/resources/adventure-pages';

type LngLat = [number, number];

// Doubles as the edit flow when the page already has a trail - same
// "Add trail" / "Update trail" copy-branch as apps/public's trails/new.tsx.
export default function NewOrEditTrail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: page, isLoading: isPageLoading, isError, refetch } = useAdventurePage(slug);
  const { data: trails, isLoading: isTrailsLoading } = useTrails(page?.id);
  const existingTrail = trails?.[0];

  const createTrail = useCreateTrail(page?.id ?? '');
  const updateTrail = useUpdateTrail(existingTrail?.id ?? '', page?.id ?? '');

  const [points, setPoints] = useState<LngLat[]>(existingTrail?.geometry.coordinates ?? []);
  const [name, setName] = useState(existingTrail?.name ?? '');
  const [editSummary, setEditSummary] = useState('');
  const [isSafetyCriticalEdit, setIsSafetyCriticalEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPageLoading || isTrailsLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  const isEdit = !!existingTrail;

  const handleSubmit = async () => {
    if (points.length < 2) {
      setError('Draw at least two points to form a trail.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const geometry = { type: 'LineString' as const, coordinates: points };
      if (isEdit) {
        await updateTrail.mutateAsync({
          name: name.trim() || undefined,
          geometry,
          editSummary: editSummary.trim() || undefined,
          isSafetyCriticalEdit,
        });
      } else {
        await createTrail.mutateAsync({ name: name.trim() || undefined, geometry });
      }
      router.replace(`/adventures/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save trail.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll={false} contentContainerClassName="gap-3">
      <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
        {isEdit ? 'Update trail' : 'Add trail'}
      </Text>
      <View className="flex-1">
        <DrawMap points={points} onPointsChange={setPoints} mode="line" />
      </View>
      <View className="gap-2 px-4 pb-2">
        <Field label="Trail name">
          <TextInput value={name} onChangeText={setName} placeholder="Trail name (optional)" />
        </Field>
        {isEdit ? (
          <>
            <Field label="Edit summary">
              <TextInput value={editSummary} onChangeText={setEditSummary} placeholder="What changed?" />
            </Field>
            <Pressable onPress={() => setIsSafetyCriticalEdit((v) => !v)} className="flex-row items-center gap-2">
              <Text className="text-sm text-primary-900 dark:text-primary-100">
                {isSafetyCriticalEdit ? '☑' : '☐'} This edit affects safety-critical information
              </Text>
            </Pressable>
          </>
        ) : null}
        {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
        <Button disabled={submitting || points.length < 2} onPress={handleSubmit}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add trail'}
        </Button>
      </View>
    </Screen>
  );
}
