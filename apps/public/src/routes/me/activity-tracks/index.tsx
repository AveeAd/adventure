import { Link, createFileRoute } from '@tanstack/react-router';
import { MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../../lib/auth/session';
import { useRequireAuth } from '../../../lib/auth/require-auth';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { EmptyState } from '../../../components/EmptyState';

interface ActivityTrackSummary {
  id: string;
  name: string | null;
  distanceMeters: number;
  startedAt: string;
  source: string;
  visibility: 'PRIVATE' | 'PUBLIC';
}

export const Route = createFileRoute('/me/activity-tracks/')({
  component: MyActivityTracksPage,
  head: () => ({ meta: [{ title: 'Your activity tracks' }] }),
});

function MyActivityTracksPage() {
  const authStatus = useRequireAuth('/me/activity-tracks');
  const [tracks, setTracks] = useState<ActivityTrackSummary[] | 'loading'>('loading');

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    (async () => {
      const user = await fetchCurrentUser();
      if (!user) return;
      const res = await authFetch(`/users/${user.userId}/activity-tracks?limit=50`);
      const body: { data: ActivityTrackSummary[] } = res.ok ? await res.json() : { data: [] };
      setTracks(body.data);
    })();
  }, [authStatus]);

  if (authStatus === 'checking' || tracks === 'loading') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Loading...</p>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Your activity tracks</h1>
        <Link to="/me/activity-tracks/upload">
          <Button>
            <Plus className="h-3.5 w-3.5" /> Upload a track
          </Button>
        </Link>
      </div>

      {tracks.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<MapPin className="h-8 w-8" />}>
            No tracks yet. Upload a GPX, KML, KMZ, or GeoJSON file from your phone or GPS watch.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {tracks.map((track) => (
            <li key={track.id}>
              <Link to="/me/activity-tracks/$trackId" params={{ trackId: track.id }}>
                <Card className="flex items-center justify-between p-4 hover:border-primary-300 dark:hover:border-primary-700">
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-50">{track.name ?? 'Untitled track'}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                      <span>{new Date(track.startedAt).toLocaleDateString()}</span>
                      <span>{(track.distanceMeters / 1000).toFixed(1)} km</span>
                    </div>
                  </div>
                  <Badge tone={track.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
                    {track.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                  </Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
