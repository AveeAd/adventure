import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authPost } from '../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../lib/auth/session';
import { Button } from './Button';
import { Card } from './Card';
import { Field, Select, Textarea } from './FormField';

export type ReportTargetType =
  | 'ADVENTURE_PAGE'
  | 'PAGE_REVISION'
  | 'TRAIL'
  | 'TRAIL_REVISION'
  | 'SPOT'
  | 'SPOT_REVISION'
  | 'MEDIA'
  | 'TRIP_REPORT'
  | 'COMMENT';

const REASONS = ['FAKE_OR_FALSE', 'INAPPROPRIATE', 'COPYRIGHT', 'DUPLICATE', 'SAFETY_RISK', 'OTHER'] as const;

// MILESTONE_3.md §9.1: "Report control on pages, trails, spots, images and
// stories" - one small reusable component dropped into each existing
// (monolithic) route file rather than restructuring them. Signed-in status
// is only checked lazily, on open, to avoid every instance of this button
// firing its own auth check on page load.
export function ReportButton({
  targetType,
  targetId,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('FAKE_OR_FALSE');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function openPanel() {
    setOpen(true);
    if (signedIn === null) {
      const user = await fetchCurrentUser();
      setSignedIn(!!user);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await authPost('/reports', { targetType, targetId, reason, details: details || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('report.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        aria-label={t('report.button')}
        title={t('report.button')}
        className={
          className ??
          'inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200'
        }
      >
        <Flag className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <Card className="w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <p className="text-sm text-primary-700 dark:text-primary-400">{t('report.submitted')}</p>
        ) : signedIn === false ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('report.signInToReport')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Field label={t('report.reasonLabel')}>
              <Select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`report.reason.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('report.detailsLabel')}>
              <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={submit} disabled={submitting}>
                {submitting ? t('report.submitting') : t('report.submit')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                {t('report.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
