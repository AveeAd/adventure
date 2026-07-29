import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../../lib/auth/require-auth';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Field, Input } from '../../../../components/FormField';
import { LazyDrawMap } from '../../../../components/LazyDrawMap';
import type { LngLat } from '../../../../components/DrawMap';

export const Route = createFileRoute('/adventures/$slug/trails/new')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();
    return { page };
  },
  component: NewTrailPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Add a trail to ${loaderData.page.title}` }] : [],
  }),
});

function NewTrailPage() {
  const { page } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const authStatus = useRequireAuth(`/adventures/${slug}/trails/new`);
  const navigate = useNavigate();
  const [points, setPoints] = useState<LngLat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Checking sign-in...</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (points.length < 2) {
      setError('Click at least two points on the map to draw the trail.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await authPost(`/adventure-pages/${page.id}/trails`, {
        name: formData.get('name') || undefined,
        geometry: { type: 'LineString', coordinates: points },
      });
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trail');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Add a trail to {page.title}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Click the map to add points along the route, in order.
      </p>

      <div className="mt-6">
        <LazyDrawMap mode="line" points={points} onPointsChange={setPoints} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
        <span>{points.length} point(s) placed</span>
        <button
          type="button"
          onClick={() => setPoints((p) => p.slice(0, -1))}
          disabled={points.length === 0}
          className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
        >
          Undo last point
        </button>
        <button
          type="button"
          onClick={() => setPoints([])}
          disabled={points.length === 0}
          className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
        >
          Clear
        </button>
      </div>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Name" hint="Optional">
            <Input name="name" />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Adding...' : 'Add trail'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
