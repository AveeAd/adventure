import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useClubJoinRequests, useDecideJoinRequest } from '@/lib/resources/clubs';

// Owner-only screen - route is reachable only from the "Join requests"
// button on the club detail screen, itself gated on isOwner, but the API
// re-checks this server-side too (ensureOwnerOrSiteModerator).
export default function ClubJoinRequests() {
  const { t } = useTranslation('clubs');
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { data: requests, isLoading, isError, refetch } = useClubJoinRequests(clubId);
  const decide = useDecideJoinRequest(clubId);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{t('joinRequests')}</Text>
      {requests?.length ? (
        <View className="gap-2">
          {requests.map((request) => (
            <Card key={request.id} className="flex-row items-center justify-between p-3">
              <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">
                {request.user.username}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onPress={() => decide.mutate({ requestId: request.id, decision: 'APPROVED' })}
                >
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={decide.isPending}
                  onPress={() => decide.mutate({ requestId: request.id, decision: 'DECLINED' })}
                >
                  {t('decline')}
                </Button>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState>{t('emptyJoinRequests')}</EmptyState>
      )}
    </Screen>
  );
}
