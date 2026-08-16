import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useClub, useClubThreads } from '@/lib/resources/clubs';

export default function ClubDetail() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { data: club, isLoading, isError, refetch } = useClub(clubId);
  const { data: threads } = useClubThreads(clubId);

  if (isLoading) return <LoadingState />;
  if (isError || !club) return <ErrorState onRetry={() => refetch()} />;

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{club.name}</Text>
      {club.description ? (
        <Text className="text-base text-stone-700 dark:text-stone-300">{club.description}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-1.5">
        <Badge tone="neutral">
          {club.memberCount} member{club.memberCount === 1 ? '' : 's'}
        </Badge>
        {club.viewerMembership ? (
          <Badge tone="success">{club.viewerMembership.status}</Badge>
        ) : null}
      </View>

      {club.members?.length ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">Members</Text>
          {club.members.map((member) => (
            <Text key={member.user.id} className="text-sm text-stone-700 dark:text-stone-300">
              {member.user.username} · {member.role}
            </Text>
          ))}
        </View>
      ) : null}

      <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">Threads</Text>
      {threads?.data.length ? (
        <View className="gap-2">
          {threads.data.map((thread) => (
            <Link key={thread.id} href={`/clubs/${clubId}/threads/${thread.id}`} asChild>
              <Card className="p-3" onPress={() => {}}>
                <View className="flex-row items-center gap-2">
                  <UserRef userId={thread.authorId} className="text-sm font-medium text-primary-700 dark:text-primary-400" />
                  {thread.isPinned ? <Badge tone="warning">Pinned</Badge> : null}
                </View>
                <Text className="mt-1 text-sm text-stone-700 dark:text-stone-300" numberOfLines={2}>
                  {thread.content}
                </Text>
                <Text className="mt-1 text-xs text-stone-500 dark:text-stone-500">
                  {thread.replyCount} repl{thread.replyCount === 1 ? 'y' : 'ies'}
                </Text>
              </Card>
            </Link>
          ))}
        </View>
      ) : (
        <EmptyState>No threads yet.</EmptyState>
      )}
    </Screen>
  );
}
