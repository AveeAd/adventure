import type { CreateSpotRequest } from '@adventure/api-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('adventurePage');
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
      setError(t('newPage.requiredFieldsError'));
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
      setError(err instanceof Error ? err.message : t('newPage.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (drawTrail) {
    return (
      <Screen scroll={false} contentContainerClassName="gap-3">
        <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
          {t('newPage.drawTrailTitle')}
        </Text>
        <View className="flex-1">
          <DrawMap points={trailPoints} onPointsChange={setTrailPoints} mode="line" />
        </View>
        <View className="gap-2 px-4 pb-2">
          <TextInput value={trailName} onChangeText={setTrailName} placeholder={t('newPage.trailNamePlaceholder')} />
          <Button disabled={trailPoints.length < 2} onPress={() => setDrawTrail(false)}>
            {t('newPage.doneWithPoints', { count: trailPoints.length })}
          </Button>
        </View>
      </Screen>
    );
  }

  if (drawSpot) {
    return (
      <Screen scroll={false} contentContainerClassName="gap-3">
        <Text className="px-4 pt-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
          {t('newPage.placeSpotTitle')}
        </Text>
        <View className="flex-1">
          <DrawMap points={spotPoint} onPointsChange={setSpotPoint} mode="point" />
        </View>
        <View className="gap-2 px-4 pb-2">
          <TextInput value={spotName} onChangeText={setSpotName} placeholder={t('newPage.spotNamePlaceholder')} />
          <Select
            label={t('newPage.spotTypeLabel')}
            value={spotTypeId}
            options={(spotTypes?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
            onChange={setSpotTypeId}
          />
          <Button disabled={!spotPoint.length || !spotName.trim() || !spotTypeId} onPress={addPendingSpot}>
            {t('newPage.addSpot')}
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{t('newPage.title')}</Text>

      <Field label={t('newPage.titleLabel')}>
        <TextInput value={title} onChangeText={setTitle} placeholder={t('newPage.titlePlaceholder')} />
      </Field>
      <Field label={t('newPage.summaryLabel')}>
        <TextArea value={summary} onChangeText={setSummary} numberOfLines={2} placeholder={t('newPage.summaryPlaceholder')} />
      </Field>
      <Select
        label={t('newPage.activityTypeLabel')}
        value={activityTypeId}
        options={(activityTypes?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
        onChange={setActivityTypeId}
      />
      <Select
        label={t('newPage.difficultyLevelLabel')}
        value={difficultyLevelId}
        options={(difficultyLevels?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
        onChange={setDifficultyLevelId}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label={t('newPage.minDaysLabel')}>
            <TextInput value={durationMinDays} onChangeText={setDurationMinDays} keyboardType="numeric" />
          </Field>
        </View>
        <View className="flex-1">
          <Field label={t('newPage.maxDaysLabel')}>
            <TextInput value={durationMaxDays} onChangeText={setDurationMaxDays} keyboardType="numeric" />
          </Field>
        </View>
      </View>
      <Field label={t('newPage.maxAltitudeLabel')}>
        <TextInput value={maxAltitudeMeters} onChangeText={setMaxAltitudeMeters} keyboardType="numeric" />
      </Field>

      <MultiSelectChips label={t('newPage.districtsLabel')} options={districts?.data ?? []} selectedIds={districtIds} onChange={setDistrictIds} />
      <MultiSelectChips label={t('newPage.seasonsLabel')} options={seasons?.data ?? []} selectedIds={seasonIds} onChange={setSeasonIds} />
      <MultiSelectChips label={t('newPage.tagsLabel')} options={tags?.data ?? []} selectedIds={tagIds} onChange={setTagIds} />

      <Field label={t('newPage.contentLabel')}>
        <TextArea value={content} onChangeText={setContent} numberOfLines={8} placeholder={t('newPage.contentPlaceholder')} />
      </Field>

      <View className="gap-2">
        <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">{t('newPage.trailSectionTitle')}</Text>
        {trailPoints.length >= 2 ? (
          <Text className="text-sm text-stone-600 dark:text-stone-400">
            {t('newPage.trailSummary', { name: trailName.trim() || t('newPage.unnamedTrail'), count: trailPoints.length })}
          </Text>
        ) : null}
        <Button variant="secondary" size="sm" className="self-start" onPress={() => setDrawTrail(true)}>
          {trailPoints.length >= 2 ? t('newPage.editTrail') : t('newPage.drawTrail')}
        </Button>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">{t('newPage.spotsSectionTitle')}</Text>
        {pendingSpots.map((spot, index) => (
          <Text key={index} className="text-sm text-stone-600 dark:text-stone-400">
            {spot.name}
          </Text>
        ))}
        <Button variant="secondary" size="sm" className="self-start" onPress={() => setDrawSpot(true)}>
          {t('newPage.addSpotButton')}
        </Button>
      </View>

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={submitting} onPress={handleSubmit}>
        {submitting ? t('newPage.creating') : t('newPage.createButton')}
      </Button>
    </Screen>
  );
}
