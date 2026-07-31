import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authPost, authUpload } from '../../../../lib/auth/auth-fetch';
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
  const [mode, setMode] = useState<'draw' | 'gpx'>('draw');
  const [points, setPoints] = useState<LngLat[]>([]);
  const [file, setFile] = useState<File | null>(null);
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
    const formData = new FormData(event.currentTarget);
    setError(null);

    if (mode === 'draw') {
      if (points.length < 2) {
        setError('Click at least two points on the map to draw the trail.');
        return;
      }
      setSubmitting(true);
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
      return;
    }

    // GPX-upload path - parsed server-side, per TRAIL_ELEVATION.md
    if (!file) {
      setError('Choose a .gpx file to upload.');
      return;
    }
    setSubmitting(true);
    const uploadData = new FormData();
    uploadData.set('file', file);
    const name = formData.get('name');
    if (name) uploadData.set('name', name as string);

    try {
      await authUpload(`/adventure-pages/${page.id}/trails/import-gpx`, uploadData);
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import GPX file');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Add a trail to {page.title}</h1>

      <div className="mt-4 inline-flex rounded-lg border border-stone-200 p-1 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'draw' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
        >
          Draw on map
        </button>
        <button
          type="button"
          onClick={() => setMode('gpx')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'gpx' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
        >
          Upload GPX
        </button>
      </div>

      {mode === 'draw' ? (
        <>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
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
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          Upload a .gpx track and we'll parse the path (and elevation profile, if the file has it) automatically.
        </p>
      )}

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Name" hint="Optional">
            <Input name="name" />
          </Field>
          {mode === 'gpx' && (
            <Field label="GPX file">
              <input
                type="file"
                accept=".gpx,application/gpx+xml"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-stone-600 dark:text-stone-300"
              />
            </Field>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Adding...' : 'Add trail'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
