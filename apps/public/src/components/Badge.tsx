import { useTranslation } from 'react-i18next';

type Tone = 'success' | 'warning' | 'neutral' | 'danger';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  neutral: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// For badges placed over a photo (e.g. the adventure-page hero overlay),
// where the tone's solid light background would clash with the image -
// same tone-tinted text, but a blurred translucent fill instead.
const glassToneClasses: Record<Tone, string> = {
  success: 'border-emerald-200/30 bg-white/10 text-emerald-200 backdrop-blur-md',
  warning: 'border-amber-200/30 bg-white/10 text-amber-200 backdrop-blur-md',
  neutral: 'border-white/25 bg-white/10 text-white backdrop-blur-md',
  danger: 'border-red-200/30 bg-white/10 text-red-200 backdrop-blur-md',
};

const STATUS_TONE: Record<string, Tone> = {
  VERIFIED: 'success',
  UNVERIFIED: 'neutral',
  NEEDS_REVIEW: 'warning',
  PENDING_LICENSE_REVIEW: 'warning',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export function Badge({
  tone = 'neutral',
  glass = false,
  children,
}: {
  tone?: Tone;
  glass?: boolean;
  children: React.ReactNode;
}) {
  const toneClass = glass ? glassToneClasses[tone] : toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${glass ? 'border' : ''} ${toneClass}`}
    >
      {children}
    </span>
  );
}

// One of I18N.md's two named "natural first extraction" enum-label maps -
// moved into common.json's status namespace rather than staying hardcoded.
export function StatusBadge({ status, glass = false }: { status: string; glass?: boolean }) {
  const { t } = useTranslation();
  const key = `status.${status}`;
  const label = t(key, { defaultValue: status });
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} glass={glass}>
      {label}
    </Badge>
  );
}
