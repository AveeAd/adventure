import type { CreateSpotRequest } from '@adventure/api-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DrawMap } from '@/components/DrawMap';
import { Field, TextArea, TextInput } from '@/components/FormField';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { useCreateAdventurePage } from '@/lib/resources/adventure-pages';
import {
  useActivityTypes,
  useDifficultyLevels,
  useDistricts,
  useSeasons,
  useSpotTypes,
  useTags,
} from '@/lib/resources/master-data';

type LngLat = [number, number];

// Single atomic form mirroring apps/public's adventures/new.tsx - a page
// plus an optional inline trail and repeatable spots all submit in one
// POST /adventure-pages call, since the API creates them transactionally.
export default function NewAdventurePage() {
  const router = useRouter();
  const createPage = useCreateAdventurePage();

  const { data: activityTypes } = useActivityTypes();
  const { data: difficultyLevels } = useDifficultyLevels();
  const { data: districts } = useDistricts();
  const { data: seasons } = useSeasons();
  const { data: tags } = useTags();
  const { data: spotTypes } = useSpotTypes();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null);
  const [difficultyLevelId, setDifficultyLevelId] = useState<string | null>(null);
  const [durationMinDays, setDurationMinDays] = useState('');
  const [durationMaxDays, setDurationMaxDays] = useState('');
  const [maxAltitudeMeters, setMaxAltitudeMeters] = useState('');
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [seasonIds, setSeasonIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const [drawTrail, setDrawTrail] = useState(false);
  const [trailPoints, setTrailPoints] = useState<LngLat[]>([]);
  const [trailName, setTrailName] = useState('');

  const [drawSpot, setDrawSpot] = useState(false);
  const [spotPoint, setSpotPoint] = useState<LngLat[]>([]);
  const [spotName, setSpotName] = useState('');
  const [spotTypeId, setSpotTypeId] = useState<string | null>(null);
  const [pendingSpots, setPendingSpots] = useState<CreateSpotRequest[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPendingSpot = () => {
    if (!spotPoint.length || !spotName.trim() || !spotTypeId) return;
    setPendingSpots((prev) => [
      ...prev,
      { spotTypeId, name: spotName.trim(), geometry: { type: 'Point', coordinates: spotPoint[0] } },
    ]);
    setSpotPoint([]);
    setSpotName('');
    setSpotTypeId(null);
    setDrawSpot(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !activityTypeId || !content.trim()) {
      setError('Title, activity type, and content are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const page = await createPage.mutateAsync({
        title: title.trim(),
        summary: summary.trim() || undefined,
        activityTypeId,
        difficultyLevelId: difficultyLevelId ?? undefined,
        durationMinDays: durationMinDays.trim() ? Number(durationMinDays.trim()) : undefined,
        durationMaxDays: durationMaxDays.trim() ? Number(durationMaxDays.trim()) : undefined,
        maxAltitudeMeters: maxAltitudeMeters.trim() ? Number(maxAltitudeMeters.trim()) : undefined,
        districtIds: districtIds.length ? districtIds : undefined,
        seasonIds: seasonIds.length ? seasonIds : undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        content: content.trim(),
        trail:
          trailPoints.length >= 2
            ? { name: trailName.trim() || undefined, geometry: { type: 'LineString', coordinates: trailPoints } }
            : undefined,
        spots: pendingSpots.length ? pendingSpots : undefined,
      });
      router.replace(`/adventures/${page.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create adventure page.');
    } finally {
      setSubmitting(false);
    }
  };

  if (drawTrail) {
    return (
      <Screen scroll={false} contentContainerClassName="gap-3">
        <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
          Draw the trail
        </Text>
        <View className="flex-1">
          <DrawMap points={trailPoints} onPointsChange={setTrailPoints} mode="line" />
        </View>
        <View className="gap-2 px-4 pb-2">
          <TextInput value={trailName} onChangeText={setTrailName} placeholder="Trail name (optional)" />
          <Button disabled={trailPoints.length < 2} onPress={() => setDrawTrail(false)}>
            Done ({trailPoints.length} points)
          </Button>
        </View>
      </Screen>
    );
  }

  if (drawSpot) {
    return (
      <Screen scroll={false} contentContainerClassName="gap-3">
        <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
          Place the spot
        </Text>
        <View className="flex-1">
          <DrawMap points={spotPoint} onPointsChange={setSpotPoint} mode="point" />
        </View>
        <View className="gap-2 px-4 pb-2">
          <TextInput value={spotName} onChangeText={setSpotName} placeholder="Spot name" />
          <Select
            label="Spot type"
            value={spotTypeId}
            options={(spotTypes?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
            onChange={setSpotTypeId}
          />
          <Button disabled={!spotPoint.length || !spotName.trim() || !spotTypeId} onPress={addPendingSpot}>
            Add spot
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">New adventure</Text>

      <Field label="Title">
        <TextInput value={title} onChangeText={setTitle} placeholder="Adventure title" />
      </Field>
      <Field label="Summary">
        <TextArea value={summary} onChangeText={setSummary} numberOfLines={2} placeholder="One-line summary" />
      </Field>
      <Select
        label="Activity type"
        value={activityTypeId}
        options={(activityTypes?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
        onChange={setActivityTypeId}
      />
      <Select
        label="Difficulty level"
        value={difficultyLevelId}
        options={(difficultyLevels?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
        onChange={setDifficultyLevelId}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Min days">
            <TextInput value={durationMinDays} onChangeText={setDurationMinDays} keyboardType="numeric" />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Max days">
            <TextInput value={durationMaxDays} onChangeText={setDurationMaxDays} keyboardType="numeric" />
          </Field>
        </View>
      </View>
      <Field label="Max altitude (m)">
        <TextInput value={maxAltitudeMeters} onChangeText={setMaxAltitudeMeters} keyboardType="numeric" />
      </Field>

      <MultiSelectChips label="Districts" options={districts?.data ?? []} selectedIds={districtIds} onChange={setDistrictIds} />
      <MultiSelectChips label="Seasons" options={seasons?.data ?? []} selectedIds={seasonIds} onChange={setSeasonIds} />
      <MultiSelectChips label="Tags" options={tags?.data ?? []} selectedIds={tagIds} onChange={setTagIds} />

      <Field label="Content (Markdown)">
        <TextArea value={content} onChangeText={setContent} numberOfLines={8} placeholder="Write the full page content…" />
      </Field>

      <View className="gap-2">
        <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">Trail (optional)</Text>
        {trailPoints.length >= 2 ? (
          <Text className="text-sm text-stone-600 dark:text-stone-400">
            {trailName.trim() || 'Unnamed trail'} · {trailPoints.length} points
          </Text>
        ) : null}
        <Button variant="secondary" size="sm" className="self-start" onPress={() => setDrawTrail(true)}>
          {trailPoints.length >= 2 ? 'Edit trail' : 'Draw a trail'}
        </Button>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">Spots (optional)</Text>
        {pendingSpots.map((spot, index) => (
          <Text key={index} className="text-sm text-stone-600 dark:text-stone-400">
            {spot.name}
          </Text>
        ))}
        <Button variant="secondary" size="sm" className="self-start" onPress={() => setDrawSpot(true)}>
          Add a spot
        </Button>
      </View>

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={submitting} onPress={handleSubmit}>
        {submitting ? 'Creating…' : 'Create adventure'}
      </Button>
    </Screen>
  );
}
