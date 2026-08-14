import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Calendar, CheckCircle2, UserMinus, UserPlus, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import { authDelete, authPatch, authPost } from '../../../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../../../lib/auth/session';
import { formatDate } from '../../../../lib/format';
import { Avatar } from '../../../../components/Avatar';
import { StatusBadge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { MarkdownContent } from '../../../../components/MarkdownContent';

interface TripGroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string };
}

interface TripGroupDetail {
  id: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  createdById: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  displayStatus: 'UPCOMING' | 'ONGOING' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
  members: TripGroupMember[];
}

export const Route = createFileRoute('/adventures/$slug/groups/$groupId')({
  loader: async ({ params }) => {
    const groupRes = await fetch(apiUrl(`/trip-groups/${params.groupId}`));
    if (groupRes.status === 404) {
      throw notFound();
    }
    if (!groupRes.ok) {
      throw new Error('Failed to load trip group');
    }
    const group: TripGroupDetail = await groupRes.json();
    return { slug: params.slug, group };
  },
  component: TripGroupDetailPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.group.title }] : [],
  }),
});

function TripGroupDetailPage() {
  const { slug, group: initialGroup } = Route.useLoaderData();
  const { t } = useTranslation('groups');
  const [group, setGroup] = useState(initialGroup);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => setCurrentUserId(user?.userId ?? null));
  }, []);

  const membership = group.members.find((m) => m.userId === currentUserId);
  const isOrganizer = membership?.role === 'ORGANIZER';
  const isOpen = group.status === 'ACTIVE';

  async function refresh() {
    const res = await fetch(apiUrl(`/trip-groups/${group.id}`));
    if (res.ok) setGroup(await res.json());
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await authPost(`/trip-groups/${group.id}/members`);
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
      await authDelete(`/trip-groups/${group.id}/members`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLeave'));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: 'COMPLETED' | 'CANCELLED') {
    setBusy(true);
    setError(null);
    try {
      await authPatch(`/trip-groups/${group.id}/status`, { status });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToUpdateStatus'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container>
      <Link
        to="/adventures/$slug/groups"
        params={{ slug }}
        className="text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
      >
        {t('backToGroups')}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{group.title}</h1>
        <StatusBadge status={group.displayStatus} />
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
        <Calendar className="h-4 w-4" />
        {formatDate(group.dateStart)} – {formatDate(group.dateEnd)}
      </p>

      <div className="mt-4">
        <MarkdownContent content={group.description} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isOpen &&
          currentUserId &&
          (membership ? (
            <Button variant="secondary" size="sm" onClick={leave} disabled={busy}>
              <UserMinus className="h-3.5 w-3.5" /> {t('leaveGroup')}
            </Button>
          ) : (
            <Button size="sm" onClick={join} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" /> {t('joinGroup')}
            </Button>
          ))}
        {isOrganizer && isOpen && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setStatus('COMPLETED')} disabled={busy}>
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('markCompleted')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setStatus('CANCELLED')} disabled={busy}>
              <XCircle className="h-3.5 w-3.5" /> {t('cancelGroup')}
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Card className="mt-8 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-50">
          <Users className="h-4 w-4" /> {t('members', { count: group.members.length })}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <Avatar label={member.user.email} size="sm" />
              <span className="text-sm text-stone-700 dark:text-stone-300">{member.user.email}</span>
              {member.role === 'ORGANIZER' && (
                <span className="text-xs text-stone-500 dark:text-stone-400">{t('organizer')}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}
