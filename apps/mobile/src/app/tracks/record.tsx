import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { discardRecording, pauseRecording, resumeRecording, stopRecording } from '@/lib/recording/recorder';
import { getActiveSessionId, getSession, type RecordingSession } from '@/lib/recording/store';

function formatElapsed(startedAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n, i) => (i === 0 && n === 0 ? null : String(n).padStart(2, '0'))).filter(Boolean).join(':');
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

// The live recording screen (MOBILE_PLAN.md Phase 4) - a 1s poll of SQLite
// rather than a push subscription, since the source of truth is written by
// both this screen's foreground watcher *and* the background TaskManager
// task, and polling the same store both write paths already update is
// simpler than plumbing an event bus between them.
export default function RecordScreen() {
  const { t } = useTranslation('tracks');
  const router = useRouter();
  const [session, setSession] = useState<RecordingSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const id = await getActiveSessionId();
      if (!id) {
        if (!cancelled) setSession(null);
        return;
      }
      const current = await getSession(id);
      if (!cancelled) setSession(current);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (session === undefined) return <LoadingState />;

  if (session === null) {
    return (
      <Screen contentContainerClassName="items-center justify-center gap-4" scroll={false}>
        <Text className="text-center text-base text-stone-600 dark:text-stone-400">
          {t('recordScreen.noneInProgress')}
        </Text>
        <Button onPress={() => router.replace('/tracks/new')}>{t('recordScreen.startRecording')}</Button>
      </Screen>
    );
  }

  const isPaused = session.status === 'paused';

  const handlePauseResume = async () => {
    if (isPaused) {
      await resumeRecording(session.id);
    } else {
      await pauseRecording(session.id);
    }
  };

  const handleStop = () => {
    Alert.alert(t('recordScreen.finishConfirmTitle'), t('recordScreen.finishConfirmMessage'), [
      { text: t('recordScreen.cancel'), style: 'cancel' },
      {
        text: t('recordScreen.finish'),
        onPress: async () => {
          await stopRecording(session.id);
          router.replace('/tracks');
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert(t('recordScreen.discardConfirmTitle'), t('recordScreen.discardConfirmMessage'), [
      { text: t('recordScreen.cancel'), style: 'cancel' },
      {
        text: t('recordScreen.discard'),
        style: 'destructive',
        onPress: async () => {
          await discardRecording(session.id);
          router.replace('/tracks');
        },
      },
    ]);
  };

  return (
    <Screen contentContainerClassName="flex-1 items-center justify-center gap-8" scroll={false}>
      <View className="items-center gap-2">
        <Text className="text-5xl font-bold tabular-nums text-primary-900 dark:text-primary-100">
          {formatElapsed(session.startedAt)}
        </Text>
        <Text className="text-lg text-stone-600 dark:text-stone-400">{formatDistance(session.distanceMeters)}</Text>
        {isPaused && <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('recordScreen.paused')}</Text>}
      </View>

      <View className="w-full gap-3 px-8">
        <Button size="md" variant={isPaused ? 'primary' : 'secondary'} onPress={handlePauseResume}>
          {isPaused ? t('recordScreen.resume') : t('recordScreen.pause')}
        </Button>
        <Button size="md" variant="accent" onPress={handleStop}>
          {t('recordScreen.finish')}
        </Button>
        <Button size="md" variant="danger" onPress={handleDiscard}>
          {t('recordScreen.discard')}
        </Button>
      </View>
    </Screen>
  );
}
