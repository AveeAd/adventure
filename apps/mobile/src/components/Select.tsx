import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

// No native <select> in RN - this is a modal list picker over a fixed
// option set, standing in for apps/public's FormField.tsx `Select`. Options
// are `{ id, label }` (generic, so it works for both MasterDataOption[] and
// hardcoded enum lists like currency/ThreadTag).
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
}: {
  label: string;
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-lg border-[1.5px] border-stone-300 px-3 py-2.5 dark:border-primary-700"
      >
        <Text
          className={
            selected
              ? 'text-base text-primary-900 dark:text-primary-100'
              : 'text-base text-stone-400 dark:text-stone-500'
          }
        >
          {selected?.label ?? placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <View className="max-h-[70%] rounded-t-2xl bg-white p-4 dark:bg-primary-950">
            <Text className="mb-2 text-lg font-semibold text-primary-900 dark:text-primary-100">
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className="border-b border-stone-100 py-3 dark:border-primary-900"
                >
                  <Text
                    className={
                      item.id === value
                        ? 'text-base font-semibold text-primary-700 dark:text-primary-300'
                        : 'text-base text-primary-900 dark:text-primary-100'
                    }
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
