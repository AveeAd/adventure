import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../lib/auth/api';
import i18n from '../../../lib/i18n';
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
  head: () => ({ meta: [{ title: i18n.t('account:activityTracks.uploadTitle') }] }),
});

function UploadActivityTrackPage() {
  const { activityTypes } = Route.useLoaderData();
  const authStatus = useRequireAuth('/me/activity-tracks/upload');
  const navigate = useNavigate();
  const { t } = useTranslation(['account', 'common']);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.checkingSignIn')}</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError(t('activityTracks.errors.needFile'));
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
      setError(err instanceof Error ? err.message : t('activityTracks.errors.failedToImport'));
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('activityTracks.uploadTitle')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('activityTracks.uploadSubheading')}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('activityTracks.trackFile')}>
            <input
              type="file"
              accept=".gpx,.kml,.kmz,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-stone-600 dark:text-stone-300"
            />
          </Field>
          <Field label={t('activityTracks.activityType')}>
            <Select name="activityTypeId" required>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('activityTracks.fields.name')} hint={t('activityTracks.optional')}>
            <Input name="name" />
          </Field>
          <Field label={t('activityTracks.fields.notes')} hint={t('activityTracks.optional')}>
            <Textarea name="notes" rows={3} />
          </Field>
          <Field label={t('activityTracks.fields.visibility')}>
            <Select name="visibility" defaultValue="PRIVATE">
              <option value="PRIVATE">{t('activityTracks.fields.privateOnlyYou')}</option>
              <option value="PUBLIC">{t('activityTracks.fields.publicOption')}</option>
            </Select>
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('activityTracks.uploading') : t('activityTracks.upload')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
