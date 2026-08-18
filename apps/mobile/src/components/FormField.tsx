import type { ReactNode } from 'react';
import { Text, TextInput as RNTextInput, View } from 'react-native';

// RN equivalent of apps/public/src/components/FormField.tsx's Field/Input/
// Textarea - no native <select>, so the picker equivalent lives in
// Select.tsx instead. Every Phase 5 create/edit form is built from these.
export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">{label}</Text>
      {children}
      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
    </View>
  );
}

const INPUT_CLASSES =
  'rounded-lg border-[1.5px] border-stone-300 px-3 py-2.5 text-base text-primary-900 dark:border-primary-700 dark:text-primary-100';

export function TextInput(props: React.ComponentProps<typeof RNTextInput>) {
  return (
    <RNTextInput placeholderTextColor="#8ebe9d" className={INPUT_CLASSES} {...props} />
  );
}

export function TextArea({
  numberOfLines = 5,
  ...props
}: React.ComponentProps<typeof RNTextInput>) {
  return (
    <RNTextInput
      placeholderTextColor="#8ebe9d"
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      className={`${INPUT_CLASSES} min-h-[100px]`}
      {...props}
    />
  );
}
