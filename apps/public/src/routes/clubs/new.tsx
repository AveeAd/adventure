import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authPost } from '../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { Field, Input, Select, Textarea } from '../../components/FormField';

export const Route = createFileRoute('/clubs/new')({
  component: NewClubPage,
  head: () => ({
    meta: [{ title: 'Start a club' }],
  }),
});

function NewClubPage() {
  const authStatus = useRequireAuth('/clubs/new');
  const navigate = useNavigate();
  const { t } = useTranslation(['clubs', 'common']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container size="wide">
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.checkingSignIn')}</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const club = await authPost<{ id: string }>('/clubs', {
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        visibility: formData.get('visibility'),
      });
      navigate({ to: '/clubs/$clubId', params: { clubId: club.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCreate'));
      setSubmitting(false);
    }
  }

  return (
    <Container size="wide">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('newTitle')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('newSubheading')}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.name')}>
            <Input name="name" required placeholder={t('fields.namePlaceholder')} />
          </Field>
          <Field label={t('fields.visibility')}>
            <Select name="visibility" defaultValue="PUBLIC">
              <option value="PUBLIC">{t('fields.visibilityPublic')}</option>
              <option value="PRIVATE">{t('fields.visibilityPrivate')}</option>
            </Select>
          </Field>
          <Field label={t('fields.description')} hint={t('fields.optional')}>
            <Textarea name="description" rows={4} />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('actions.creating') : t('actions.startClubButton')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
