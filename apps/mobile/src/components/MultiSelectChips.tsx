import { Pressable, Text, View } from 'react-native';

// RN equivalent of apps/public/src/components/MultiSelectChips.tsx -
// toggleable chip row over an id array, backing districts/seasons/tags
// multi-select on the page-create form.
export function MultiSelectChips({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedIds.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => toggle(option.id)}
              className={`rounded-full border-[1.5px] px-3 py-1.5 ${
                active
                  ? 'border-primary-600 bg-primary-100 dark:border-primary-400 dark:bg-primary-900'
                  : 'border-stone-300 dark:border-primary-800'
              }`}
            >
              <Text
                className={`text-sm ${
                  active
                    ? 'font-medium text-primary-800 dark:text-primary-200'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
