import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../lib/auth/api';
import { authDelete, authFetch, authPatch, authPost } from '../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../lib/auth/require-auth';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { ElevationProfile } from '../../../components/ElevationProfile';
import { Field, Input, Select, Textarea } from '../../../components/FormField';
import { LazyAdventureMap } from '../../../components/LazyAdventureMap';

interface ActivityTrackDetail {
  id: string;
  name: string | null;
  notes: string | null;
  geometry: GeoJSON.LineString;
  samples: { d: number; e?: number; t?: number }[];
  distanceMeters: number;
  elapsedSeconds: number;
  ascentMeters: number | null;
  descentMeters: number | null;
  startedAt: string;
  source: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  adventurePageId: string | null;
}

export const Route = createFileRoute('/me/activity-tracks/$trackId')({
  component: ActivityTrackDetailPage,
  head: () => ({ meta: [{ title: 'Activity track' }] }),
});

function ActivityTrackDetailPage() {
  const { trackId } = Route.useParams();
  const authStatus = useRequireAuth(`/me/activity-tracks/${trackId}`);
  const navigate = useNavigate();

  const [track, setTrack] = useState<ActivityTrackDetail | null | 'loading'>('loading');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pageSlug, setPageSlug] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    authFetch(`/activity-tracks/${trackId}`).then(async (res) => {
      if (res.status === 404) {
        setTrack(null);
        return;
      }
      const data: ActivityTrackDetail = await res.json();
      setTrack(data);
      setName(data.name ?? '');
      setNotes(data.notes ?? '');
      setVisibility(data.visibility);
    });
  }, [authStatus, trackId]);

  if (authStatus === 'checking' || track === 'loading') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Loading...</p>
      </Container>
    );
  }
  if (track === null) {
    throw notFound();
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await authPatch(`/activity-tracks/${trackId}`, { name: name || undefined, notes: notes || undefined, visibility });
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  async function handleDelete() {
    await authDelete(`/activity-tracks/${trackId}`);
    navigate({ to: '/me/activity-tracks' });
  }

  async function handlePromote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPromoteError(null);
    setPromoting(true);
    try {
      const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${pageSlug.trim()}`));
      if (!pageRes.ok) {
        throw new Error('No adventure page found with that URL slug');
      }
      const page: { id: string } = await pageRes.json();
      await authPost(`/activity-tracks/${trackId}/promote-to-trail`, { adventurePageId: page.id, name: name || undefined });
      setPromoted(true);
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : 'Failed to contribute this track as a trail');
    } finally {
      setPromoting(false);
    }
  }

  const hasElevation = track.samples.some((s) => s.e !== undefined);

  return (
    <Container>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{track.name ?? 'Untitled track'}</h1>
        <Badge tone={track.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
          {track.visibility === 'PUBLIC' ? 'Public' : 'Private'}
        </Badge>
      </div>

      <div className="mt-2 flex gap-4 text-sm text-stone-500 dark:text-stone-400">
        <span>{new Date(track.startedAt).toLocaleString()}</span>
        <span>{(track.distanceMeters / 1000).toFixed(1)} km</span>
        <span>{Math.round(track.elapsedSeconds / 60)} min</span>
        <span>{track.source === 'IMPORTED' ? 'Imported' : 'Recorded'}</span>
      </div>

      <div className="mt-6">
        <LazyAdventureMap
          trails={[{ id: track.id, name: track.name, geometry: track.geometry, verificationStatus: 'UNVERIFIED' }]}
          spots={[]}
        />
      </div>

      {hasElevation && (
        <Card className="mt-6 p-5">
          <ElevationProfile
            samples={track.samples.filter((s): s is { d: number; e: number } => s.e !== undefined)}
            ascentMeters={track.ascentMeters ?? undefined}
            descentMeters={track.descentMeters ?? undefined}
          />
        </Card>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Edit</h2>
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          <Field label="Visibility">
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'PUBLIC')}>
              <option value="PRIVATE">Private (only you)</option>
              <option value="PUBLIC">Public</option>
            </Select>
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleDelete}>
              Delete track
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Contribute to the map</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Create a new trail on an adventure page from this track's path (simplified and time-stripped).
        </p>
        {promoted ? (
          <p className="mt-4 text-sm text-primary-700 dark:text-primary-400">
            Contributed - the new trail is now on that adventure page, pending peer confirmation.
          </p>
        ) : (
          <form onSubmit={handlePromote} className="mt-4 flex flex-col gap-4">
            <Field label="Adventure page URL slug" hint="e.g. annapurna-base-camp">
              <Input value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} required />
            </Field>
            {promoteError && <p className="text-sm text-red-600 dark:text-red-400">{promoteError}</p>}
            <Button type="submit" disabled={promoting} className="self-start">
              {promoting ? 'Contributing...' : 'Contribute as a new trail'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
}
