import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
import { authFetch } from '../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { formatDateTime } from '../../lib/format';
import { buildMeta } from '../../lib/seo';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/FormField';

type TargetType = 'ADVENTURE_PAGE' | 'TRAIL' | 'SPOT';

interface PendingRevisionRow {
  targetType: TargetType;
  targetId: string;
  targetName: string | null;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  districtIds: string[];
  revisionId: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: string;
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

interface MasterDataOption {
  id: string;
  name: string;
}

async function fetchDistricts(): Promise<MasterDataOption[]> {
  const res = await fetch(apiUrl('/districts?pageSize=200'));
  if (!res.ok) return [];
  const body: { data: MasterDataOption[] } = await res.json();
  return body.data;
}

// MILESTONE_3.md §9.1: "Review queue route for level-10+ users - everything
// pending, filterable by type/district, showing votes-so-far." Backed by the
// Phase-22 GET /revisions/pending endpoint - the API 403s ineligible viewers,
// this page just avoids showing them a broken UI while they wait for that.
export const Route = createFileRoute('/review-queue/')({
  loader: async () => ({ districts: await fetchDistricts() }),
  component: ReviewQueuePage,
  head: () =>
    buildMeta({
      title: i18n.t('adventurePage:approval.reviewQueueTitle'),
      description: i18n.t('adventurePage:approval.reviewQueueDescription'),
      path: '/review-queue',
      noindex: true,
    }),
});

function targetLink(row: PendingRevisionRow): { to: string; params: Record<string, string> } {
  if (row.targetType === 'TRAIL') {
    return {
      to: '/adventures/$slug/trails/$trailId/history/$version',
      params: { slug: row.pageSlug, trailId: row.targetId, version: String(row.version) },
    };
  }
  if (row.targetType === 'SPOT') {
    return {
      to: '/adventures/$slug/spots/$spotId/history/$version',
      params: { slug: row.pageSlug, spotId: row.targetId, version: String(row.version) },
    };
  }
  return { to: '/adventures/$slug/history/$version', params: { slug: row.pageSlug, version: String(row.version) } };
}

function ReviewQueuePage() {
  const { districts } = Route.useLoaderData();
  const authStatus = useRequireAuth('/review-queue');
  const { t } = useTranslation(['adventurePage', 'common']);
  const [type, setType] = useState<TargetType | ''>('');
  const [districtId, setDistrictId] = useState('');
  const [rows, setRows] = useState<PendingRevisionRow[] | 'loading' | 'forbidden'>('loading');

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    setRows('loading');
    const params = new URLSearchParams({ pageSize: '50' });
    if (type) params.set('type', type);
    if (districtId) params.set('districtId', districtId);
    authFetch(`/revisions/pending?${params}`).then(async (res) => {
      if (res.status === 403) {
        setRows('forbidden');
        return;
      }
      const body: { data: PendingRevisionRow[] } = res.ok ? await res.json() : { data: [] };
      setRows(body.data);
    });
  }, [authStatus, type, districtId]);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('approval.reviewQueueTitle')}</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <Select value={type} onChange={(e) => setType(e.target.value as TargetType | '')} className="w-auto">
          <option value="">{t('approval.filterAllTypes')}</option>
          <option value="ADVENTURE_PAGE">{t('approval.typePage')}</option>
          <option value="TRAIL">{t('approval.typeTrail')}</option>
          <option value="SPOT">{t('approval.typeSpot')}</option>
        </Select>
        <Select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="w-auto">
          <option value="">{t('approval.filterAllDistricts')}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {rows === 'loading' ? (
          <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
        ) : rows === 'forbidden' ? (
          <EmptyState>{t('approval.reviewQueueNotEligible')}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>{t('approval.reviewQueueEmpty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => {
              const link = targetLink(row);
              return (
                <li key={row.revisionId}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral">
                            {row.targetType === 'ADVENTURE_PAGE'
                              ? t('approval.typePage')
                              : row.targetType === 'TRAIL'
                                ? t('approval.typeTrail')
                                : t('approval.typeSpot')}
                          </Badge>
                          <span className="font-medium text-stone-900 dark:text-stone-50">
                            {row.targetName ?? row.pageTitle}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                          {row.pageTitle} · v{row.version} · {formatDateTime(row.createdAt)}
                        </p>
                        {row.editSummary && (
                          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{row.editSummary}</p>
                        )}
                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                          {t('approval.voteProgress', {
                            approve: row.approveCount,
                            reject: row.rejectCount,
                            threshold: row.threshold,
                          })}
                        </p>
                      </div>
                      <Link
                        to={link.to}
                        params={link.params}
                        className="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
                      >
                        {t('approval.viewChange')}
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
