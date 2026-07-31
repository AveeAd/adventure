import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../../lib/auth/api';
import { authUpload } from '../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../lib/auth/require-auth';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { Field, Input, Select, Textarea } from '../../../components/FormField';

interface MasterDataOption {
  id: string;
  name: string;
}

export const Route = createFileRoute('/me/activity-tracks/upload')({
  loader: async () => {
    const res = await fetch(apiUrl('/activity-types?pageSize=200'));
    const body: { data: MasterDataOption[] } = res.ok ? await res.json() : { data: [] };
    return { activityTypes: body.data };
  },
  component: UploadActivityTrackPage,
  head: () => ({ meta: [{ title: 'Upload an activity track' }] }),
});

function UploadActivityTrackPage() {
  const { activityTypes } = Route.useLoaderData();
  const authStatus = useRequireAuth('/me/activity-tracks/upload');
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Checking sign-in...</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Choose a GPX, KML, KMZ, or GeoJSON file to upload.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const uploadData = new FormData();
    uploadData.set('file', file);
    uploadData.set('activityTypeId', formData.get('activityTypeId') as string);
    const name = formData.get('name');
    if (name) uploadData.set('name', name as string);
    const notes = formData.get('notes');
    if (notes) uploadData.set('notes', notes as string);
    uploadData.set('visibility', formData.get('visibility') as string);

    try {
      const track = await authUpload<{ id: string }>('/activity-tracks/import', uploadData);
      navigate({ to: '/me/activity-tracks/$trackId', params: { trackId: track.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import track');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Upload an activity track</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        GPX, KML, KMZ, or GeoJSON - exported from maps.me, Strava, Garmin, or similar. Parsed on our server; private by
        default.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Track file">
            <input
              type="file"
              accept=".gpx,.kml,.kmz,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-stone-600 dark:text-stone-300"
            />
          </Field>
          <Field label="Activity type">
            <Select name="activityTypeId" required>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name" hint="Optional">
            <Input name="name" />
          </Field>
          <Field label="Notes" hint="Optional">
            <Textarea name="notes" rows={3} />
          </Field>
          <Field label="Visibility">
            <Select name="visibility" defaultValue="PRIVATE">
              <option value="PRIVATE">Private (only you)</option>
              <option value="PUBLIC">Public</option>
            </Select>
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
