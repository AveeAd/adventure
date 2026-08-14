import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import i18n from '../../../../lib/i18n';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../lib/auth/session';
import { StatusBadge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { UserRef } from '../../../../components/UserRef';
import { VoteControls } from '../../../../components/VoteControls';
import { formatDateTime } from '../../../../lib/format';
import { buildMeta } from '../../../../lib/seo';

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface RevisionDetail {
  id: string;
  version: number;
  content: string;
  editorId: string;
  approvalStatus: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  rejectionReason: string | null;
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

export const Route = createFileRoute('/adventures/$slug/history/$version')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();
    const version = Number(params.version);

    const revisionRes = await fetch(apiUrl(`/adventure-pages/${page.id}/revisions/${version}`));
    if (!revisionRes.ok) {
      throw notFound();
    }
    const revision: RevisionDetail = await revisionRes.json();

    let changes: DiffChange[] | null = null;
    if (version > 1) {
      const diffRes = await fetch(apiUrl(`/adventure-pages/${page.id}/diff?from=${version - 1}&to=${version}`));
      if (diffRes.ok) {
        const diff: { changes: DiffChange[] } = await diffRes.json();
        changes = diff.changes;
      }
    }
    return { slug: params.slug, page, version, revision, changes };
  },
  component: RevisionDiffPage,
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData
        ? i18n.t('adventurePage:history.diffTitle', { name: loaderData.page.title, version: loaderData.version })
        : i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/adventures/${params.slug}/history/${params.version}`,
      noindex: true,
    }),
});

function RevisionDiffPage() {
  const { slug, page, version, revision: initialRevision, changes } = Route.useLoaderData();
  const navigate = useNavigate();
  const { t } = useTranslation('adventurePage');
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);
  const [revision, setRevision] = useState(initialRevision);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  async function handleRevert() {
    setError(null);
    setReverting(true);
    try {
      await authPost(`/adventure-pages/${page.id}/revisions/${version}/revert`);
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToRevert'));
      setReverting(false);
    }
  }

  return (
    <Container>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {t('history.diffTitle', { name: page.title, version })}
        </h1>
        <StatusBadge status={revision.approvalStatus} />
      </div>

      {revision.resolvedById && (
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {revision.approvalStatus === 'REJECTED' ? t('history.declinedBy') : t('history.approvedBy')}{' '}
          <UserRef userId={revision.resolvedById} />
          {revision.resolvedAt && <> {t('history.resolvedAt', { date: formatDateTime(revision.resolvedAt) })}</>}
        </p>
      )}
      {revision.rejectionReason && (
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {t('history.rejectionReason', { reason: revision.rejectionReason })}
        </p>
      )}

      <Card className="mt-6 overflow-x-auto p-5">
        {changes === null ? (
          <article className="whitespace-pre-wrap font-mono text-sm text-stone-800 dark:text-stone-200">
            {revision.content}
          </article>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {changes.map((change, index) => (
              <span
                key={index}
                className={
                  change.added
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : change.removed
                      ? 'bg-red-100 text-red-900 line-through dark:bg-red-900/40 dark:text-red-200'
                      : 'text-stone-700 dark:text-stone-300'
                }
              >
                {change.value}
              </span>
            ))}
          </pre>
        )}
      </Card>

      <VoteControls
        voteUrl={`/adventure-pages/${page.id}/revisions/${version}/votes`}
        editorId={revision.editorId}
        approvalStatus={revision.approvalStatus}
        approveCount={revision.approveCount}
        rejectCount={revision.rejectCount}
        threshold={revision.threshold}
        onVoted={(result) =>
          setRevision((r) => ({
            ...r,
            approveCount: result.approveCount,
            rejectCount: result.rejectCount,
            approvalStatus: result.outcome,
          }))
        }
      />

      {signedIn && (
        <div className="mt-4">
          <Button variant="secondary" onClick={handleRevert} disabled={reverting}>
            {reverting ? t('history.reverting') : t('history.revert', { version })}
          </Button>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </Container>
  );
}
