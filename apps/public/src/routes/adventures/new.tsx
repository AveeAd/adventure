import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../lib/auth/api';
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
  head: () => ({ meta: [{ title: 'Create an adventure page' }] }),
});

function NewAdventurePage() {
  const { activityTypes, difficultyLevels, seasons, districts, tags } = Route.useLoaderData();
  const authStatus = useRequireAuth('/adventures/new');
  const navigate = useNavigate();
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
      setError(err instanceof Error ? err.message : 'Failed to create page');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Create an adventure page</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Publishing creates the page and its first revision together.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Title">
            <Input name="title" required />
          </Field>
          <Field label="Slug" hint="Used in the page URL, e.g. annapurna-base-camp">
            <Input name="slug" required pattern="[a-z0-9-]+" />
          </Field>
          <Field label="Summary">
            <Textarea name="summary" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Activity type">
              <Select name="activityTypeId" required defaultValue="">
                <option value="" disabled>
                  Select...
                </option>
                {activityTypes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Difficulty level">
              <Select name="difficultyLevelId" defaultValue="">
                <option value="">Unspecified</option>
                {difficultyLevels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Min days">
              <Input name="durationMinDays" type="number" min={0} />
            </Field>
            <Field label="Max days">
              <Input name="durationMaxDays" type="number" min={0} />
            </Field>
            <Field label="Max altitude (m)">
              <Input name="maxAltitudeMeters" type="number" min={0} />
            </Field>
          </div>
          <Field label="Districts">
            <MultiSelectChips name="districtIds" options={districts} />
          </Field>
          <Field label="Best seasons">
            <MultiSelectChips name="seasonIds" options={seasons} />
          </Field>
          <Field label="Tags">
            <MultiSelectChips name="tagIds" options={tags} />
          </Field>
          <Field label="Content (Markdown)">
            <Textarea name="content" required rows={12} className="font-mono text-sm" />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Creating...' : 'Create page'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
