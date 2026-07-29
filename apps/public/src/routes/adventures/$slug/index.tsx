import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Calendar, CheckCircle2, Clock, Heart, MapPin, MountainSnow, Pencil, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../lib/auth/api';
import { authDelete, authPost } from '../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../lib/auth/session';
import { Badge, StatusBadge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { EmptyState } from '../../../components/EmptyState';
import { Textarea, Input, Field } from '../../../components/FormField';
import { MarkdownContent } from '../../../components/MarkdownContent';
import { LazyAdventureMap } from '../../../components/LazyAdventureMap';
import type { MapSpot, MapTrail } from '../../../components/AdventureMap';

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
  currentRevision: { content: string; createdAt: string } | null;
  contributorIds: string[];
  likeCount: number;
  likedByMe: boolean;
  media: { url: string; altText: string | null }[];
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
  const { slug } = Route.useParams();

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">{page.title}</h1>
            {page.summary && <p className="mt-1 text-stone-600 dark:text-stone-300">{page.summary}</p>}
          </div>
          <div className="flex gap-2">
            <Link to="/adventures/$slug/edit" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            <Link to="/adventures/$slug/history" params={{ slug }}>
              <Button variant="ghost" size="sm">
                History
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={page.verificationStatus} />
          {page.activityType && <Badge tone="neutral">{page.activityType.name}</Badge>}
          {page.difficultyLevel && <Badge tone="neutral">{page.difficultyLevel.name}</Badge>}
        </div>

        <Card className="mt-6 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {(page.durationMinDays || page.durationMaxDays) && (
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label="Duration"
              value={`${page.durationMinDays}-${page.durationMaxDays} days`}
            />
          )}
          {page.maxAltitudeMeters && (
            <InfoItem
              icon={<MountainSnow className="h-4 w-4" />}
              label="Max altitude"
              value={`${page.maxAltitudeMeters}m`}
            />
          )}
          {page.districts.length > 0 && (
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="Districts"
              value={page.districts.map((d) => d.district.name).join(', ')}
            />
          )}
          {page.seasons.length > 0 && (
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="Best seasons"
              value={page.seasons.map((s) => s.season.name).join(', ')}
            />
          )}
          <InfoItem icon={<Users className="h-4 w-4" />} label="Contributors" value={page.contributorIds.length} />
        </Card>

        <TrailsAndSpotsSection slug={slug} trails={trails} spots={spots} />

        <LikeButton pageId={page.id} initialLikeCount={page.likeCount} initialLiked={page.likedByMe} />

        {page.currentRevision && (
          <div className="mt-6">
            <MarkdownContent content={page.currentRevision.content} />
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Trip reports</h2>
            <Link
              to="/adventures/$slug/groups"
              params={{ slug }}
              className="text-sm text-primary-700 hover:underline dark:text-primary-400"
            >
              Find a trip group →
            </Link>
          </div>
          {tripReports.length === 0 ? (
            <div className="mt-3">
              <EmptyState>No trip reports logged yet.</EmptyState>
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
                      {report.title ?? 'Trip report'}
                    </Link>
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      {new Date(report.dateCompleted).toLocaleDateString()}
                      {report.durationDays ? ` · ${report.durationDays} days` : null}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <LogTripForm pageId={page.id} />
          </div>
        </section>
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

  return (
    <div className="mt-4">
      {signedIn ? (
        <Button variant={liked ? 'accent' : 'secondary'} size="sm" onClick={toggleLike} disabled={busy}>
          <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
          {liked ? 'Liked' : 'Like'} ({likeCount})
        </Button>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
          <Heart className="h-4 w-4" /> {likeCount} likes
        </span>
      )}
    </div>
  );
}

function TrailsAndSpotsSection({
  slug,
  trails,
  spots,
}: {
  slug: string;
  trails: MapTrail[];
  spots: MapSpot[];
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

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
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Trails &amp; spots</h2>
        {signedIn && (
          <div className="flex gap-2">
            <Link to="/adventures/$slug/trails/new" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Plus className="h-3.5 w-3.5" /> Add trail
              </Button>
            </Link>
            <Link to="/adventures/$slug/spots/new" params={{ slug }}>
              <Button variant="secondary" size="sm">
                <Plus className="h-3.5 w-3.5" /> Add spot
              </Button>
            </Link>
          </div>
        )}
      </div>

      {trails.length === 0 && spots.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={<MapPin className="h-8 w-8" />}>No trails or spots mapped yet.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <LazyAdventureMap trails={trails} spots={spots} zoom={12} />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {trails.map((trail) => (
              <li key={trail.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-50">{trail.name ?? 'Trail'}</div>
                    <StatusBadge status={trail.verificationStatus} />
                  </div>
                  {signedIn && (
                    <Button
                      variant={confirmed.has(trail.id) ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={confirmed.has(trail.id)}
                      onClick={() => confirmTrail(trail.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {confirmed.has(trail.id) ? 'Confirmed' : 'Confirm accurate'}
                    </Button>
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
                  {signedIn && (
                    <Button
                      variant={confirmed.has(spot.id) ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={confirmed.has(spot.id)}
                      onClick={() => confirmSpot(spot.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {confirmed.has(spot.id) ? 'Confirmed' : 'Confirm accurate'}
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function LogTripForm({ pageId }: { pageId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  if (!signedIn) {
    return null;
  }

  if (done) {
    return <p className="text-sm text-primary-700 dark:text-primary-400">Trip report logged. Thanks for sharing!</p>;
  }

  if (!open) {
    return (
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        Log your trip
      </Button>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      await authPost(`/adventure-pages/${pageId}/trip-reports`, {
        title: formData.get('title') || undefined,
        description: formData.get('description') || undefined,
        dateCompleted: formData.get('dateCompleted'),
        durationDays: formData.get('durationDays') ? Number(formData.get('durationDays')) : undefined,
        actualCostAmount: formData.get('actualCostAmount') ? Number(formData.get('actualCostAmount')) : undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log trip');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-md p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <Input name="title" />
        </Field>
        <Field label="Date completed">
          <Input name="dateCompleted" type="date" required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (days)">
            <Input name="durationDays" type="number" min={0} />
          </Field>
          <Field label="Actual cost (NPR)">
            <Input name="actualCostAmount" type="number" min={0} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea name="description" rows={3} />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" variant="accent" disabled={submitting}>
          {submitting ? 'Logging...' : 'Log trip'}
        </Button>
      </form>
    </Card>
  );
}
