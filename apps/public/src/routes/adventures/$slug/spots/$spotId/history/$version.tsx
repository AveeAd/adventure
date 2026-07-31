import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../../../lib/auth/api';
import i18n from '../../../../../../lib/i18n';
import { authPost } from '../../../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../../../lib/auth/session';
import { Button } from '../../../../../../components/Button';
import { Card } from '../../../../../../components/Card';
import { Container } from '../../../../../../components/Container';
import { LazyGeodataDiffMap } from '../../../../../../components/LazyGeodataDiffMap';

interface RevisionDetail {
  id: string;
  version: number;
  geometry: GeoJSON.Point;
  name: string;
}

interface DiffResult {
  changes: { field: string; from: unknown; to: unknown }[];
  geometry: {
    from: GeoJSON.Point;
    to: GeoJSON.Point;
    maxDeviationMeters: number;
    geometryChanged: boolean;
  };
}

export const Route = createFileRoute('/adventures/$slug/spots/$spotId/history/$version')({
  loader: async ({ params }) => {
    const spotRes = await fetch(apiUrl(`/spots/${params.spotId}`));
    if (spotRes.status === 404) {
      throw notFound();
    }
    if (!spotRes.ok) {
      throw new Error('Failed to load spot');
    }
    const spot: { id: string; name: string } = await spotRes.json();
    const version = Number(params.version);

    if (version <= 1) {
      const revisionRes = await fetch(apiUrl(`/spots/${spot.id}/revisions/${version}`));
      if (!revisionRes.ok) {
        throw notFound();
      }
      const revision: RevisionDetail = await revisionRes.json();
      return { slug: params.slug, spot, version, mode: 'full' as const, revision, diff: null };
    }

    const diffRes = await fetch(apiUrl(`/spots/${spot.id}/diff?from=${version - 1}&to=${version}`));
    if (!diffRes.ok) {
      throw notFound();
    }
    const diff: DiffResult = await diffRes.json();
    return { slug: params.slug, spot, version, mode: 'diff' as const, revision: null, diff };
  },
  component: SpotRevisionPage,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: i18n.t('adventurePage:history.diffTitle', { name: loaderData.spot.name, version: loaderData.version }) }]
      : [],
  }),
});

function SpotRevisionPage() {
  const { slug, spot, version, mode, revision, diff } = Route.useLoaderData();
  const navigate = useNavigate();
  const { t } = useTranslation('adventurePage');
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
      await authPost(`/spots/${spot.id}/revisions/${version}/revert`);
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToRevert'));
      setReverting(false);
    }
  }

  const geometryFrom = mode === 'full' ? revision!.geometry : diff!.geometry.from;
  const geometryTo = mode === 'full' ? revision!.geometry : diff!.geometry.to;

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {t('history.diffTitle', { name: spot.name, version })}
      </h1>

      <Card className="mt-6 p-5">
        {mode === 'diff' && diff!.changes.length > 0 && (
          <dl className="mb-4 flex flex-col gap-1 text-sm">
            {diff!.changes.map((change) => (
              <div key={change.field} className="flex gap-2">
                <dt className="font-medium text-stone-700 dark:text-stone-300">{change.field}:</dt>
                <dd className="text-stone-600 dark:text-stone-400">
                  {String(change.from ?? '—')} → {String(change.to ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {mode === 'diff' && (
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            {diff!.geometry.geometryChanged
              ? t('history.locationChanged', { deviation: Math.round(diff!.geometry.maxDeviationMeters) })
              : t('history.locationUnchanged')}
          </p>
        )}

        <LazyGeodataDiffMap from={geometryFrom} to={geometryTo} />
      </Card>

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
