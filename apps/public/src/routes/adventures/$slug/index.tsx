import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Clock, Footprints, Hammer, Heart, History, ImagePlus, MapPin, MountainSnow, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../lib/auth/api';
import { authDelete, authFetch, authPost, authUpload } from '../../../lib/auth/auth-fetch';
import { checkAuth, fetchCurrentUser, type CurrentUser } from '../../../lib/auth/session';
import { formatDate } from '../../../lib/format';
import { Avatar } from '../../../components/Avatar';
import { Badge, StatusBadge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { EmptyState } from '../../../components/EmptyState';
import { Textarea, Input, Field, Select } from '../../../components/FormField';
import { MarkdownContent } from '../../../components/MarkdownContent';
import { ReportButton } from '../../../components/ReportButton';
import { LazyAdventureMap } from '../../../components/LazyAdventureMap';
import { MapHeroLayout } from '../../../components/MapHeroLayout';
import { MultiSelectChips, selectedChipValues } from '../../../components/MultiSelectChips';
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

interface RelatedPageSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  verificationStatus: string;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  media: { url: string; altText: string | null }[];
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
  difficultyLevel: { name: string; slug: string } | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  tags: { tag: { id: string; name: string; slug: string } }[];
  relatedPages: RelatedPageSummary[];
  currentRevision: { content: string; createdAt: string; version: number } | null;
  approvedRevision: { content: string; createdAt: string; version: number } | null;
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
  contributorIds: string[];
  likeCount: number;
  likedByMe: boolean;
  visitCount: number;
  visitedByMe: boolean;
  media: MediaItem[];
}

const STORIES_PAGE_SIZE = 5;

interface TripReportSummary {
  id: string;
  title: string | null;
  description: string | null;
  authorId: string;
  authorName: string;
  authorGuideLevel: number;
  dateCompleted: string;
  durationDays: number | null;
  kudosCount: number;
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

    const tripReportsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/trip-reports?pageSize=50`));
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
  const [visibleStoryCount, setVisibleStoryCount] = useState(STORIES_PAGE_SIZE);
  const [storySort, setStorySort] = useState<'liked' | 'newest'>('liked');

  const sortedTripReports = useMemo(() => {
    const sorted = [...tripReports];
    if (storySort === 'liked') {
      sorted.sort((a, b) => b.kudosCount - a.kudosCount || +new Date(b.dateCompleted) - +new Date(a.dateCompleted));
    } else {
      sorted.sort((a, b) => +new Date(b.dateCompleted) - +new Date(a.dateCompleted));
    }
    return sorted;
  }, [tripReports, storySort]);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  return (
    <>
      <div className="relative z-0 -mt-24 flex h-96 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-100 to-accent-100 sm:-mt-28 sm:h-[28rem] dark:from-primary-950 dark:to-accent-950">
        {page.media[0] ? (
          <img src={page.media[0].url} alt={page.media[0].altText ?? ''} className="h-full w-full object-cover" />
        ) : (
          <MountainSnow className="h-16 w-16 text-primary-500 dark:text-primary-400" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-stone-50 dark:to-stone-950"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-16 mx-auto w-full max-w-5xl px-4 pb-5 sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">{page.title}</h1>
          {page.summary && <p className="mt-1 text-stone-100/90 drop-shadow-sm">{page.summary}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={page.verificationStatus} glass />
            {!page.approvedRevisionId && (
              <Badge tone="warning" glass>
                {t('approval.unapprovedBadge')}
              </Badge>
            )}
            {page.activityType && (
              <Badge tone="neutral" glass>
                {page.activityType.name}
              </Badge>
            )}
            {page.difficultyLevel && (
              <Badge tone="neutral" glass>
                {page.difficultyLevel.name}
              </Badge>
            )}
            {page.tags.map(({ tag }) => (
              <Badge key={tag.id} tone="neutral" glass>
                #{tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Container size="wide">
        {page.pendingRevisionCount > 0 && page.currentRevision && (
          <Link
            to="/adventures/$slug/history/$version"
            params={{ slug, version: String(page.currentRevision.version) }}
            className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('approval.pendingChanges', { count: page.pendingRevisionCount })}
          </Link>
        )}

        <GallerySection pageId={page.id} initialMedia={page.media} contributeMode={contributeMode} />

        <TrailsAndSpotsSection
          slug={slug}
          trails={trails}
          spots={spots}
          contributeMode={contributeMode}
          difficultyLevel={page.difficultyLevel}
          tags={page.tags}
          page={page}
        />

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-6 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <LikeButton pageId={page.id} initialLikeCount={page.likeCount} initialLiked={page.likedByMe} />
            <VisitButton pageId={page.id} initialVisitCount={page.visitCount} initialVisited={page.visitedByMe} />
            {signedIn && !storyFormOpen && !storyShared && (
              <Button variant="secondary" size="sm" onClick={() => setStoryFormOpen(true)}>
                {t('stories.tellYourStory')}
              </Button>
            )}
            {storyShared && (
              <p className="text-sm text-primary-700 dark:text-primary-400">{t('stories.shared')}</p>
            )}
            <Link to="/adventures/$slug/groups" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Users className="h-3.5 w-3.5" /> {t('stories.findTripGroup')}
              </Button>
            </Link>
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
            <Link
              to="/adventures/$slug/history"
              params={{ slug }}
              aria-label={t('common:actions.history')}
              title={t('common:actions.history')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
            >
              <History className="h-4 w-4" />
            </Link>
            <ReportButton targetType="ADVENTURE_PAGE" targetId={page.id} />
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

        <section className="mt-10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('stories.heading')}</h2>
            {tripReports.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant={storySort === 'liked' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setStorySort('liked');
                    setVisibleStoryCount(STORIES_PAGE_SIZE);
                  }}
                >
                  {t('stories.sortMostLiked')}
                </Button>
                <Button
                  variant={storySort === 'newest' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setStorySort('newest');
                    setVisibleStoryCount(STORIES_PAGE_SIZE);
                  }}
                >
                  {t('stories.sortNewest')}
                </Button>
              </div>
            )}
          </div>
          {tripReports.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t('stories.noneShared')}</EmptyState>
            </div>
          ) : (
            <>
              <Card glass className="mt-3 divide-y divide-[color:var(--glass-border)] p-0">
                {sortedTripReports.slice(0, visibleStoryCount).map((report) => (
                  <div key={report.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/adventures/$slug/trips/$tripReportId"
                        params={{ slug, tripReportId: report.id }}
                        className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                      >
                        {report.title ?? t('stories.fallbackTitle')}
                      </Link>
                      <span className="whitespace-nowrap text-sm text-stone-500 dark:text-stone-400">
                        {formatDate(report.dateCompleted)}
                        {report.durationDays ? t('stories.durationSuffix', { days: report.durationDays }) : null}
                      </span>
                    </div>

                    {report.description && (
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{report.description}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Link
                        to="/users/$id"
                        params={{ id: report.authorId }}
                        className="flex items-center gap-2 text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
                      >
                        <Avatar label={report.authorName} size="sm" />
                        {report.authorName}
                        <Badge tone="neutral">{t('stories.authorGuideLevel', { level: report.authorGuideLevel })}</Badge>
                      </Link>
                      <span className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                        <Heart className="h-3.5 w-3.5" /> {t('stories.kudosCount', { count: report.kudosCount })}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>

              {visibleStoryCount < tripReports.length && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleStoryCount((count) => count + STORIES_PAGE_SIZE)}
                  >
                    {t('stories.seeMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        <SeeAlsoSection pageId={page.id} relatedPages={page.relatedPages} contributeMode={contributeMode} />
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

function VisitButton({
  pageId,
  initialVisitCount,
  initialVisited,
}: {
  pageId: string;
  initialVisitCount: number;
  initialVisited: boolean;
}) {
  const { t } = useTranslation('adventurePage');
  const [visitCount, setVisitCount] = useState(initialVisitCount);
  const [signedIn, setSignedIn] = useState(false);
  const [visited, setVisited] = useState(initialVisited);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  async function toggleVisit() {
    setBusy(true);
    try {
      if (visited) {
        await authDelete(`/adventure-pages/${pageId}/visits`);
        setVisitCount((count) => count - 1);
        setVisited(false);
      } else {
        await authPost(`/adventure-pages/${pageId}/visits`);
        setVisitCount((count) => count + 1);
        setVisited(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return signedIn ? (
    <Button variant={visited ? 'accent' : 'secondary'} size="sm" onClick={toggleVisit} disabled={busy}>
      <Footprints className="h-4 w-4" />
      {visited ? t('visit.beenHere') : t('visit.markVisited')} {t('visit.countSuffix', { count: visitCount })}
    </Button>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
      <Footprints className="h-4 w-4" /> {t('visit.visitedCount', { count: visitCount })}
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
          {media.map((item, index) => (
            <figure key={item.id} className="group relative">
              <div className="relative overflow-hidden rounded-lg">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="block w-full cursor-zoom-in"
                  aria-label={t('gallery.viewPhoto')}
                >
                  <img
                    src={item.url}
                    alt={item.altText ?? ''}
                    className="h-32 w-full rounded-lg object-cover sm:h-36"
                  />
                </button>
                {canDelete(item) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={t('gallery.deletePhoto')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {item.caption && (
                <figcaption className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          media={media}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
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

function Lightbox({
  media,
  index,
  onIndexChange,
  onClose,
}: {
  media: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('adventurePage');
  const item = media[index];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + media.length) % media.length);
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % media.length);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, media.length, onIndexChange, onClose]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <ReportButton
          targetType="MEDIA"
          targetId={item.id}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label={t('gallery.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {media.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + media.length) % media.length);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
          aria-label={t('gallery.previous')}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <img
        src={item.url}
        alt={item.altText ?? ''}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full rounded-lg object-contain"
      />

      {media.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % media.length);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
          aria-label={t('gallery.next')}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div
        className="mt-4 flex w-full max-w-lg flex-col items-center gap-1 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.caption && <p className="text-sm text-white">{item.caption}</p>}
        <span className="text-xs text-white/60">{t('gallery.counter', { current: index + 1, total: media.length })}</span>
      </div>
    </div>
  );
}

const EXPERT_DIFFICULTY_SLUGS = new Set(['strenuous', 'extreme']);

const TRAIT_TAG_SLUGS: Record<string, { labelKey: string; tone: 'success' | 'neutral' }> = {
  'hidden-gem': { labelKey: 'trailsAndSpots.traits.hiddenGem', tone: 'success' },
  'family-friendly': { labelKey: 'trailsAndSpots.traits.familyFriendly', tone: 'success' },
  'pet-friendly': { labelKey: 'trailsAndSpots.traits.petFriendly', tone: 'success' },
};

function TraitBadges({
  difficultyLevel,
  tags,
  t,
}: {
  difficultyLevel: { slug: string } | null;
  tags: { tag: { id: string; slug: string } }[];
  t: (key: string) => string;
}) {
  return (
    <>
      {difficultyLevel && EXPERT_DIFFICULTY_SLUGS.has(difficultyLevel.slug) && (
        <Badge tone="warning">{t('trailsAndSpots.traits.expertOnly')}</Badge>
      )}
      {tags
        .filter(({ tag }) => TRAIT_TAG_SLUGS[tag.slug])
        .map(({ tag }) => {
          const trait = TRAIT_TAG_SLUGS[tag.slug];
          return (
            <Badge key={tag.id} tone={trait.tone}>
              {t(trait.labelKey)}
            </Badge>
          );
        })}
    </>
  );
}

function TrailsAndSpotsSection({
  slug,
  trails,
  spots,
  contributeMode,
  difficultyLevel,
  tags,
  page,
}: {
  slug: string;
  trails: MapTrail[];
  spots: MapSpot[];
  contributeMode: boolean;
  difficultyLevel: { name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  page: AdventurePageDetail;
}) {
  const { t } = useTranslation(['adventurePage', 'common']);

  const sidebar = (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">{t('info.heading')}</h2>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {(page.approvedRevision ?? page.currentRevision) && (
        <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
          <MarkdownContent content={(page.approvedRevision ?? page.currentRevision)!.content} />
        </div>
      )}

      <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('trailsAndSpots.heading')}</h2>
          {contributeMode && (
            <div className="flex gap-2">
              <Link to="/adventures/$slug/trails/new" params={{ slug }}>
                <Button variant="secondary" size="sm">
                  <Plus className="h-3.5 w-3.5" /> {trails.length > 0 ? t('actions.updateTrail') : t('actions.addTrail')}
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
          <ul className="mt-3 flex flex-col gap-2">
            {trails.map((trail) => (
              <li key={trail.id}>
                <Card glass className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-900 dark:text-stone-50">{trail.name ?? t('trailsAndSpots.trailFallback')}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={trail.verificationStatus} />
                        {!trail.approvedRevisionId && <Badge tone="warning">{t('approval.unapprovedBadge')}</Badge>}
                        {!!trail.pendingRevisionCount && (
                          <Badge tone="warning">{t('approval.pendingChanges', { count: trail.pendingRevisionCount })}</Badge>
                        )}
                        <TraitBadges difficultyLevel={difficultyLevel} tags={tags} t={t} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/adventures/$slug/trails/$trailId/history"
                        params={{ slug, trailId: trail.id }}
                        aria-label={t('common:actions.history')}
                        title={t('common:actions.history')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Link>
                      <ReportButton targetType="TRAIL" targetId={trail.id} />
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
                <Card glass className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-50">{spot.name}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {spot.spotTypeName && <Badge tone="neutral">{spot.spotTypeName}</Badge>}
                      <StatusBadge status={spot.verificationStatus} />
                      {!spot.approvedRevisionId && <Badge tone="warning">{t('approval.unapprovedBadge')}</Badge>}
                      {!!spot.pendingRevisionCount && (
                        <Badge tone="warning">{t('approval.pendingChanges', { count: spot.pendingRevisionCount })}</Badge>
                      )}
                      <TraitBadges difficultyLevel={difficultyLevel} tags={tags} t={t} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/adventures/$slug/spots/$spotId/history"
                      params={{ slug, spotId: spot.id }}
                      aria-label={t('common:actions.history')}
                      title={t('common:actions.history')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Link>
                    <ReportButton targetType="SPOT" targetId={spot.id} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{t('trailsAndSpots.mapHeading')}</h2>
      <MapHeroLayout
        sidebar={sidebar}
        map={<LazyAdventureMap trails={trails} spots={spots} zoom={12} height="full" />}
        expandLabel={t('trailsAndSpots.showMore')}
        collapseLabel={t('trailsAndSpots.showLess')}
      />
    </section>
  );
}

function SeeAlsoSection({
  pageId,
  relatedPages,
  contributeMode,
}: {
  pageId: string;
  relatedPages: RelatedPageSummary[];
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
      const related: RelatedPageSummary = await lookupRes.json();
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
              <Card className="flex gap-3 p-4">
                {related.media[0] && (
                  <img
                    src={related.media[0].url}
                    alt={related.media[0].altText ?? ''}
                    className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to="/adventures/$slug"
                    params={{ slug: related.slug }}
                    className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                  >
                    {related.title}
                  </Link>
                  {related.summary && (
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{related.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={related.verificationStatus} />
                    {related.activityType && <Badge tone="neutral">{related.activityType.name}</Badge>}
                    {related.difficultyLevel && <Badge tone="neutral">{related.difficultyLevel.name}</Badge>}
                    {(related.durationMinDays || related.durationMaxDays) && (
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {t('info.durationValue', { min: related.durationMinDays, max: related.durationMaxDays })}
                      </span>
                    )}
                  </div>
                </div>
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

interface MyTrackOption {
  id: string;
  name: string | null;
  distanceMeters: number | null;
  startedAt: string;
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
  const [myTracks, setMyTracks] = useState<MyTrackOption[]>([]);
  const [myClubs, setMyClubs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    authFetch('/me/activity-tracks')
      .then((res) => (res.ok ? res.json() : []))
      .then(setMyTracks)
      .catch(() => setMyTracks([]));
    authFetch('/clubs/mine')
      .then((res) => (res.ok ? res.json() : []))
      .then(setMyClubs)
      .catch(() => setMyClubs([]));
  }, []);

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
        activityTrackIds: selectedChipValues(event.currentTarget, 'activityTrackIds'),
        clubId: formData.get('clubId') || undefined,
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
        {myTracks.length > 0 && (
          <Field label={t('stories.attachTracks')} hint={t('stories.attachTracksHint')}>
            <MultiSelectChips name="activityTrackIds" options={myTracks.map(trackOption)} />
          </Field>
        )}
        {myClubs.length > 0 && (
          <Field label={t('stories.club')} hint={t('stories.clubHint')}>
            <Select name="clubId" defaultValue="">
              <option value="">{t('stories.clubNone')}</option>
              {myClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
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

function trackOption(track: MyTrackOption): { id: string; name: string } {
  const distanceKm = track.distanceMeters ? `${(track.distanceMeters / 1000).toFixed(1)}km` : null;
  const label = [track.name ?? formatDate(track.startedAt), distanceKm].filter(Boolean).join(' · ');
  return { id: track.id, name: label };
}
