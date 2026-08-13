import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Check, Heart, Users, UserMinus, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { authDelete, authFetch, authPatch, authPost } from '../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../lib/auth/session';
import { formatDate } from '../../lib/format';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';

interface ClubMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  user: { id: string; email: string };
}

interface ClubDetail {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdById: string;
  members?: ClubMember[];
  _count: { members: number };
  viewerMembership?: { role: string; status: string } | null;
}

interface ClubTripReport {
  id: string;
  title: string | null;
  description: string | null;
  dateCompleted: string;
  authorId: string;
  authorName: string;
  kudosCount: number;
  adventurePage: { title: string; slug: string };
}

export const Route = createFileRoute('/clubs/$clubId')({
  loader: async ({ params }) => {
    const clubRes = await fetch(apiUrl(`/clubs/${params.clubId}`));
    if (clubRes.status === 404) {
      throw notFound();
    }
    if (!clubRes.ok) {
      throw new Error('Failed to load club');
    }
    const club: ClubDetail = await clubRes.json();

    const reportsRes = await fetch(apiUrl(`/clubs/${params.clubId}/trip-reports`));
    const tripReports: ClubTripReport[] = reportsRes.ok ? await reportsRes.json() : [];

    return { club, tripReports };
  },
  component: ClubDetailPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.club.name }] : [],
  }),
});

function ClubDetailPage() {
  const { club: initialClub, tripReports } = Route.useLoaderData();
  const { t } = useTranslation('clubs');
  const [club, setClub] = useState(initialClub);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ClubMember[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'feed' | 'members'>('feed');

  async function refresh() {
    const res = await authFetch(`/clubs/${club.id}`);
    if (res.ok) setClub(await res.json());
  }

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setCurrentUserId(user?.userId ?? null);
      if (user) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const membership = club.members
    ? club.members.find((m) => m.userId === currentUserId)
    : club.viewerMembership
      ? ({ role: club.viewerMembership.role, status: club.viewerMembership.status } as Pick<ClubMember, 'role' | 'status'>)
      : undefined;
  const isOwner = membership?.role === 'OWNER' && membership.status === 'APPROVED';
  const isApprovedMember = membership?.status === 'APPROVED';

  useEffect(() => {
    if (!isOwner) {
      setPendingRequests(null);
      return;
    }
    authFetch(`/clubs/${club.id}/join-requests`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPendingRequests)
      .catch(() => setPendingRequests([]));
  }, [isOwner, club.id]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await authPost(`/clubs/${club.id}/members`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToJoin'));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      await authDelete(`/clubs/${club.id}/members`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLeave'));
    } finally {
      setBusy(false);
    }
  }

  async function requestToJoin() {
    setBusy(true);
    setError(null);
    try {
      await authPost(`/clubs/${club.id}/join-requests`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToRequest'));
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, decision: 'APPROVED' | 'DECLINED') {
    setBusy(true);
    setError(null);
    try {
      await authPatch(`/clubs/${club.id}/join-requests/${requestId}`, { decision });
      setPendingRequests((prev) => prev?.filter((r) => r.id !== requestId) ?? null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToDecide'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="relative z-0 -mt-24 flex h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-100 to-accent-100 sm:-mt-28 sm:h-80 dark:from-primary-950 dark:to-accent-950">
        {club.coverImageUrl && <img src={club.coverImageUrl} alt="" className="h-full w-full object-cover" />}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-stone-50 dark:to-stone-950"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-10 mx-auto w-full max-w-5xl px-4 pb-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md">
              <Users className="h-7 w-7" />
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">{club.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={club.visibility === 'PUBLIC' ? 'success' : 'neutral'} glass>
              {club.visibility === 'PUBLIC' ? t('visibilityPublicShort') : t('visibilityPrivateShort')}
            </Badge>
            {club.members ? (
              <button type="button" onClick={() => setView('members')} className="cursor-pointer">
                <Badge tone="neutral" glass>
                  <Users className="mr-1 h-3 w-3" /> {t('membersCount', { count: club._count.members })}
                </Badge>
              </button>
            ) : (
              <Badge tone="neutral" glass>
                <Users className="mr-1 h-3 w-3" /> {t('membersCount', { count: club._count.members })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Container size="wide">
        <Link
          to="/clubs"
          className="text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
        >
          {t('backToClubs')}
        </Link>

        {club.description && <p className="mt-4 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{club.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {currentUserId && !membership && club.visibility === 'PUBLIC' && (
            <Button size="sm" onClick={join} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" /> {t('joinClub')}
            </Button>
          )}
          {currentUserId && !membership && club.visibility === 'PRIVATE' && (
            <Button size="sm" onClick={requestToJoin} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" /> {t('requestToJoin')}
            </Button>
          )}
          {membership?.status === 'PENDING' && (
            <p className="text-sm text-stone-500 dark:text-stone-400">{t('requestPending')}</p>
          )}
          {membership?.status === 'DECLINED' && (
            <>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('requestDeclined')}</p>
              <Button size="sm" onClick={requestToJoin} disabled={busy}>
                <UserPlus className="h-3.5 w-3.5" /> {t('requestToJoin')}
              </Button>
            </>
          )}
          {isApprovedMember && membership?.role === 'MEMBER' && (
            <Button variant="secondary" size="sm" onClick={leave} disabled={busy}>
              <UserMinus className="h-3.5 w-3.5" /> {t('leaveClub')}
            </Button>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {isOwner && pendingRequests && pendingRequests.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="font-semibold text-stone-900 dark:text-stone-50">
              {t('pendingRequestsHeading', { count: pendingRequests.length })}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {pendingRequests.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar label={request.user.email} size="sm" />
                    <span className="text-sm text-stone-700 dark:text-stone-300">{request.user.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(request.id, 'APPROVED')} disabled={busy}>
                      <Check className="h-3.5 w-3.5" /> {t('approve')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => decide(request.id, 'DECLINED')} disabled={busy}>
                      <X className="h-3.5 w-3.5" /> {t('decline')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <section className="mt-8 mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
              {view === 'members' ? t('members', { count: club.members?.length ?? 0 }) : t('feedHeading')}
            </h2>
            {view === 'members' && (
              <button
                type="button"
                onClick={() => setView('feed')}
                className="text-sm text-primary-700 hover:underline dark:text-primary-400"
              >
                {t('feedHeading')}
              </button>
            )}
          </div>

          {view === 'members' ? (
            <Card className="mt-3 p-5">
              <ul className="flex flex-col gap-2">
                {club.members?.map((member) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <Avatar label={member.user.email} size="sm" />
                    <span className="text-sm text-stone-700 dark:text-stone-300">{member.user.email}</span>
                    {member.role === 'OWNER' && <span className="text-xs text-stone-500 dark:text-stone-400">{t('owner')}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          ) : tripReports.length === 0 ? (
            <div className="mt-3">
              <EmptyState>{t('noTripReportsYet')}</EmptyState>
            </div>
          ) : (
            <Card glass className="mt-3 divide-y divide-[color:var(--glass-border)] p-0">
              {tripReports.map((report) => (
                <div key={report.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/adventures/$slug/trips/$tripReportId"
                      params={{ slug: report.adventurePage.slug, tripReportId: report.id }}
                      className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                    >
                      {report.title ?? report.adventurePage.title}
                    </Link>
                    <span className="whitespace-nowrap text-sm text-stone-500 dark:text-stone-400">
                      {formatDate(report.dateCompleted)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{report.adventurePage.title}</p>

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
                    </Link>
                    <span className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                      <Heart className="h-3.5 w-3.5" /> {report.kudosCount}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </Container>
    </>
  );
}
