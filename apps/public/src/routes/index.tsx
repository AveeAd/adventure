import { Link, createFileRoute } from '@tanstack/react-router';
import { Compass, MountainSnow } from 'lucide-react';
import { apiUrl } from '../lib/auth/api';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Container } from '../components/Container';
import { EmptyState } from '../components/EmptyState';

interface AdventurePageSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  maxAltitudeMeters: number | null;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  media: { url: string; altText: string | null }[];
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const res = await fetch(apiUrl('/adventure-pages?pageSize=50'));
    if (!res.ok) {
      throw new Error('Failed to load adventure pages');
    }
    const body: { data: AdventurePageSummary[] } = await res.json();
    return { pages: body.data };
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const { pages } = Route.useLoaderData();

  return (
    <>
      <div className="border-b border-stone-200 bg-gradient-to-b from-primary-50 to-stone-50 dark:border-stone-800 dark:from-primary-950/40 dark:to-stone-950">
        <Container>
          <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400">
            <Compass className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Discover Nepal</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
            Trails, treks, and adventures &mdash; mapped and written by the community
          </h1>
          <p className="mt-3 max-w-2xl text-stone-600 dark:text-stone-300">
            A free, open guide to adventure in Nepal &mdash; built and verified by the people who've been there.
          </p>
        </Container>
      </div>

      <Container size="wide">
        {pages.length === 0 ? (
          <EmptyState icon={<MountainSnow className="h-8 w-8" />}>No adventure pages yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Link key={page.id} to="/adventures/$slug" params={{ slug: page.slug }} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
                  <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900 dark:to-accent-900">
                    {page.media[0] ? (
                      <img
                        src={page.media[0].url}
                        alt={page.media[0].altText ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MountainSnow className="h-10 w-10 text-primary-500 dark:text-primary-300" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="font-semibold text-stone-900 group-hover:text-primary-700 dark:text-stone-50 dark:group-hover:text-primary-400">
                      {page.title}
                    </h2>
                    {page.summary && <p className="line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{page.summary}</p>}
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      {page.activityType && <Badge tone="neutral">{page.activityType.name}</Badge>}
                      {page.difficultyLevel && <Badge tone="neutral">{page.difficultyLevel.name}</Badge>}
                    </div>
                    {(page.durationMinDays || page.maxAltitudeMeters) && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {page.durationMinDays && page.durationMaxDays
                          ? `${page.durationMinDays}-${page.durationMaxDays} days`
                          : null}
                        {page.maxAltitudeMeters ? ` · up to ${page.maxAltitudeMeters}m` : null}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
