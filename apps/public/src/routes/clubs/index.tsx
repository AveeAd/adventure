import { Link, createFileRoute } from '@tanstack/react-router';
import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';

interface ClubSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  _count: { members: number };
}

export const Route = createFileRoute('/clubs/')({
  loader: async () => {
    const res = await fetch(apiUrl('/clubs?pageSize=50'));
    const body: { data: ClubSummary[] } = res.ok ? await res.json() : { data: [] };
    return { clubs: body.data };
  },
  component: ClubsListPage,
  head: () => ({
    meta: [{ title: 'Clubs' }],
  }),
});

function ClubsListPage() {
  const { clubs } = Route.useLoaderData();
  const { t } = useTranslation('clubs');

  return (
    <Container size="wide">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('listTitle')}</h1>
        <Link to="/clubs/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> {t('startClub')}
          </Button>
        </Link>
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('subheading')}</p>

      {clubs.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Users className="h-8 w-8" />}>{t('noneYet')}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link to="/clubs/$clubId" params={{ clubId: club.id }}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-50">{club.name}</h2>
                    <span className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                      <Users className="h-3.5 w-3.5" /> {club._count.members}
                    </span>
                  </div>
                  {club.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{club.description}</p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
