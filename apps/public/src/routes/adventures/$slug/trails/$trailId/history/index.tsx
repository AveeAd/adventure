import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { apiUrl } from '../../../../../../lib/auth/api';
import { formatDateTime } from '../../../../../../lib/format';
import { Container } from '../../../../../../components/Container';

interface RevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: string;
}

export const Route = createFileRoute('/adventures/$slug/trails/$trailId/history/')({
  loader: async ({ params }) => {
    const trailRes = await fetch(apiUrl(`/trails/${params.trailId}`));
    if (trailRes.status === 404) {
      throw notFound();
    }
    if (!trailRes.ok) {
      throw new Error('Failed to load trail');
    }
    const trail: { id: string; name: string | null } = await trailRes.json();

    const revisionsRes = await fetch(apiUrl(`/trails/${trail.id}/revisions`));
    const revisions: RevisionSummary[] = revisionsRes.ok ? await revisionsRes.json() : [];

    return { slug: params.slug, trail, revisions: revisions.sort((a, b) => b.version - a.version) };
  },
  component: TrailHistoryPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `History — ${loaderData.trail.name ?? 'Trail'}` }] : [],
  }),
});

function TrailHistoryPage() {
  const { slug, trail, revisions } = Route.useLoaderData();

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        History — {trail.name ?? 'Trail'}
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
                to="/adventures/$slug/trails/$trailId/history/$version"
                params={{ slug, trailId: trail.id, version: String(revision.version) }}
                className="font-medium text-primary-700 hover:underline dark:text-primary-400"
              >
                v{revision.version}
              </Link>
              <span className="ml-2 text-sm text-stone-500 dark:text-stone-400">
                {formatDateTime(revision.createdAt)}
              </span>
              {revision.isSafetyCriticalEdit && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> safety-critical
                </span>
              )}
              {revision.editSummary && (
                <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{revision.editSummary}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Container>
  );
}
