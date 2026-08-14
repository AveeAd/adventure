import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';
import { authFetch, authPatch } from '../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { formatDateTime } from '../../lib/format';
import { buildMeta } from '../../lib/seo';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';
import { Textarea } from '../../components/FormField';

interface ContentReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  createdAt: string;
}

// MILESTONE_3.md §9.1: "Review queue route for level-10+ users" applies to
// reports too, not just pending revisions - resolving a report is the same
// eligibility class (see ReportsService.assertCanResolve). Deliberately no
// deep link to the reported content itself (unlike review-queue's targetLink)
// - a report can point at a bare revision/media/comment id with no cheap way
// to resolve it back to a page slug from this list response; triage here is
// "what/why/who", not "jump straight to the diff".
export const Route = createFileRoute('/reports/')({
  component: ReportsQueuePage,
  // Auth-gated moderation queue, not a public "trip reports" listing despite
  // the route name - noindex like review-queue, not indexable.
  head: () =>
    buildMeta({
      title: i18n.t('report.queueTitle'),
      description: i18n.t('report.queueDescription'),
      path: '/reports',
      noindex: true,
    }),
});

function ReportsQueuePage() {
  const authStatus = useRequireAuth('/reports');
  const { t } = useTranslation('common');
  const [rows, setRows] = useState<ContentReportRow[] | 'loading' | 'forbidden'>('loading');

  const reload = () => {
    if (authStatus !== 'authenticated') return;
    setRows('loading');
    authFetch('/reports?status=PENDING&pageSize=50').then(async (res) => {
      if (res.status === 403) {
        setRows('forbidden');
        return;
      }
      const body: { data: ContentReportRow[] } = res.ok ? await res.json() : { data: [] };
      setRows(body.data);
    });
  };

  useEffect(reload, [authStatus]);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('report.queueTitle')}</h1>

      <div className="mt-6">
        {rows === 'loading' ? (
          <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
        ) : rows === 'forbidden' ? (
          <EmptyState>{t('report.queueNotEligible')}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>{t('report.queueEmpty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.id}>
                <ReportRow row={row} onResolved={reload} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function ReportRow({ row, onResolved }: { row: ContentReportRow; onResolved: () => void }) {
  const { t } = useTranslation('common');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(decision: 'UPHELD' | 'REJECTED') {
    setSubmitting(true);
    setError(null);
    try {
      await authPatch(`/reports/${row.id}/resolve`, { decision, resolutionNote: note || undefined });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('report.resolveError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{t(`report.targetType.${row.targetType}`)}</Badge>
        <span className="font-medium text-stone-900 dark:text-stone-50">{t(`report.reason.${row.reason}`)}</span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {row.targetId.slice(0, 8)}… · {formatDateTime(row.createdAt)}
        </span>
      </div>
      {row.details && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{row.details}</p>}

      <div className="mt-3 flex flex-col gap-2">
        <Textarea
          rows={1}
          placeholder={t('report.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={() => resolve('UPHELD')} disabled={submitting}>
            {t('report.uphold')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => resolve('REJECTED')} disabled={submitting}>
            {t('report.reject')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
