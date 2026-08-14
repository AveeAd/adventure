import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import i18n from '../../../../lib/i18n';
import { authPost, authUpload } from '../../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../../lib/auth/require-auth';
import { buildMeta } from '../../../../lib/seo';
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
    const trailsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/trails`));
    const trails: unknown[] = trailsRes.ok ? await trailsRes.json() : [];
    return { page, hasExistingTrail: trails.length > 0 };
  },
  component: NewTrailPage,
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData ? i18n.t('adventurePage:addTrailTitle', { title: loaderData.page.title }) : i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/adventures/${params.slug}/trails/new`,
      noindex: true,
    }),
});

function NewTrailPage() {
  const { page, hasExistingTrail } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const authStatus = useRequireAuth(`/adventures/${slug}/trails/new`);
  const navigate = useNavigate();
  const { t } = useTranslation(['adventurePage', 'common']);
  const [mode, setMode] = useState<'draw' | 'gpx'>('draw');
  const [points, setPoints] = useState<LngLat[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.checkingSignIn')}</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    if (mode === 'draw') {
      if (points.length < 2) {
        setError(t('errors.needTwoPoints'));
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
        setError(err instanceof Error ? err.message : t('errors.failedToAddTrail'));
        setSubmitting(false);
      }
      return;
    }

    // GPX-upload path - parsed server-side, per TRAIL_ELEVATION.md
    if (!file) {
      setError(t('errors.needGpxFile'));
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
      setError(err instanceof Error ? err.message : t('errors.failedToImportGpx'));
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {hasExistingTrail ? t('updateTrailTitle', { title: page.title }) : t('addTrailTitle', { title: page.title })}
      </h1>
      {hasExistingTrail && (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('updateTrailNotice')}</p>
      )}

      <div className="mt-4 inline-flex rounded-lg border border-stone-200 p-1 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'draw' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
        >
          {t('actions.drawOnMap')}
        </button>
        <button
          type="button"
          onClick={() => setMode('gpx')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'gpx' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
        >
          {t('actions.uploadGpx')}
        </button>
      </div>

      {mode === 'draw' ? (
        <>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('draw.instructions')}</p>
          <div className="mt-6">
            <LazyDrawMap mode="line" points={points} onPointsChange={setPoints} />
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <span>{t('draw.pointsPlaced', { count: points.length })}</span>
            <button
              type="button"
              onClick={() => setPoints((p) => p.slice(0, -1))}
              disabled={points.length === 0}
              className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
            >
              {t('actions.undoLastPoint')}
            </button>
            <button
              type="button"
              onClick={() => setPoints([])}
              disabled={points.length === 0}
              className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
            >
              {t('actions.clear')}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('gpx.instructions')}</p>
      )}

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.name')} hint={t('fields.optional')}>
            <Input name="name" />
          </Field>
          {mode === 'gpx' && (
            <Field label={t('fields.gpxFile')}>
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
            {submitting
              ? t('actions.adding')
              : hasExistingTrail
                ? t('actions.updateTrail')
                : t('actions.addTrail')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
