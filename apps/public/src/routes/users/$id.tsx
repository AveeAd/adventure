import { createFileRoute, notFound } from '@tanstack/react-router';
import { CheckCircle2, FileEdit, MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';

interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  pagesEditedCount: number;
  tripReportCount: number;
  confirmationsGivenCount: number;
}

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/users/${params.id}/profile`));
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to load contributor profile');
    }
    const profile: PublicProfile = await res.json();
    return { profile };
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

function ContributorProfilePage() {
  const { profile } = Route.useLoaderData();
  const { t } = useTranslation('account');

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

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard icon={<FileEdit className="h-5 w-5" />} label={t('profile.pagesEdited')} value={profile.pagesEditedCount} />
        <StatCard icon={<MapPinned className="h-5 w-5" />} label={t('profile.stories')} value={profile.tripReportCount} />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={t('profile.confirmationsGiven')}
          value={profile.confirmationsGivenCount}
        />
      </div>
    </Container>
  );
}
