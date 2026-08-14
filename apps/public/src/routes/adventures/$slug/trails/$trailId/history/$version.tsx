import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../../../lib/auth/api';
import i18n from '../../../../../../lib/i18n';
import { authPost } from '../../../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../../../lib/auth/session';
import { StatusBadge } from '../../../../../../components/Badge';
import { Button } from '../../../../../../components/Button';
import { Card } from '../../../../../../components/Card';
import { Container } from '../../../../../../components/Container';
import { LazyGeodataDiffMap } from '../../../../../../components/LazyGeodataDiffMap';
import { UserRef } from '../../../../../../components/UserRef';
import { VoteControls } from '../../../../../../components/VoteControls';
import { formatDateTime } from '../../../../../../lib/format';
import { buildMeta } from '../../../../../../lib/seo';

interface RevisionDetail {
  id: string;
  version: number;
  geometry: GeoJSON.LineString;
  name: string | null;
  distanceMeters: number | null;
  editorId: string;
  approvalStatus: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  rejectionReason: string | null;
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

interface DiffResult {
  changes: { field: string; from: unknown; to: unknown }[];
  geometry: {
    from: GeoJSON.LineString;
    to: GeoJSON.LineString;
    vertexDelta: number;
    lengthDeltaMeters: number;
    maxDeviationMeters: number;
    geometryChanged: boolean;
  };
}

export const Route = createFileRoute('/adventures/$slug/trails/$trailId/history/$version')({
  loader: async ({ params }) => {
    const trailRes = await fetch(apiUrl(`/trails/${params.trailId}`));
    if (trailRes.status === 404) {
      throw notFound();
    }
    if (!trailRes.ok) {
      throw new Error('Failed to load trail');
    }
    const trail: { id: string; name: string | null } = await trailRes.json();
    const version = Number(params.version);

    const revisionRes = await fetch(apiUrl(`/trails/${trail.id}/revisions/${version}`));
    if (!revisionRes.ok) {
      throw notFound();
    }
    const revision: RevisionDetail = await revisionRes.json();

    let diff: DiffResult | null = null;
    if (version > 1) {
      const diffRes = await fetch(apiUrl(`/trails/${trail.id}/diff?from=${version - 1}&to=${version}`));
      if (diffRes.ok) {
        diff = await diffRes.json();
      }
    }
    return { slug: params.slug, trail, version, revision, diff };
  },
  component: TrailRevisionPage,
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData
        ? i18n.t('adventurePage:history.diffTitle', {
            name: loaderData.trail.name ?? i18n.t('adventurePage:history.trailFallback'),
            version: loaderData.version,
          })
        : i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/adventures/${params.slug}/trails/${params.trailId}/history/${params.version}`,
      noindex: true,
    }),
});

function TrailRevisionPage() {
  const { slug, trail, version, revision: initialRevision, diff } = Route.useLoaderData();
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
      await authPost(`/trails/${trail.id}/revisions/${version}/revert`);
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToRevert'));
      setReverting(false);
    }
  }

  const geometryFrom = diff ? diff.geometry.from : revision.geometry;
  const geometryTo = diff ? diff.geometry.to : revision.geometry;

  return (
    <Container>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {t('history.diffTitle', { name: trail.name ?? t('history.trailFallback'), version })}
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

      <Card className="mt-6 p-5">
        {diff && diff.changes.length > 0 && (
          <dl className="mb-4 flex flex-col gap-1 text-sm">
            {diff.changes.map((change) => (
              <div key={change.field} className="flex gap-2">
                <dt className="font-medium text-stone-700 dark:text-stone-300">{change.field}:</dt>
                <dd className="text-stone-600 dark:text-stone-400">
                  {String(change.from ?? '—')} → {String(change.to ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {diff && (
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            {diff.geometry.geometryChanged
              ? t('history.geometryChanged', {
                  deviation: Math.round(diff.geometry.maxDeviationMeters),
                  length: diff.geometry.lengthDeltaMeters,
                  vertices: diff.geometry.vertexDelta,
                })
              : t('history.geometryUnchanged')}
          </p>
        )}

        <LazyGeodataDiffMap from={geometryFrom} to={geometryTo} />
      </Card>

      <VoteControls
        voteUrl={`/trails/${trail.id}/revisions/${version}/votes`}
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
