import { Link, createFileRoute } from '@tanstack/react-router';
import { ChevronDown, Compass, Map as MapIcon, MapPin, MountainSnow, Route as RouteIcon, Search, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../lib/auth/api';
import { useInView } from '../lib/useInView';
import { Badge, StatusBadge } from '../components/Badge';
import { Card } from '../components/Card';
import { Container } from '../components/Container';
import { EmptyState } from '../components/EmptyState';
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
  likeCount: number;
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
      fetch(apiUrl('/adventure-pages?pageSize=15&sort=trending')),
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

// Counts up from 0 once, when the number first scrolls into view - a small
// bit of life for the map section's stats. Skips straight to the final
// value if the visitor has reduced motion set.
function AnimatedNumber({ value }: { value: number }) {
  const { ref, isInView } = useInView<HTMLDivElement>();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    const durationMs = 600;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
      {display}
    </div>
  );
}

function DiscoverPage() {
  const { t } = useTranslation('discover');
  const { pages, trails, spots } = Route.useLoaderData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const { ref: trendingRef, isInView: trendingInView } = useInView<HTMLDivElement>();

  function toggleMap() {
    setShowMap((wasShown) => {
      const next = !wasShown;
      if (next) {
        requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
      return next;
    });
  }

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
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col justify-center overflow-hidden border-b border-stone-200 dark:border-stone-800">
        <Container size="wide" className="relative">
          <div
            className="animate-fade-up flex items-center gap-2 text-primary-700 dark:text-primary-400"
            style={{ animationDelay: '0ms' }}
          >
            <Compass className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">{t('eyebrow')}</span>
          </div>
          <h1
            className="animate-fade-up mt-4 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-50"
            style={{ animationDelay: '80ms' }}
          >
            {t('heading')}
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-2xl text-lg text-stone-600 dark:text-stone-300"
            style={{ animationDelay: '160ms' }}
          >
            {t('subheading')}
          </p>
          <div className="animate-fade-up relative mt-10 w-full" style={{ animationDelay: '240ms' }}>
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="glass-2 w-full rounded-full border-2 border-[color:var(--glass-border)] py-4 pl-14 pr-16 text-base text-stone-900 backdrop-blur-lg placeholder:text-stone-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-primary-900/50 sm:pr-40"
            />
            {(trails.length > 0 || spots.length > 0) && (
              <button
                type="button"
                onClick={toggleMap}
                aria-pressed={showMap}
                aria-label={showMap ? t('hideMap') : t('showMap')}
                className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full p-3 text-sm font-medium transition-all sm:px-4 sm:py-2.5 ${
                  showMap
                    ? 'border-2 border-primary-400 bg-primary-500/25 text-primary-800 shadow-[0_0_2px_rgba(92,154,118,0.9),0_0_6px_rgba(92,154,118,0.7),0_0_14px_rgba(92,154,118,0.5),0_0_26px_rgba(92,154,118,0.3)] backdrop-blur-lg dark:bg-primary-400/20 dark:text-primary-200'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{showMap ? t('hideMap') : t('showMap')}</span>
              </button>
            )}
          </div>
        </Container>

        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <ChevronDown className="h-5 w-5 animate-bounce text-primary-600/50 dark:text-primary-400/40" aria-hidden="true" />
        </div>
      </div>

      <Container size="wide">
        {results !== null ? (
          <SearchResults query={query} results={results} searching={searching} />
        ) : (
          <>
            {showMap && (trails.length > 0 || spots.length > 0) && (
              <div ref={mapSectionRef} className="animate-fade-up scroll-mt-6 mb-10">
                <div className="mb-4 flex items-center gap-2 text-primary-700 dark:text-primary-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{t('onTheMap')}</span>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <LazyAdventureMap trails={trails} spots={spots} height={420} zoom={7} />
                  </div>
                  <Card className="flex flex-col gap-5 p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <AnimatedNumber value={trails.length} />
                        <div className="text-xs text-stone-500 dark:text-stone-400">{t('trailsMapped')}</div>
                      </div>
                      <div>
                        <AnimatedNumber value={spots.length} />
                        <div className="text-xs text-stone-500 dark:text-stone-400">{t('spotsMarked')}</div>
                      </div>
                    </div>
                    <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
                      <div className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                        <RouteIcon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                        {t('trailRoutesConfirmed')}
                      </div>
                      <div className="mt-2.5 flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                        <MapPin className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                        {t('pointsOfInterest')}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
        {results === null && (pages.length === 0 ? (
          <EmptyState icon={<MountainSnow className="h-8 w-8" />}>{t('noAdventurePages')}</EmptyState>
        ) : (
          <div ref={trendingRef}>
            <div
              className={`flex items-center gap-2 text-accent-600 dark:text-accent-400 ${trendingInView ? 'animate-fade-up' : 'opacity-0'}`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t('trendingDestinations')}</span>
            </div>
            <div className="mt-4 columns-1 gap-6 sm:columns-2 lg:columns-3">
              {pages.map((page, index) => {
                const aspect = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[5/6]'][index % 4];
                return (
                  <Link
                    key={page.id}
                    to="/adventures/$slug"
                    params={{ slug: page.slug }}
                    className={`group mb-6 block break-inside-avoid ${trendingInView ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: trendingInView ? `${Math.min(index, 8) * 60}ms` : undefined }}
                  >
                    {page.media[0] ? (
                      <div
                        className={`relative w-full overflow-hidden rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary-900/10 ${aspect}`}
                      >
                        <img
                          src={page.media[0].url}
                          alt={page.media[0].altText ?? ''}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <h2 className="flex items-center gap-1.5 font-semibold text-white">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                            {page.title}
                          </h2>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {page.activityType && (
                              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                                {page.activityType.name}
                              </span>
                            )}
                            {page.difficultyLevel && (
                              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                                {page.difficultyLevel.name}
                              </span>
                            )}
                          </div>
                          {(page.durationMinDays || page.maxAltitudeMeters) && (
                            <p className="mt-1.5 text-xs text-white/80">
                              {page.durationMinDays && page.durationMaxDays
                                ? t('durationDays', { min: page.durationMinDays, max: page.durationMaxDays })
                                : null}
                              {page.maxAltitudeMeters ? ` · ${t('upToAltitude', { altitude: page.maxAltitudeMeters })}` : null}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Card
                        glass
                        className="flex flex-col gap-2 overflow-hidden p-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary-900/5"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-stone-900 group-hover:text-primary-700 dark:text-stone-50 dark:group-hover:text-primary-400">
                          <MountainSnow className="h-4 w-4 shrink-0 text-primary-500 dark:text-primary-300" />
                          {page.title}
                        </div>
                        {page.summary && <p className="line-clamp-3 text-sm text-stone-600 dark:text-stone-400">{page.summary}</p>}
                        <div className="mt-1 flex flex-wrap gap-2">
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
                              ? t('durationDays', { min: page.durationMinDays, max: page.durationMaxDays })
                              : null}
                            {page.maxAltitudeMeters ? ` · ${t('upToAltitude', { altitude: page.maxAltitudeMeters })}` : null}
                          </p>
                        )}
                      </Card>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </Container>
    </>
  );
}

function SearchResults({ query, results, searching }: { query: string; results: SearchResult[]; searching: boolean }) {
  const { t } = useTranslation('discover');

  if (searching && results.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">{t('searching')}</p>;
  }

  if (results.length === 0) {
    return <EmptyState icon={<Search className="h-8 w-8" />}>{t('noResultsFor', { query })}</EmptyState>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={result.id}>
          <Link to="/adventures/$slug" params={{ slug: result.slug }}>
            <Card glass className="p-4 transition-shadow hover:shadow-md">
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
