import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DrawMap } from '@/components/DrawMap';
import { ErrorState } from '@/components/ErrorState';
import { Field, TextArea, TextInput } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { useAdventurePage, useCreateSpot } from '@/lib/resources/adventure-pages';
import { useSpotTypes } from '@/lib/resources/master-data';

type LngLat = [number, number];

export default function NewSpot() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: page, isLoading, isError, refetch } = useAdventurePage(slug);
  const { data: spotTypes } = useSpotTypes();
  const createSpot = useCreateSpot(page?.id ?? '');

  const [points, setPoints] = useState<LngLat[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spotTypeId, setSpotTypeId] = useState<string | null>(null);
  const [elevationMeters, setElevationMeters] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  const handleSubmit = async () => {
    if (!points.length || !name.trim() || !spotTypeId) {
      setError('Tap the map to place the spot, then set a name and type.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSpot.mutateAsync({
        spotTypeId,
        name: name.trim(),
        description: description.trim() || undefined,
        geometry: { type: 'Point', coordinates: points[0] },
        elevationMeters: elevationMeters.trim() ? Number(elevationMeters.trim()) : undefined,
      });
      router.replace(`/adventures/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save spot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll={false} contentContainerClassName="gap-3">
      <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">Add spot</Text>
      <View className="flex-1">
        <DrawMap points={points} onPointsChange={setPoints} mode="point" />
      </View>
      <View className="gap-2 px-4 pb-2">
        <Field label="Name">
          <TextInput value={name} onChangeText={setName} placeholder="Spot name" />
        </Field>
        <Select
          label="Spot type"
          value={spotTypeId}
          options={(spotTypes?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
          onChange={setSpotTypeId}
        />
        <Field label="Description">
          <TextArea value={description} onChangeText={setDescription} numberOfLines={2} />
        </Field>
        <Field label="Elevation (m)">
          <TextInput value={elevationMeters} onChangeText={setElevationMeters} keyboardType="numeric" />
        </Field>
        {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
        <Button disabled={submitting || !points.length} onPress={handleSubmit}>
          {submitting ? 'Saving…' : 'Add spot'}
        </Button>
      </View>
    </Screen>
  );
}
