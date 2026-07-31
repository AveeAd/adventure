import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Calendar, CheckCircle2, Clock, Hammer, Heart, ImagePlus, MapPin, MountainSnow, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../lib/auth/api';
import { authDelete, authPost, authUpload } from '../../../lib/auth/auth-fetch';
import { checkAuth, fetchCurrentUser, type CurrentUser } from '../../../lib/auth/session';
import { formatDate } from '../../../lib/format';
import { Badge, StatusBadge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { EmptyState } from '../../../components/EmptyState';
import { Textarea, Input, Field, Select } from '../../../components/FormField';
import { MarkdownContent } from '../../../components/MarkdownContent';
import { LazyAdventureMap } from '../../../components/LazyAdventureMap';
import type { MapSpot, MapTrail } from '../../../components/AdventureMap';
import { ElevationProfile } from '../../../components/ElevationProfile';

interface MediaItem {
  id: string;
  url: string;
  caption: string | null;
  altText: string | null;
  sortOrder: number;
  uploadedById: string;
}

interface AdventurePageDetail {
  id: string;
  title: string;
  summary: string | null;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  maxAltitudeMeters: number | null;
  verificationStatus: string;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  tags: { tag: { id: string; name: string } }[];
  relatedPages: { id: string; title: string; slug: string; summary: string | null }[];
  currentRevision: { content: string; createdAt: string } | null;
  contributorIds: string[];
  likeCount: number;
  likedByMe: boolean;
  media: MediaItem[];
}

interface TripReportSummary {
  id: string;
  title: string | null;
  dateCompleted: string;
  durationDays: number | null;
}

export const Route = createFileRoute('/adventures/$slug/')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: AdventurePageDetail = await pageRes.json();

    const tripReportsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/trip-reports?pageSize=10`));
    const tripReportsBody: { data: TripReportSummary[] } = tripReportsRes.ok
      ? await tripReportsRes.json()
      : { data: [] };

    const [trailsRes, spotsRes] = await Promise.all([
      fetch(apiUrl(`/adventure-pages/${page.id}/trails`)),
      fetch(apiUrl(`/adventure-pages/${page.id}/spots`)),
    ]);
    const trails: MapTrail[] = trailsRes.ok ? await trailsRes.json() : [];
    const spots: MapSpot[] = spotsRes.ok ? await spotsRes.json() : [];

    return { page, tripReports: tripReportsBody.data, trails, spots };
  },
  component: AdventurePageView,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: loaderData.page.title }, { name: 'description', content: loaderData.page.summary ?? '' }]
      : [],
  }),
});

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-primary-600 dark:text-primary-400">{icon}</span>
      <div>
        <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>
        <div className="text-sm font-medium text-stone-800 dark:text-stone-200">{value}</div>
      </div>
    </div>
  );
}

function AdventurePageView() {
  const { page, tripReports, trails, spots } = Route.useLoaderData();
  const { t } = useTranslation('adventurePage');

  // Fired from the component, not the loader - the loader also runs on
  // TanStack Router's hover/touch "intent" preload (see router.tsx), which
  // would otherwise count a merely-hovered Discover card as a real view.
  // Mount only happens on an actual navigation to this page.
  useEffect(() => {
    fetch(apiUrl(`/adventure-pages/${page.id}/views`), { method: 'POST' }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);
  const { slug } = Route.useParams();
  const [signedIn, setSignedIn] = useState(false);
  const [contributeMode, setContributeMode] = useState(false);
  const [storyFormOpen, setStoryFormOpen] = useState(false);
  const [storyShared, setStoryShared] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  return (
    <>
      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-primary-100 to-accent-100 sm:h-72 dark:from-primary-950 dark:to-accent-950">
        {page.media[0] ? (
          <img src={page.media[0].url} alt={page.media[0].altText ?? ''} className="h-full w-full object-cover" />
        ) : (
          <MountainSnow className="h-16 w-16 text-primary-500 dark:text-primary-400" />
        )}
      </div>

      <Container>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">{page.title}</h1>
          {page.summary && <p className="mt-1 text-stone-600 dark:text-stone-300">{page.summary}</p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={page.verificationStatus} />
          {page.activityType && <Badge tone="neutral">{page.activityType.name}</Badge>}
          {page.difficultyLevel && <Badge tone="neutral">{page.difficultyLevel.name}</Badge>}
          {page.tags.map(({ tag }) => (
            <Badge key={tag.id} tone="neutral">
              #{tag.name}
            </Badge>
          ))}
        </div>

        <Card className="mt-6 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {(page.durationMinDays || page.durationMaxDays) && (
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label={t('info.duration')}
              value={t('info.durationValue', { min: page.durationMinDays, max: page.durationMaxDays })}
            />
          )}
          {page.maxAltitudeMeters && (
            <InfoItem
              icon={<MountainSnow className="h-4 w-4" />}
              label={t('info.maxAltitude')}
              value={t('info.altitudeValue', { altitude: page.maxAltitudeMeters })}
            />
          )}
          {page.districts.length > 0 && (
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label={t('info.districts')}
              value={page.districts.map((d) => d.district.name).join(', ')}
            />
          )}
          {page.seasons.length > 0 && (
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label={t('info.bestSeasons')}
              value={page.seasons.map((s) => s.season.name).join(', ')}
            />
          )}
          <InfoItem icon={<Users className="h-4 w-4" />} label={t('info.contributors')} value={page.contributorIds.length} />
        </Card>

        <GallerySection pageId={page.id} initialMedia={page.media} contributeMode={contributeMode} />

        <TrailsAndSpotsSection slug={slug} trails={trails} spots={spots} contributeMode={contributeMode} />

        <SeeAlsoSection pageId={page.id} relatedPages={page.relatedPages} contributeMode={contributeMode} />

        {page.currentRevision && (
          <div className="mt-6">
            <MarkdownContent content={page.currentRevision.content} />
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('stories.heading')}</h2>
            <Link
              to="/adventures/$slug/groups"
              params={{ slug }}
              className="text-sm text-primary-700 hover:underline dark:text-primary-400"
            >
              {t('stories.findTripGroup')}
            </Link>
          </div>
          {tripReports.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t('stories.noneShared')}</EmptyState>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {tripReports.map((report) => (
                <li key={report.id}>
                  <Card className="flex items-center justify-between p-4">
                    <Link
                      to="/adventures/$slug/trips/$tripReportId"
                      params={{ slug, tripReportId: report.id }}
                      className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                    >
                      {report.title ?? t('stories.fallbackTitle')}
                    </Link>
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      {formatDate(report.dateCompleted)}
                      {report.durationDays ? t('stories.durationSuffix', { days: report.durationDays }) : null}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-6 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <LikeButton pageId={page.id} initialLikeCount={page.likeCount} initialLiked={page.likedByMe} />
            {signedIn && !storyFormOpen && !storyShared && (
              <Button variant="accent" size="sm" onClick={() => setStoryFormOpen(true)}>
                {t('stories.tellYourStory')}
              </Button>
            )}
            {storyShared && (
              <p className="text-sm text-primary-700 dark:text-primary-400">{t('stories.shared')}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {signedIn && (
              <Button
                variant={contributeMode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setContributeMode((v) => !v)}
              >
                {contributeMode ? <X className="h-3.5 w-3.5" /> : <Hammer className="h-3.5 w-3.5" />}
                {contributeMode ? t('contribute.done') : t('contribute.contribute')}
              </Button>
            )}
            {contributeMode && (
              <Link to="/adventures/$slug/edit" params={{ slug }}>
                <Button variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5" /> {t('contribute.edit')}
                </Button>
              </Link>
            )}
            <Link to="/adventures/$slug/history" params={{ slug }}>
              <Button variant="ghost" size="sm">
                {t('common:actions.history')}
              </Button>
            </Link>
          </div>
        </div>

        {storyFormOpen && (
          <StoryForm
            pageId={page.id}
            onDone={() => {
              setStoryFormOpen(false);
              setStoryShared(true);
            }}
            onCancel={() => setStoryFormOpen(false)}
          />
        )}
      </Container>
    </>
  );
}

function LikeButton({
  pageId,
  initialLikeCount,
  initialLiked,
}: {
  pageId: string;
  initialLikeCount: number;
  initialLiked: boolean;
}) {
  const { t } = useTranslation('adventurePage');
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [signedIn, setSignedIn] = useState(false);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  async function toggleLike() {
    setBusy(true);
    try {
      if (liked) {
        await authDelete(`/adventure-pages/${pageId}/likes`);
        setLikeCount((count) => count - 1);
        setLiked(false);
      } else {
        await authPost(`/adventure-pages/${pageId}/likes`);
        setLikeCount((count) => count + 1);
        setLiked(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return signedIn ? (
    <Button variant={liked ? 'accent' : 'secondary'} size="sm" onClick={toggleLike} disabled={busy}>
      <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
      {liked ? t('like.liked') : t('like.like')} {t('like.countSuffix', { count: likeCount })}
    </Button>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
      <Heart className="h-4 w-4" /> {t('like.likesCount', { count: likeCount })}
    </span>
  );
}

function GallerySection({
  pageId,
  initialMedia,
  contributeMode,
}: {
  pageId: string;
  initialMedia: MediaItem[];
  contributeMode: boolean;
}) {
  const { t } = useTranslation(['adventurePage', 'common']);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [media, setMedia] = useState(initialMedia);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser);
  }, []);

  // Mirrors the backend's uploader-or-admin check in removeMedia (see
  // adventure-pages.service.ts) - purely a UI affordance, the API is the
  // real enforcement, but showing the button to everyone would just earn
  // non-owners a confusing 403 on click. Also gated on contributeMode so
  // the delete affordance only shows up alongside the rest of this page's
  // edit controls, not on every hover regardless of mode.
  function canDelete(item: MediaItem) {
    if (!contributeMode || !currentUser) return false;
    return currentUser.userId === item.uploadedById || currentUser.role === 'ADMIN';
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t('errors.choosePhoto'));
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url } = await authUpload<{ url: string }>('/uploads/images', formData);
      const created = await authPost<MediaItem>(`/adventure-pages/${pageId}/media`, {
        url,
        caption: caption || undefined,
        altText: altText || undefined,
      });
      setMedia((prev) => [...prev, created]);
      setCaption('');
      setAltText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToUploadPhoto'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(mediaId: string) {
    await authDelete(`/adventure-pages/${pageId}/media/${mediaId}`);
    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
  }

  if (media.length === 0 && !contributeMode) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('gallery.heading')}</h2>
        {contributeMode && !open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <ImagePlus className="h-3.5 w-3.5" /> {t('gallery.addPhoto')}
          </Button>
        )}
      </div>

      {media.length === 0 ? (
        <div className="mt-3">
          <EmptyState>{t('gallery.noPhotosYet')}</EmptyState>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item) => (
            <figure key={item.id} className="group relative overflow-hidden rounded-lg">
              <img
                src={item.url}
                alt={item.altText ?? ''}
                className="h-32 w-full rounded-lg object-cover sm:h-36"
              />
              {item.caption && (
                <figcaption className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
                  {item.caption}
                </figcaption>
              )}
              {canDelete(item) && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={t('gallery.deletePhoto')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {open && (
        <Card className="mt-4 max-w-md p-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Field label={t('gallery.photo')}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                className="block w-full text-sm text-stone-600 dark:text-stone-300"
              />
            </Field>
            <Field label={t('gallery.caption')}>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            <Field label={t('gallery.altText')}>
              <Input value={altText} onChange={(e) => setAltText(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('actions.uploading') : t('actions.upload')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}

function TrailsAndSpotsSection({
  slug,
  trails,
  spots,
  contributeMode,
}: {
  slug: string;
  trails: MapTrail[];
  spots: MapSpot[];
  contributeMode: boolean;
}) {
  const { t } = useTranslation(['adventurePage', 'common']);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  async function confirmTrail(id: string) {
    await authPost(`/trails/${id}/confirmations`);
    setConfirmed((prev) => new Set(prev).add(id));
  }

  async function confirmSpot(id: string) {
    await authPost(`/spots/${id}/confirmations`);
    setConfirmed((prev) => new Set(prev).add(id));
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('trailsAndSpots.heading')}</h2>
        {contributeMode && (
          <div className="flex gap-2">
            <Link to="/adventures/$slug/trails/new" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Plus className="h-3.5 w-3.5" /> {t('actions.addTrail')}
              </Button>
            </Link>
            <Link to="/adventures/$slug/spots/new" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Plus className="h-3.5 w-3.5" /> {t('actions.addSpot')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {trails.length === 0 && spots.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={<MapPin className="h-8 w-8" />}>{t('trailsAndSpots.noneYet')}</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <LazyAdventureMap trails={trails} spots={spots} zoom={12} />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {trails.map((trail) => (
              <li key={trail.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-900 dark:text-stone-50">{trail.name ?? t('trailsAndSpots.trailFallback')}</div>
                      <StatusBadge status={trail.verificationStatus} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/adventures/$slug/trails/$trailId/history"
                        params={{ slug, trailId: trail.id }}
                        className="text-sm text-stone-500 hover:underline dark:text-stone-400"
                      >
                        {t('common:actions.history')}
                      </Link>
                      {contributeMode && (
                        <Button
                          variant={confirmed.has(trail.id) ? 'ghost' : 'secondary'}
                          size="sm"
                          disabled={confirmed.has(trail.id)}
                          onClick={() => confirmTrail(trail.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {confirmed.has(trail.id) ? t('common:actions.confirmed') : t('common:actions.confirmAccurate')}
                        </Button>
                      )}
                    </div>
                  </div>
                  {trail.elevationSamples && trail.elevationSamples.length > 1 && (
                    <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                      <ElevationProfile
                        samples={trail.elevationSamples}
                        ascentMeters={trail.ascentMeters ?? undefined}
                        descentMeters={trail.descentMeters ?? undefined}
                        height={140}
                      />
                    </div>
                  )}
                </Card>
              </li>
            ))}
            {spots.map((spot) => (
              <li key={spot.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-50">{spot.name}</div>
                    <div className="flex items-center gap-2">
                      {spot.spotTypeName && <Badge tone="neutral">{spot.spotTypeName}</Badge>}
                      <StatusBadge status={spot.verificationStatus} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/adventures/$slug/spots/$spotId/history"
                      params={{ slug, spotId: spot.id }}
                      className="text-sm text-stone-500 hover:underline dark:text-stone-400"
                    >
                      {t('common:actions.history')}
                    </Link>
                    {contributeMode && (
                      <Button
                        variant={confirmed.has(spot.id) ? 'ghost' : 'secondary'}
                        size="sm"
                        disabled={confirmed.has(spot.id)}
                        onClick={() => confirmSpot(spot.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {confirmed.has(spot.id) ? t('common:actions.confirmed') : t('common:actions.confirmAccurate')}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SeeAlsoSection({
  pageId,
  relatedPages,
  contributeMode,
}: {
  pageId: string;
  relatedPages: { id: string; title: string; slug: string; summary: string | null }[];
  contributeMode: boolean;
}) {
  const { t } = useTranslation(['adventurePage', 'common']);
  const [open, setOpen] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pages, setPages] = useState(relatedPages);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const lookupRes = await fetch(apiUrl(`/adventure-pages/slug/${slugInput.trim()}`));
      if (!lookupRes.ok) {
        throw new Error(t('errors.noPageForSlug'));
      }
      const related: { id: string; title: string; slug: string; summary: string | null } = await lookupRes.json();
      await authPost(`/adventure-pages/${pageId}/related-pages`, { relatedPageId: related.id });
      setPages((prev) => [...prev, related]);
      setSlugInput('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToAddRelatedPage'));
    } finally {
      setSubmitting(false);
    }
  }

  if (pages.length === 0 && !contributeMode) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('seeAlso.heading')}</h2>
        {contributeMode && !open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> {t('seeAlso.addRelatedPage')}
          </Button>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="mt-3">
          <EmptyState>{t('seeAlso.noneYet')}</EmptyState>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {pages.map((related) => (
            <li key={related.id}>
              <Card className="p-4">
                <Link
                  to="/adventures/$slug"
                  params={{ slug: related.slug }}
                  className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                >
                  {related.title}
                </Link>
                {related.summary && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{related.summary}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Card className="mt-4 max-w-md p-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Field label={t('seeAlso.pageSlug')} hint={t('fields.pageSlugHint')}>
              <Input
                name="relatedSlug"
                required
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('actions.adding') : t('actions.add')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}

function StoryForm({
  pageId,
  onDone,
  onCancel,
}: {
  pageId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['adventurePage', 'common']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      await authPost(`/adventure-pages/${pageId}/trip-reports`, {
        title: formData.get('title') || undefined,
        description: formData.get('description') || undefined,
        content: formData.get('content') || undefined,
        dateCompleted: formData.get('dateCompleted'),
        durationDays: formData.get('durationDays') ? Number(formData.get('durationDays')) : undefined,
        actualCostAmount: formData.get('actualCostAmount') ? Number(formData.get('actualCostAmount')) : undefined,
        currency: formData.get('actualCostAmount') ? formData.get('currency') : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToShareStory'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mt-6 w-full p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('stories.tellYourStory')}</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        <Field label={t('fields.title')}>
          <Input name="title" placeholder={t('stories.titlePlaceholder')} />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label={t('stories.dateCompleted')}>
            <Input name="dateCompleted" type="date" required />
          </Field>
          <Field label={t('stories.durationDays')}>
            <Input name="durationDays" type="number" min={0} />
          </Field>
          <Field label={t('stories.actualCost')}>
            <Input name="actualCostAmount" type="number" min={0} />
          </Field>
          <Field label={t('stories.currency')}>
            <Select name="currency" defaultValue="NPR">
              <option value="NPR">NPR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
            </Select>
          </Field>
        </div>
        <Field label={t('fields.summary')} hint={t('stories.summaryHint')}>
          <Textarea name="description" rows={2} placeholder={t('stories.summaryPlaceholder')} />
        </Field>
        <Field label={t('stories.yourStory')} hint={t('stories.yourStoryHint')}>
          <Textarea name="content" rows={14} className="font-mono text-sm" placeholder={t('stories.yourStoryPlaceholder')} />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? t('stories.sharing') : t('stories.shareStory')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
