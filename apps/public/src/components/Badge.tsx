import { useTranslation } from 'react-i18next';

type Tone = 'success' | 'warning' | 'neutral' | 'danger';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  neutral: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
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

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

// One of I18N.md's two named "natural first extraction" enum-label maps -
// moved into common.json's status namespace rather than staying hardcoded.
export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const key = `status.${status}`;
  const label = t(key, { defaultValue: status });
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{label}</Badge>;
}
