import { Link, createFileRoute } from '@tanstack/react-router';
import { Compass, MountainSnow, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/auth/api';
import { Badge, StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { Container } from '../components/Container';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/FormField';
import { LazyAdventureMap } from '../components/LazyAdventureMap';
import type { MapSpot, MapTrail } from '../components/AdventureMap';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  verificationStatus: string;
  activityTypeName: string | null;
}

// generous box around Nepal - the bbox endpoints only support a rectangle,
// not a country polygon, so this is a deliberate approximation
const NEPAL_BBOX = { minLng: 79.5, minLat: 26.0, maxLng: 88.5, maxLat: 30.5 };

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
  tags: { tag: { id: string; name: string } }[];
  media: { url: string; altText: string | null }[];
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const bboxParams = new URLSearchParams({
      minLng: String(NEPAL_BBOX.minLng),
      minLat: String(NEPAL_BBOX.minLat),
      maxLng: String(NEPAL_BBOX.maxLng),
      maxLat: String(NEPAL_BBOX.maxLat),
    });
    const [pagesRes, trailsRes, spotsRes] = await Promise.all([
      fetch(apiUrl('/adventure-pages?pageSize=50')),
      fetch(apiUrl(`/trails/bbox?${bboxParams}`)),
      fetch(apiUrl(`/spots/bbox?${bboxParams}`)),
    ]);
    if (!pagesRes.ok) {
      throw new Error('Failed to load adventure pages');
    }
    const body: { data: AdventurePageSummary[] } = await pagesRes.json();
    const trails: MapTrail[] = trailsRes.ok ? await trailsRes.json() : [];
    const spots: MapSpot[] = spotsRes.ok ? await spotsRes.json() : [];
    return { pages: body.data, trails, spots };
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const { pages, trails, spots } = Route.useLoaderData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(apiUrl(`/adventure-pages/search?q=${encodeURIComponent(trimmed)}`));
      const body: { data: SearchResult[] } = res.ok ? await res.json() : { data: [] };
      setResults(body.data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

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
          <div className="relative mt-6 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search adventure pages..."
              className="pl-9"
            />
          </div>
        </Container>
      </div>

      <Container size="wide">
        {results !== null ? (
          <SearchResults query={query} results={results} searching={searching} />
        ) : (
          <>
            {(trails.length > 0 || spots.length > 0) && (
              <div className="mb-8">
                <LazyAdventureMap trails={trails} spots={spots} height={420} zoom={7} />
              </div>
            )}
          </>
        )}
        {results === null && (pages.length === 0 ? (
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
                      {page.tags.slice(0, 3).map(({ tag }) => (
                        <Badge key={tag.id} tone="neutral">
                          #{tag.name}
                        </Badge>
                      ))}
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
        ))}
      </Container>
    </>
  );
}

function SearchResults({ query, results, searching }: { query: string; results: SearchResult[]; searching: boolean }) {
  if (searching && results.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Searching...</p>;
  }

  if (results.length === 0) {
    return <EmptyState icon={<Search className="h-8 w-8" />}>No results for &ldquo;{query}&rdquo;.</EmptyState>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={result.id}>
          <Link to="/adventures/$slug" params={{ slug: result.slug }}>
            <Card className="p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-stone-900 dark:text-stone-50">{result.title}</h2>
                <StatusBadge status={result.verificationStatus} />
                {result.activityTypeName && <Badge tone="neutral">{result.activityTypeName}</Badge>}
              </div>
              {result.summary && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{result.summary}</p>
              )}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
