import { Text, View } from 'react-native';

// Ported from apps/public/src/components/Avatar.tsx - same deterministic
// hash-to-palette logic, so the same name renders the same color on both apps.
const PALETTE = [
  'bg-primary-100 dark:bg-primary-900',
  'bg-accent-100 dark:bg-accent-900',
  'bg-amber-100 dark:bg-amber-900',
];
const PALETTE_TEXT = [
  'text-primary-800 dark:text-primary-200',
  'text-accent-800 dark:text-accent-200',
  'text-amber-800 dark:text-amber-200',
];

function paletteIndexFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

const SIZE_CLASSES = {
  sm: { box: 'h-6 w-6', text: 'text-xs' },
  md: { box: 'h-9 w-9', text: 'text-sm' },
  lg: { box: 'h-16 w-16', text: 'text-xl' },
};

export function Avatar({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const paletteIndex = paletteIndexFor(label);
  const { box, text } = SIZE_CLASSES[size];

  return (
    <View
      className={`items-center justify-center rounded-full ${box} ${PALETTE[paletteIndex]}`}
    >
      <Text className={`font-semibold ${text} ${PALETTE_TEXT[paletteIndex]}`}>
        {initials || '?'}
      </Text>
    </View>
  );
}
