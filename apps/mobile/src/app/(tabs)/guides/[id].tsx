import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge, StatusBadge } from '@/components/Badge';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useGuideProfile } from '@/lib/resources/guide-profiles';

export default function GuideDetail() {
  const { t } = useTranslation('guides');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: guide, isLoading, isError, refetch } = useGuideProfile(id);

  if (isLoading) return <LoadingState />;
  if (isError || !guide) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <UserRef
        userId={guide.userId}
        className="text-2xl font-bold text-primary-900 dark:text-primary-100"
      />
      <StatusBadge status={guide.verificationStatus} />

      {guide.bio ? (
        <Text className="text-base text-stone-700 dark:text-stone-300">{guide.bio}</Text>
      ) : null}

      {guide.rateMin || guide.rateMax ? (
        <Text className="text-sm text-stone-600 dark:text-stone-400">
          {t('rate', {
            rateMin: guide.rateMin ?? '?',
            rateMax: guide.rateMax ?? '?',
            currency: guide.currency,
            rateUnit: guide.rateUnit,
          })}
        </Text>
      ) : null}

      {guide.specialties.length ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            {t('specialties')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {guide.specialties.map((s) => (
              <Badge key={s.activityType.name}>{s.activityType.name}</Badge>
            ))}
          </View>
        </View>
      ) : null}

      {guide.regions.length ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            {t('regions')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {guide.regions.map((r) => (
              <Badge key={r.district.name} tone="neutral">
                {r.district.name}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}

      {guide.languages.length ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            {t('languages')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {guide.languages.map((l) => (
              <Badge key={l.language.name} tone="success">
                {l.language.name}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
