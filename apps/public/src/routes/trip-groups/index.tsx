import { Link, createFileRoute } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { formatDate } from '../../lib/format';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';

interface TripGroupSummary {
  id: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  _count: { members: number };
  adventurePage: { title: string; slug: string };
}

export const Route = createFileRoute('/trip-groups/')({
  loader: async () => {
    const res = await fetch(apiUrl('/trip-groups?pageSize=50'));
    const body: { data: TripGroupSummary[] } = res.ok ? await res.json() : { data: [] };
    return { groups: body.data };
  },
  component: TripGroupsListPage,
  head: () => ({
    meta: [{ title: 'Trip Groups' }],
  }),
});

function TripGroupsListPage() {
  const { groups } = Route.useLoaderData();
  const { t } = useTranslation('groups');

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('allListTitle')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('allSubheading')}</p>

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Users className="h-8 w-8" />}>{t('noneYet')}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to="/adventures/$slug/groups/$groupId" params={{ slug: group.adventurePage.slug, groupId: group.id }}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-50">{group.title}</h2>
                    <span className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                      <Users className="h-3.5 w-3.5" /> {group._count.members}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-primary-700 dark:text-primary-400">{group.adventurePage.title}</p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {formatDate(group.dateStart)} – {formatDate(group.dateEnd)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{group.description}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
