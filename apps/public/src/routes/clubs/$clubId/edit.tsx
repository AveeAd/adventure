import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../lib/auth/api';
import { authDelete, authFetch, authPatch } from '../../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../../lib/auth/session';
import { useRequireAuth } from '../../../lib/auth/require-auth';
import i18n from '../../../lib/i18n';
import { buildMeta } from '../../../lib/seo';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { Field, Input, Select, Textarea } from '../../../components/FormField';

interface ClubMember {
  userId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
}

interface ClubForEdit {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  members?: ClubMember[];
  viewerMembership?: { role: string; status: string } | null;
}

export const Route = createFileRoute('/clubs/$clubId/edit')({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/clubs/${params.clubId}`));
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to load club');
    }
    const club: ClubForEdit = await res.json();
    return { club };
  },
  component: EditClubPage,
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData?.club.name ?? i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/clubs/${params.clubId}/edit`,
      noindex: true,
    }),
});

function EditClubPage() {
  const { club: initialClub } = Route.useLoaderData();
  const { clubId } = Route.useParams();
  const authStatus = useRequireAuth(`/clubs/${clubId}/edit`);
  const navigate = useNavigate();
  const { t } = useTranslation(['clubs', 'common']);
  const [club, setClub] = useState(initialClub);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    Promise.all([fetchCurrentUser(), authFetch(`/clubs/${clubId}`).then((res) => (res.ok ? res.json() : null))]).then(
      ([user, full]: [Awaited<ReturnType<typeof fetchCurrentUser>>, ClubForEdit | null]) => {
        if (!user || !full) {
          setCanManage(false);
          return;
        }
        setClub(full);
        const membership = full.members
          ? full.members.find((m) => m.userId === user.userId)
          : full.viewerMembership
            ? { role: full.viewerMembership.role, status: full.viewerMembership.status }
            : undefined;
        const isOwner = membership?.role === 'OWNER' && membership.status === 'APPROVED';
        setCanManage(isOwner || user.role === 'ADMIN' || user.role === 'MODERATOR');
      },
    );
  }, [authStatus, clubId]);

  if (authStatus === 'checking' || canManage === null) {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.checkingSignIn')}</p>
      </Container>
    );
  }

  if (!canManage) {
    return (
      <Container>
        <p className="text-stone-700 dark:text-stone-300">{t('notAuthorizedToManage')}</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await authPatch(`/clubs/${clubId}`, {
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        coverImageUrl: formData.get('coverImageUrl') || undefined,
        visibility: formData.get('visibility'),
      });
      navigate({ to: '/clubs/$clubId', params: { clubId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToSave'));
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!window.confirm(t('confirmDeactivate'))) return;
    setDeactivating(true);
    setError(null);
    try {
      await authDelete(`/clubs/${clubId}`);
      navigate({ to: '/clubs' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToDeactivate'));
      setDeactivating(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('manageClub')}</h1>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.name')}>
            <Input name="name" defaultValue={club.name} required placeholder={t('fields.namePlaceholder')} />
          </Field>
          <Field label={t('fields.visibility')}>
            <Select name="visibility" defaultValue={club.visibility}>
              <option value="PUBLIC">{t('fields.visibilityPublic')}</option>
              <option value="PRIVATE">{t('fields.visibilityPrivate')}</option>
            </Select>
          </Field>
          <Field label={t('fields.description')} hint={t('fields.optional')}>
            <Textarea name="description" rows={4} defaultValue={club.description ?? ''} />
          </Field>
          <Field label={t('fields.coverImageUrl')} hint={t('fields.optional')}>
            <Input name="coverImageUrl" defaultValue={club.coverImageUrl ?? ''} placeholder="https://..." />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? t('actions.creating') : t('actions.saveChanges')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-semibold text-stone-900 dark:text-stone-50">{t('dangerZone')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('deactivateHint')}</p>
        <Button variant="danger" size="sm" className="mt-3" onClick={handleDeactivate} disabled={deactivating}>
          {t('deactivateClub')}
        </Button>
      </Card>
    </Container>
  );
}
