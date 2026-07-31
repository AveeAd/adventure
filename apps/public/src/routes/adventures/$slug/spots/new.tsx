import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import i18n from '../../../../lib/i18n';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../../lib/auth/require-auth';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Field, Input, Select, Textarea } from '../../../../components/FormField';
import { LazyDrawMap } from '../../../../components/LazyDrawMap';
import type { LngLat } from '../../../../components/DrawMap';

interface SpotTypeOption {
  id: string;
  name: string;
}

export const Route = createFileRoute('/adventures/$slug/spots/new')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();

    const spotTypesRes = await fetch(apiUrl('/spot-types?pageSize=200'));
    const spotTypesBody: { data: SpotTypeOption[] } = spotTypesRes.ok ? await spotTypesRes.json() : { data: [] };

    return { page, spotTypes: spotTypesBody.data };
  },
  component: NewSpotPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: i18n.t('adventurePage:addSpotTitle', { title: loaderData.page.title }) }] : [],
  }),
});

function NewSpotPage() {
  const { page, spotTypes } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const authStatus = useRequireAuth(`/adventures/${slug}/spots/new`);
  const navigate = useNavigate();
  const { t } = useTranslation(['adventurePage', 'common']);
  const [points, setPoints] = useState<LngLat[]>([]);
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
    if (points.length === 0) {
      setError(t('errors.needSpotPoint'));
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await authPost(`/adventure-pages/${page.id}/spots`, {
        spotTypeId: formData.get('spotTypeId'),
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        elevationMeters: formData.get('elevationMeters') ? Number(formData.get('elevationMeters')) : undefined,
        geometry: { type: 'Point', coordinates: points[0] },
      });
      navigate({ to: '/adventures/$slug', params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToAddSpot'));
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {t('addSpotTitle', { title: page.title })}
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('draw.spotInstructions')}</p>

      <div className="mt-6">
        <LazyDrawMap mode="point" points={points} onPointsChange={setPoints} />
      </div>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.name')}>
            <Input name="name" required />
          </Field>
          <Field label={t('fields.type')}>
            <Select name="spotTypeId" required defaultValue="">
              <option value="" disabled>
                {t('fields.select')}
              </option>
              {spotTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('fields.description')}>
            <Textarea name="description" rows={3} />
          </Field>
          <Field label={t('fields.elevation')}>
            <Input name="elevationMeters" type="number" min={0} />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('actions.adding') : t('actions.addSpot')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
