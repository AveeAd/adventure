import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { useActivityTypes } from '@/lib/resources/master-data';
import { startRecording } from '@/lib/recording/recorder';

// Activity-type picker gating the start of a recording (MOBILE_PLAN.md
// Phase 4) - CreateActivityTrackDto.activityTypeId is required, so this has
// to happen before the first GPS fix rather than being fixed up afterward.
// A Select + explicit Start button (rather than the earlier tap-a-card
// list, which started recording on the same tap that picked a type) -
// matches the rest of the app's forms and gives a moment to change your
// mind before GPS actually starts.
export default function NewRecordingScreen() {
  const { t } = useTranslation('tracks');
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useActivityTypes();
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const handleStart = async () => {
    if (!activityTypeId) return;
    setStarting(true);
    setError(null);
    try {
      await startRecording({ activityTypeId });
      router.replace('/tracks/record');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newRecording.startError'));
      setStarting(false);
    }
  };

  return (
    <Screen scroll={false} contentContainerClassName="gap-4">
      <Text className="px-4 pt-2 text-2xl font-bold text-primary-900 dark:text-primary-100">
        {t('newRecording.title')}
      </Text>
      <View className="px-4">
        <Select
          label={t('newRecording.activityTypeLabel')}
          value={activityTypeId}
          options={(data?.data ?? []).map((o) => ({ id: o.id, label: o.name }))}
          onChange={setActivityTypeId}
        />
      </View>
      {error ? <Text className="px-4 text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button className="mx-4" disabled={!activityTypeId || starting} onPress={handleStart}>
        {starting ? t('newRecording.starting') : t('newRecording.startButton')}
      </Button>
    </Screen>
  );
}
