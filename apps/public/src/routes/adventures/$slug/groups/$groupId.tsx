import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { Calendar, UserMinus, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authDelete, authPost } from '../../../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../../../lib/auth/session';
import { formatDate } from '../../../../lib/format';
import { Avatar } from '../../../../components/Avatar';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';

interface TripGroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string };
}

interface TripGroupDetail {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  createdById: string;
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
  const navigate = useNavigate();
  const [group, setGroup] = useState(initialGroup);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => setCurrentUserId(user?.userId ?? null));
  }, []);

  const membership = group.members.find((m) => m.userId === currentUserId);
  const isOrganizer = membership?.role === 'ORGANIZER';

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
      setError(err instanceof Error ? err.message : 'Failed to join');
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
      setError(err instanceof Error ? err.message : 'Failed to leave');
    } finally {
      setBusy(false);
    }
  }

  async function cancelGroup() {
    setBusy(true);
    setError(null);
    try {
      await authDelete(`/trip-groups/${group.id}`);
      navigate({ to: '/adventures/$slug/groups', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel group');
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
        ← Back to trip groups
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-stone-50">{group.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
        <Calendar className="h-4 w-4" />
        {formatDate(group.dateStart)} – {formatDate(group.dateEnd)}
      </p>

      {group.description && <p className="mt-4 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{group.description}</p>}

      <div className="mt-4 flex gap-2">
        {currentUserId &&
          (membership ? (
            <Button variant="secondary" size="sm" onClick={leave} disabled={busy}>
              <UserMinus className="h-3.5 w-3.5" /> Leave group
            </Button>
          ) : (
            <Button size="sm" onClick={join} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" /> Join group
            </Button>
          ))}
        {isOrganizer && (
          <Button variant="danger" size="sm" onClick={cancelGroup} disabled={busy}>
            Cancel group
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Card className="mt-8 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-50">
          <Users className="h-4 w-4" /> Members ({group.members.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <Avatar label={member.user.email} size="sm" />
              <span className="text-sm text-stone-700 dark:text-stone-300">{member.user.email}</span>
              {member.role === 'ORGANIZER' && (
                <span className="text-xs text-stone-500 dark:text-stone-400">Organizer</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}
