import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
import { authPost } from '../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { Field, Input, Select, Textarea } from '../../components/FormField';
import { MultiSelectChips, selectedChipValues } from '../../components/MultiSelectChips';

interface MasterDataOption {
  id: string;
  name: string;
}

interface FormData {
  activityTypes: MasterDataOption[];
  difficultyLevels: MasterDataOption[];
  seasons: MasterDataOption[];
  districts: MasterDataOption[];
  tags: MasterDataOption[];
}

async function fetchOptions(path: string): Promise<MasterDataOption[]> {
  const res = await fetch(apiUrl(`${path}?pageSize=200`));
  if (!res.ok) return [];
  const body: { data: MasterDataOption[] } = await res.json();
  return body.data;
}

export const Route = createFileRoute('/adventures/new')({
  loader: async (): Promise<FormData> => {
    const [activityTypes, difficultyLevels, seasons, districts, tags] = await Promise.all([
      fetchOptions('/activity-types'),
      fetchOptions('/difficulty-levels'),
      fetchOptions('/seasons'),
      fetchOptions('/districts'),
      fetchOptions('/tags'),
    ]);
    return { activityTypes, difficultyLevels, seasons, districts, tags };
  },
  component: NewAdventurePage,
  head: () => ({ meta: [{ title: i18n.t('adventurePage:createTitle') }] }),
});

function NewAdventurePage() {
  const { activityTypes, difficultyLevels, seasons, districts, tags } = Route.useLoaderData();
  const authStatus = useRequireAuth('/adventures/new');
  const navigate = useNavigate();
  const { t } = useTranslation(['adventurePage', 'common']);
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
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const page = await authPost<{ slug: string }>('/adventure-pages', {
        title: formData.get('title'),
        slug: formData.get('slug'),
        summary: formData.get('summary') || undefined,
        activityTypeId: formData.get('activityTypeId'),
        difficultyLevelId: formData.get('difficultyLevelId') || undefined,
        durationMinDays: formData.get('durationMinDays') ? Number(formData.get('durationMinDays')) : undefined,
        durationMaxDays: formData.get('durationMaxDays') ? Number(formData.get('durationMaxDays')) : undefined,
        maxAltitudeMeters: formData.get('maxAltitudeMeters')
          ? Number(formData.get('maxAltitudeMeters'))
          : undefined,
        districtIds: selectedChipValues(form, 'districtIds'),
        seasonIds: selectedChipValues(form, 'seasonIds'),
        tagIds: selectedChipValues(form, 'tagIds'),
        content: formData.get('content'),
      });
      navigate({ to: '/adventures/$slug', params: { slug: page.slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCreatePage'));
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('createTitle')}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('createSubheading')}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.title')}>
            <Input name="title" required />
          </Field>
          <Field label={t('fields.slug')} hint={t('fields.slugHint')}>
            <Input name="slug" required pattern="[a-z0-9-]+" />
          </Field>
          <Field label={t('fields.summary')}>
            <Textarea name="summary" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('fields.activityType')}>
              <Select name="activityTypeId" required defaultValue="">
                <option value="" disabled>
                  {t('fields.select')}
                </option>
                {activityTypes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('fields.difficultyLevel')}>
              <Select name="difficultyLevelId" defaultValue="">
                <option value="">{t('fields.unspecified')}</option>
                {difficultyLevels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label={t('fields.minDays')}>
              <Input name="durationMinDays" type="number" min={0} />
            </Field>
            <Field label={t('fields.maxDays')}>
              <Input name="durationMaxDays" type="number" min={0} />
            </Field>
            <Field label={t('fields.maxAltitude')}>
              <Input name="maxAltitudeMeters" type="number" min={0} />
            </Field>
          </div>
          <Field label={t('fields.districts')}>
            <MultiSelectChips name="districtIds" options={districts} />
          </Field>
          <Field label={t('fields.bestSeasons')}>
            <MultiSelectChips name="seasonIds" options={seasons} />
          </Field>
          <Field label={t('fields.tags')}>
            <MultiSelectChips name="tagIds" options={tags} />
          </Field>
          <Field label={t('fields.content')}>
            <Textarea name="content" required rows={12} className="font-mono text-sm" />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('actions.creating') : t('actions.createPage')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
