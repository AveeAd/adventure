import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Tone = 'success' | 'warning' | 'neutral' | 'danger';

// Ported from apps/public/src/components/Badge.tsx, minus the `glass`
// variant (see Card.tsx) and minus i18next (mobile hardcodes English
// strings until MOBILE_PLAN.md Phase 7 wires up i18n - not a Phase 2 concern).
const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900',
  warning: 'bg-amber-100 dark:bg-amber-900',
  neutral: 'bg-stone-100 dark:bg-stone-800',
  danger: 'bg-red-100 dark:bg-red-900',
};

const TONE_TEXT_CLASSES: Record<Tone, string> = {
  success: 'text-emerald-800 dark:text-emerald-300',
  warning: 'text-amber-800 dark:text-amber-300',
  neutral: 'text-stone-700 dark:text-stone-300',
  danger: 'text-red-800 dark:text-red-300',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${TONE_CLASSES[tone]}`}>
      <Text className={`text-xs font-medium ${TONE_TEXT_CLASSES[tone]}`}>{children}</Text>
    </View>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  VERIFIED: 'success',
  UNVERIFIED: 'neutral',
  NEEDS_REVIEW: 'warning',
  PENDING_LICENSE_REVIEW: 'warning',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>;
}
