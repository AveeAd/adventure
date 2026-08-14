import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../../lib/auth/require-auth';
import i18n from '../../../../lib/i18n';
import { buildMeta } from '../../../../lib/seo';
import { AttachmentPicker } from '../../../../components/AttachmentPicker';
import type { AttachmentOption } from '../../../../components/AttachmentPicker';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Field, Select, Textarea } from '../../../../components/FormField';

const THREAD_TAGS = ['DISCUSSION', 'TRIP_SHARE', 'QUESTION', 'ANNOUNCEMENT', 'RANDOM'] as const;

export const Route = createFileRoute('/clubs/$clubId/threads/new')({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/clubs/${params.clubId}`));
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to load club');
    }
    const club: { id: string; name: string } = await res.json();
    return { club };
  },
  component: NewThreadPage,
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData ? i18n.t('threads:composer.heading') + ' — ' + loaderData.club.name : i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/clubs/${params.clubId}/threads/new`,
      noindex: true,
    }),
});

function NewThreadPage() {
  const { club } = Route.useLoaderData();
  const { clubId } = Route.useParams();
  const authStatus = useRequireAuth(`/clubs/${clubId}/threads/new`);
  const navigate = useNavigate();
  const { t } = useTranslation(['threads', 'common']);
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<(typeof THREAD_TAGS)[number]>('DISCUSSION');
  const [tripReport, setTripReport] = useState<AttachmentOption | null>(null);
  const [trail, setTrail] = useState<AttachmentOption | null>(null);
  const [spot, setSpot] = useState<AttachmentOption | null>(null);
  const [adventurePage, setAdventurePage] = useState<AttachmentOption | null>(null);
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
    setError(null);
    setSubmitting(true);
    try {
      const thread = await authPost<{ id: string }>(`/clubs/${clubId}/threads`, {
        content,
        tag,
        tripReportId: tripReport?.id,
        trailId: trail?.id,
        spotId: spot?.id,
        adventurePageId: adventurePage?.id,
      });
      navigate({ to: '/clubs/$clubId/threads/$threadId', params: { clubId, threadId: thread.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCreate'));
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('composer.heading')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('composer.subheading', { club: club.name })}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('composer.tag')}>
            <Select value={tag} onChange={(e) => setTag(e.target.value as (typeof THREAD_TAGS)[number])}>
              {THREAD_TAGS.map((value) => (
                <option key={value} value={value}>
                  {t(`tags.${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('composer.content')}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              required
              className="font-mono text-sm"
              placeholder={t('composer.contentPlaceholder')}
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">{t('composer.attachments')}</p>
            <div className="flex flex-col gap-2">
              <AttachmentPicker type="tripReport" label={t('attachmentPicker.tripReport')} value={tripReport} onChange={setTripReport} />
              <AttachmentPicker type="trail" label={t('attachmentPicker.trail')} value={trail} onChange={setTrail} />
              <AttachmentPicker type="spot" label={t('attachmentPicker.spot')} value={spot} onChange={setSpot} />
              <AttachmentPicker
                type="adventurePage"
                label={t('attachmentPicker.adventurePage')}
                value={adventurePage}
                onChange={setAdventurePage}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting || !content.trim()} className="self-start">
            {submitting ? t('composer.posting') : t('composer.postButton')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
