import { createFileRoute, notFound } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckCircle2, FileEdit, MapPinned, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { formatDate } from '../../lib/format';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';

interface LevelProgress {
  level: number;
  pointsInLevel: number;
  pointsToNext: number;
}

interface ContributionBreakdownRow {
  reason: string;
  count: number;
  points: number;
}

interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  pagesEditedCount: number;
  tripReportCount: number;
  confirmationsGivenCount: number;
  guideLevel: number;
  contributionPoints: number;
  approvalsGiven: number;
  levelProgress: LevelProgress;
  contributionBreakdown: ContributionBreakdownRow[];
}

interface ContributionEvent {
  id: string;
  reason: string;
  points: number;
  targetType: string;
  createdAt: string;
}

interface LedgerPage {
  data: ContributionEvent[];
  total: number;
  page: number;
  pageSize: number;
}

const LEDGER_PAGE_SIZE = 20;

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const [profileRes, ledgerRes] = await Promise.all([
      fetch(apiUrl(`/users/${params.id}/profile`)),
      fetch(apiUrl(`/users/${params.id}/contributions?page=1&pageSize=${LEDGER_PAGE_SIZE}`)),
    ]);
    if (profileRes.status === 404) {
      throw notFound();
    }
    if (!profileRes.ok || !ledgerRes.ok) {
      throw new Error('Failed to load contributor profile');
    }
    const profile: PublicProfile = await profileRes.json();
    const ledger: LedgerPage = await ledgerRes.json();
    return { profile, ledger, userId: params.id };
  },
  component: ContributorProfilePage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.profile.displayName }] : [],
  }),
});

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex flex-col items-center gap-1 p-5 text-center">
      <span className="text-primary-600 dark:text-primary-400">{icon}</span>
      <span className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{value}</span>
      <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
    </Card>
  );
}

function LevelProgressBar({ progress }: { progress: LevelProgress }) {
  const { t } = useTranslation('account');
  const span = progress.pointsInLevel + progress.pointsToNext;
  const percent = span > 0 ? Math.min(100, Math.round((progress.pointsInLevel / span) * 100)) : 100;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-900 dark:text-stone-50">
          {t('profile.guideLevel', { level: progress.level })}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {t('profile.pointsToNextLevel', { points: progress.pointsToNext, level: progress.level + 1 })}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className="h-full rounded-full bg-primary-600 dark:bg-primary-400" style={{ width: `${percent}%` }} />
      </div>
    </Card>
  );
}

function ContributorProfilePage() {
  const { profile, ledger: initialLedger, userId } = Route.useLoaderData();
  const { t } = useTranslation('account');
  const [ledger, setLedger] = useState(initialLedger);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = ledger.data.length < ledger.total;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = ledger.page + 1;
      const res = await fetch(apiUrl(`/users/${userId}/contributions?page=${nextPage}&pageSize=${LEDGER_PAGE_SIZE}`));
      if (res.ok) {
        const next: LedgerPage = await res.json();
        setLedger({ ...next, data: [...ledger.data, ...next.data] });
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Container>
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" width={64} height={64} className="rounded-full" />
        ) : (
          <Avatar label={profile.displayName} size="lg" />
        )}
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{profile.displayName}</h1>
      </div>

      <div className="mt-6">
        <LevelProgressBar progress={profile.levelProgress} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<FileEdit className="h-5 w-5" />} label={t('profile.pagesEdited')} value={profile.pagesEditedCount} />
        <StatCard icon={<MapPinned className="h-5 w-5" />} label={t('profile.stories')} value={profile.tripReportCount} />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={t('profile.confirmationsGiven')}
          value={profile.confirmationsGivenCount}
        />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label={t('profile.approvalsGiven')} value={profile.approvalsGiven} />
      </div>

      {profile.contributionBreakdown.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('profile.contributionBreakdown')}</h2>
          <Card className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
            {profile.contributionBreakdown.map((row) => (
              <div key={row.reason} className="flex items-center justify-between px-4 py-3">
                <span className="text-stone-700 dark:text-stone-300">
                  {t(`contributionReasons.${row.reason}`, { defaultValue: row.reason })}
                </span>
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {row.count} &middot; {row.points >= 0 ? '+' : ''}
                  {row.points} {t('profile.points')}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('profile.pointLedger')}</h2>
        {ledger.data.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('profile.noContributions')}</p>
        ) : (
          <Card className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
            {ledger.data.map((event) => (
              <div key={event.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-stone-700 dark:text-stone-300">
                    {t(`contributionReasons.${event.reason}`, { defaultValue: event.reason })}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">{formatDate(event.createdAt)}</div>
                </div>
                <span
                  className={`font-medium ${event.points >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {event.points >= 0 ? '+' : ''}
                  {event.points}
                </span>
              </div>
            ))}
          </Card>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t('profile.loadMore')}
          </button>
        )}
      </div>
    </Container>
  );
}
