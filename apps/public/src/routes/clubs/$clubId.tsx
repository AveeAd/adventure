import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Check, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { authDelete, authFetch, authPatch, authPost } from '../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../lib/auth/session';
import { formatDate } from '../../lib/format';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';

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
  visibility: 'PUBLIC' | 'PRIVATE';
  createdById: string;
  members?: ClubMember[];
  viewerMembership?: { role: string; status: string } | null;
}

interface ClubTripReport {
  id: string;
  title: string | null;
  dateCompleted: string;
  author: { email: string };
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
    <Container size="wide">
      <Link
        to="/clubs"
        className="text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
      >
        {t('backToClubs')}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-stone-50">{club.name}</h1>
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

      {club.members && (
        <Card className="mt-6 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-50">
            <Users className="h-4 w-4" /> {t('members', { count: club.members.length })}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {club.members.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <Avatar label={member.user.email} size="sm" />
                <span className="text-sm text-stone-700 dark:text-stone-300">{member.user.email}</span>
                {member.role === 'OWNER' && <span className="text-xs text-stone-500 dark:text-stone-400">{t('owner')}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <h2 className="font-semibold text-stone-900 dark:text-stone-50">{t('tripReportsHeading')}</h2>
        {tripReports.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('noTripReportsYet')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {tripReports.map((report) => (
              <li key={report.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-700 dark:text-stone-300">{report.title ?? report.author.email}</span>
                <span className="text-stone-500 dark:text-stone-400">{formatDate(report.dateCompleted)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
