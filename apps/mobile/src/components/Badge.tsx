import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Tone = 'success' | 'warning' | 'neutral' | 'danger';

// Ported from apps/public/src/components/Badge.tsx, now including its
// `glass` variant too (originally skipped - CLAUDE.md's own note was "no
// mobile screen has a photo-hero treatment to sit on top of" yet; the
// adventure detail hero now does) and minus i18next (mobile hardcodes
// English strings until MOBILE_PLAN.md Phase 7 wires up i18n - not a
// Phase 2 concern).
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

// Darker fill than web's own bg-white/10 - web's badges sit on top of its
// own dark hero overlay div (a solid tint, not a photo with arbitrarily
// light patches), so a faint white tint still has guaranteed contrast
// there. This is a real photo behind a gradient scrim, so a near-black
// fill (rather than white) is what actually keeps the light-toned text
// readable regardless of what's in that patch of the photo. Split into a
// surface map (View) and a text map (Text), not one combined class string
// for both, so the border/bg utilities in the surface map never land on
// the Text node too (RN Text can render its own border - reusing one
// string for both would double it up as a border around the glyph bounds).
const GLASS_SURFACE_CLASSES: Record<Tone, string> = {
  success: 'border-emerald-200/30 bg-black/45',
  warning: 'border-amber-200/30 bg-black/45',
  neutral: 'border-white/30 bg-black/45',
  danger: 'border-red-200/30 bg-black/45',
};

const GLASS_TEXT_CLASSES: Record<Tone, string> = {
  success: 'text-emerald-200',
  warning: 'text-amber-200',
  neutral: 'text-white',
  danger: 'text-red-200',
};

export function Badge({
  tone = 'neutral',
  glass = false,
  children,
}: {
  tone?: Tone;
  // For badges placed over a photo (e.g. the adventure-page hero overlay),
  // where the tone's solid light background would clash with the image.
  glass?: boolean;
  children: ReactNode;
}) {
  if (glass) {
    return (
      <View className={`rounded-full border px-2.5 py-0.5 ${GLASS_SURFACE_CLASSES[tone]}`}>
        <Text className={`text-xs font-medium ${GLASS_TEXT_CLASSES[tone]}`}>{children}</Text>
      </View>
    );
  }
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
