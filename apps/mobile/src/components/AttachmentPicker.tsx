import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { authGet } from '@/lib/auth-fetch';
import { TextInput } from './FormField';

export type AttachmentType = 'tripReport' | 'trail' | 'spot' | 'adventurePage';

export interface AttachmentOption {
  id: string;
  label: string;
}

const SEARCH_PATH: Record<AttachmentType, string> = {
  tripReport: '/trip-reports/search',
  trail: '/trails/search',
  spot: '/spots/search',
  adventurePage: '/adventure-pages/search',
};

// adventurePage reuses the real paginated full-text search endpoint
// ({data:[...]}); the other three are the minimal id+title/name arrays
// CLAUDE.md documents as a deliberate narrow stopgap built only to back
// this picker (apps/public's version, mirrored here).
async function search(type: AttachmentType, q: string): Promise<AttachmentOption[]> {
  if (type === 'adventurePage') {
    const body = await authGet<{ data: { id: string; title: string }[] }>(
      `${SEARCH_PATH[type]}?q=${encodeURIComponent(q)}`,
    );
    return body.data.map((row) => ({ id: row.id, label: row.title }));
  }
  const rows = await authGet<{ id: string; title?: string; name?: string }[]>(
    `${SEARCH_PATH[type]}?q=${encodeURIComponent(q)}`,
  );
  return rows.map((row) => ({ id: row.id, label: row.title ?? row.name ?? row.id }));
}

// RN port of apps/public/src/components/AttachmentPicker.tsx's
// search-as-you-type combobox for the club-thread composer's four optional
// attachments. No overlay/absolute positioning here (RN has no reliable
// z-index-over-siblings story without a portal) - results render inline
// below the input and push the rest of the form down instead.
export function AttachmentPicker({
  type,
  label,
  value,
  onChange,
}: {
  type: AttachmentType;
  label: string;
  value: AttachmentOption | null;
  onChange: (value: AttachmentOption | null) => void;
}) {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AttachmentOption[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    // Both branches' setState calls live inside the timeout callback (never
    // synchronously in the effect body) so an empty query still debounces
    // through the same path instead of clearing options immediately.
    const handle = setTimeout(
      () => {
        if (!trimmed) {
          setOptions([]);
          return;
        }
        search(type, trimmed)
          .then(setOptions)
          .catch(() => setOptions([]));
      },
      trimmed ? 250 : 0,
    );
    return () => clearTimeout(handle);
  }, [type, query]);

  if (value) {
    return (
      <View className="flex-row items-center justify-between rounded-lg border-[1.5px] border-stone-300 px-3 py-2.5 dark:border-primary-700">
        <Text className="flex-1 text-sm text-primary-900 dark:text-primary-100">
          {label}: <Text className="font-semibold">{value.label}</Text>
        </Text>
        <Pressable onPress={() => onChange(null)} hitSlop={8}>
          <Ionicons name="close" size={16} color="#8ebe9d" />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('attachmentPicker.searchPlaceholder', { label: label.toLowerCase() })}
      />
      {options.length > 0 ? (
        <View className="overflow-hidden rounded-lg border-[1.5px] border-stone-300 dark:border-primary-700">
          {options.map((option, index) => (
            <Pressable
              key={option.id}
              onPress={() => {
                onChange(option);
                setQuery('');
                setOptions([]);
              }}
              className={`px-3 py-2.5 ${index < options.length - 1 ? 'border-b border-stone-100 dark:border-primary-900' : ''}`}
            >
              <Text className="text-sm text-primary-900 dark:text-primary-100">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
