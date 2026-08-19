import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { getActiveSessionId, listSessions, type RecordingSession } from '@/lib/recording/store';
import { syncOutbox } from '@/lib/recording/outbox';

const SYNC_TONE: Record<RecordingSession['syncStatus'], 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  uploading: 'warning',
  synced: 'success',
  failed: 'danger',
};

function formatDuration(startedAt: number, finishedAt: number | null): string {
  const seconds = Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

// GPS activity recordings, local-first (MOBILE_PLAN.md Phase 4) - every row
// here is read straight from SQLite, not a server query, since a session
// only exists server-side once its outbox entry has synced.
export default function TracksScreen() {
  const { t } = useTranslation('tracks');
  const router = useRouter();
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listSessions().then(setSessions);
    getActiveSessionId().then(setActiveId);
  }, []);

  useFocusEffect(reload);

  return (
    <Screen scroll={false} contentContainerClassName="gap-4">
      <View className="flex-row items-center justify-between px-4 pt-2">
        <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{t('title')}</Text>
        <Button
          size="sm"
          onPress={() => (activeId ? router.push('/tracks/record') : router.push('/tracks/new'))}
        >
          {activeId ? t('resume') : t('recordButton')}
        </Button>
      </View>

      {sessions.some((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed') && (
        <View className="px-4">
          <Button variant="secondary" size="sm" onPress={() => void syncOutbox().then(reload)}>
            {t('syncNow')}
          </Button>
        </View>
      )}

      <FlatList
        className="px-4"
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState>{t('empty')}</EmptyState>}
        renderItem={({ item }) => (
          <Card className="gap-1 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-primary-900 dark:text-primary-100">
                {item.name ?? formatDuration(item.startedAt, item.finishedAt)}
              </Text>
              <Badge tone={item.status !== 'stopped' ? 'neutral' : SYNC_TONE[item.syncStatus]}>
                {item.status !== 'stopped' ? item.status : item.syncStatus}
              </Badge>
            </View>
            <Text className="text-sm text-stone-600 dark:text-stone-400">
              {formatDistance(item.distanceMeters)} · {formatDuration(item.startedAt, item.finishedAt)} ·{' '}
              {t('pointCount', { count: item.pointCount })}
            </Text>
            {item.syncError && item.syncStatus === 'failed' && (
              <Text className="text-xs text-red-600 dark:text-red-400">{item.syncError}</Text>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}
