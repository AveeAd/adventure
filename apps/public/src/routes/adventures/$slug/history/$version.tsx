import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../lib/auth/session';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
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

    if (version <= 1) {
      const revisionRes = await fetch(apiUrl(`/adventure-pages/${page.id}/revisions/${version}`));
      if (!revisionRes.ok) {
        throw notFound();
      }
      const revision: { content: string } = await revisionRes.json();
      return { slug: params.slug, page, version, mode: 'full' as const, content: revision.content, changes: null };
    }

    const diffRes = await fetch(apiUrl(`/adventure-pages/${page.id}/diff?from=${version - 1}&to=${version}`));
    if (!diffRes.ok) {
      throw notFound();
    }
    const diff: { changes: DiffChange[] } = await diffRes.json();
    return { slug: params.slug, page, version, mode: 'diff' as const, content: null, changes: diff.changes };
  },
  component: RevisionDiffPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `v${loaderData.version} — ${loaderData.page.title}` }] : [],
  }),
});

function RevisionDiffPage() {
  const { slug, page, version, mode, content, changes } = Route.useLoaderData();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Failed to revert');
      setReverting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {page.title} — v{version}
      </h1>

      <Card className="mt-6 overflow-x-auto p-5">
        {mode === 'full' ? (
          <article className="whitespace-pre-wrap font-mono text-sm text-stone-800 dark:text-stone-200">
            {content}
          </article>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {changes?.map((change, index) => (
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

      {signedIn && (
        <div className="mt-4">
          <Button variant="secondary" onClick={handleRevert} disabled={reverting}>
            {reverting ? 'Reverting...' : `Revert to v${version}`}
          </Button>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </Container>
  );
}
