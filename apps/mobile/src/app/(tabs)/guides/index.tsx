import type { MasterDataOption } from '@adventure/api-types';
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { UserRef } from '@/components/UserRef';
import { useGuideProfiles } from '@/lib/resources/guide-profiles';
import { useActivityTypes, useDistricts, useLanguages } from '@/lib/resources/master-data';

function FilterChips({
  options,
  selectedId,
  onSelect,
}: {
  options: MasterDataOption[];
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(option) => option.id}
      className="mb-2"
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(selected ? undefined : item.id)}
            className={`mr-2 rounded-full border-2 px-3 py-1.5 ${
              selected ? 'border-primary-600 bg-primary-100 dark:bg-primary-900' : 'border-stone-300 dark:border-stone-600'
            }`}
          >
            <Text className="text-sm text-primary-900 dark:text-primary-100">{item.name}</Text>
          </Pressable>
        );
      }}
    />
  );
}

export default function GuidesList() {
  const [activityTypeId, setActivityTypeId] = useState<string>();
  const [districtId, setDistrictId] = useState<string>();
  const [languageId, setLanguageId] = useState<string>();

  const { data: activityTypes } = useActivityTypes();
  const { data: districts } = useDistricts();
  const { data: languages } = useLanguages();
  const { data, isLoading, isError, refetch } = useGuideProfiles({
    activityTypeId,
    districtId,
    languageId,
  });

  return (
    <Screen scroll={false}>
      <Text className="mb-4 text-2xl font-bold text-primary-900 dark:text-primary-100">Guides</Text>

      {activityTypes?.data.length ? (
        <FilterChips options={activityTypes.data} selectedId={activityTypeId} onSelect={setActivityTypeId} />
      ) : null}
      {districts?.data.length ? (
        <FilterChips options={districts.data} selectedId={districtId} onSelect={setDistrictId} />
      ) : null}
      {languages?.data.length ? (
        <FilterChips options={languages.data} selectedId={languageId} onSelect={setLanguageId} />
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(guide) => guide.id}
          contentContainerClassName="gap-3 pt-2"
          renderItem={({ item }) => (
            <Link href={`/guides/${item.id}`} asChild>
              <Card className="p-3" onPress={() => {}}>
                <UserRef userId={item.userId} className="font-medium text-primary-900 dark:text-primary-100" />
                {item.bio ? (
                  <Text className="mt-1 text-sm text-stone-600 dark:text-stone-400" numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : null}
                <View className="mt-2 flex-row flex-wrap gap-1.5">
                  {item.specialties.map((s) => (
                    <Text key={s.activityType.name} className="text-xs text-primary-700 dark:text-primary-400">
                      {s.activityType.name}
                    </Text>
                  ))}
                </View>
              </Card>
            </Link>
          )}
          ListEmptyComponent={<EmptyState>No guides match these filters.</EmptyState>}
        />
      )}
    </Screen>
  );
}
