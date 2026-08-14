import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import { formatDate } from '../../../../lib/format';
import { StatusBadge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { EmptyState } from '../../../../components/EmptyState';

interface TripGroupSummary {
  id: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  displayStatus: 'UPCOMING' | 'ONGOING' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
  _count: { members: number };
}

export const Route = createFileRoute('/adventures/$slug/groups/')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();

    const groupsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/trip-groups`));
    const groupsBody: { data: TripGroupSummary[] } = groupsRes.ok ? await groupsRes.json() : { data: [] };

    return { slug: params.slug, page, groups: groupsBody.data };
  },
  component: TripGroupsListPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Trip groups — ${loaderData.page.title}` }] : [],
  }),
});

function TripGroupsListPage() {
  const { slug, page, groups } = Route.useLoaderData();
  const { t } = useTranslation('groups');

  return (
    <Container>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('listTitle', { title: page.title })}</h1>
        <Link to="/adventures/$slug/groups/new" params={{ slug }}>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> {t('startGroup')}
          </Button>
        </Link>
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('subheading')}</p>

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Users className="h-8 w-8" />}>{t('noneYet')}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to="/adventures/$slug/groups/$groupId" params={{ slug, groupId: group.id }}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-50">{group.title}</h2>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                      <Users className="h-3.5 w-3.5" /> {group._count.members}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={group.displayStatus} />
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {formatDate(group.dateStart)} – {formatDate(group.dateEnd)}
                    </p>
                  </div>
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
