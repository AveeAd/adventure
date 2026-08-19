import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useActivityTypes } from '@/lib/resources/master-data';
import { startRecording } from '@/lib/recording/recorder';

// Activity-type picker gating the start of a recording (MOBILE_PLAN.md
// Phase 4) - CreateActivityTrackDto.activityTypeId is required, so this has
// to happen before the first GPS fix rather than being fixed up afterward.
export default function NewRecordingScreen() {
  const { t } = useTranslation('tracks');
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useActivityTypes();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const handleStart = async (activityTypeId: string) => {
    setStarting(activityTypeId);
    setError(null);
    try {
      await startRecording({ activityTypeId });
      router.replace('/tracks/record');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newRecording.startError'));
      setStarting(null);
    }
  };

  return (
    <Screen scroll={false} contentContainerClassName="gap-4">
      <Text className="px-4 pt-2 text-2xl font-bold text-primary-900 dark:text-primary-100">
        {t('newRecording.title')}
      </Text>
      {error && <Text className="px-4 text-sm text-red-600 dark:text-red-400">{error}</Text>}
      <FlatList
        className="px-4"
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card onPress={() => handleStart(item.id)} className="p-4">
            <Text className="font-medium text-primary-900 dark:text-primary-100">
              {starting === item.id ? t('newRecording.starting') : item.name}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
