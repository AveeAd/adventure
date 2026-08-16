import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type Variant = 'primary' | 'accent' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

// Ported from apps/public/src/components/Button.tsx - same outline
// convention (transparent fill, thick colored border, no glow), minus
// backdrop-blur (no RN equivalent without a native blur lib, and not worth
// it for a border-only style).
const VARIANT_CLASSES: Record<Variant, { border: string; text: string }> = {
  primary: { border: 'border-primary-500', text: 'text-primary-700 dark:text-primary-300' },
  accent: { border: 'border-accent-500', text: 'text-accent-700 dark:text-accent-300' },
  secondary: { border: 'border-stone-400', text: 'text-stone-800 dark:text-stone-100' },
  danger: { border: 'border-red-500', text: 'text-red-700 dark:text-red-400' },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2.5',
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  className?: string;
}) {
  const { border, text } = VARIANT_CLASSES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-full border-[3px] ${border} ${SIZE_CLASSES[size]} ${disabled ? 'opacity-50' : 'active:opacity-70'} ${className}`}
    >
      <Text className={`text-sm font-semibold ${text}`}>{children}</Text>
    </Pressable>
  );
}
