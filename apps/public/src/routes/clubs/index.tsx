import { createFileRoute } from '@tanstack/react-router';
import { Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { ClubCard, type ClubCardData } from '../../components/ClubCard';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/FormField';

const SORTS = ['members', 'newest', 'active'] as const;
type ClubSort = (typeof SORTS)[number];

interface ClubsSearch {
  q?: string;
  sort?: ClubSort;
}

export const Route = createFileRoute('/clubs/')({
  validateSearch: (search: Record<string, unknown>): ClubsSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    sort: SORTS.includes(search.sort as ClubSort) ? (search.sort as ClubSort) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const params = new URLSearchParams({ pageSize: '50', sort: deps.sort ?? 'members' });
    if (deps.q) params.set('search', deps.q);
    const res = await fetch(apiUrl(`/clubs?${params}`));
    const body: { data: ClubCardData[] } = res.ok ? await res.json() : { data: [] };
    return { clubs: body.data };
  },
  component: ClubsListPage,
  head: () => ({
    meta: [{ title: 'Clubs' }],
  }),
});

function ClubsListPage() {
  const { clubs } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t } = useTranslation('clubs');
  const [queryInput, setQueryInput] = useState(search.q ?? '');

  useEffect(() => {
    setQueryInput(search.q ?? '');
  }, [search.q]);

  useEffect(() => {
    const trimmed = queryInput.trim();
    if (trimmed === (search.q ?? '')) return;
    const timeout = setTimeout(() => {
      navigate({ search: { ...search, q: trimmed || undefined } });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  return (
    <Container size="wide">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('listTitle')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('subheading')}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:ring-primary-900"
          />
        </div>
        <Select
          value={search.sort ?? 'members'}
          onChange={(e) => navigate({ search: { ...search, sort: e.target.value as ClubSort } })}
        >
          <option value="members">{t('sortPopular')}</option>
          <option value="newest">{t('sortNewest')}</option>
          <option value="active">{t('sortActive')}</option>
        </Select>
      </div>

      {clubs.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Users className="h-8 w-8" />}>{search.q ? t('noneMatch') : t('noneYet')}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <ClubCard club={club} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
