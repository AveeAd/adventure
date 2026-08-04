import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import i18n from '../../../../lib/i18n';
import { formatDateTime } from '../../../../lib/format';
import { StatusBadge } from '../../../../components/Badge';
import { Container } from '../../../../components/Container';
import { UserRef } from '../../../../components/UserRef';

interface RevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  approvalStatus: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
}

export const Route = createFileRoute('/adventures/$slug/history/')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();

    const revisionsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/revisions`));
    const revisions: RevisionSummary[] = revisionsRes.ok ? await revisionsRes.json() : [];

    return { slug: params.slug, page, revisions: revisions.sort((a, b) => b.version - a.version) };
  },
  component: HistoryPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: i18n.t('adventurePage:history.title', { name: loaderData.page.title }) }] : [],
  }),
});

function HistoryPage() {
  const { slug, page, revisions } = Route.useLoaderData();
  const { t } = useTranslation('adventurePage');

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {t('history.title', { name: page.title })}
      </h1>

      <ol className="mt-6 flex flex-col">
        {revisions.map((revision, index) => (
          <li key={revision.id} className="relative flex gap-4 pb-8 last:pb-0">
            {index !== revisions.length - 1 && (
              <span className="absolute top-3 left-[5px] h-full w-px bg-stone-200 dark:bg-stone-800" />
            )}
            <span className="relative z-10 mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary-500" />
            <div>
              <Link
                to="/adventures/$slug/history/$version"
                params={{ slug, version: String(revision.version) }}
                className="font-medium text-primary-700 hover:underline dark:text-primary-400"
              >
                v{revision.version}
              </Link>
              <span className="ml-2 text-sm text-stone-500 dark:text-stone-400">
                {formatDateTime(revision.createdAt)}
              </span>
              <span className="ml-2">
                <StatusBadge status={revision.approvalStatus} />
              </span>
              {revision.isSafetyCriticalEdit && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t('history.safetyCritical')}
                </span>
              )}
              {revision.editSummary && (
                <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{revision.editSummary}</p>
              )}
              {revision.resolvedById && (
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                  {revision.approvalStatus === 'REJECTED' ? t('history.declinedBy') : t('history.approvedBy')}{' '}
                  <UserRef userId={revision.resolvedById} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Container>
  );
}
