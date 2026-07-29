import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/auth/api';
import { authFetch, authPatch, authPost } from '../../lib/auth/auth-fetch';
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

interface OwnGuideProfile {
  id: string;
  bio: string | null;
  licenseNumber: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: 'PER_DAY' | 'PER_TRIP' | 'PER_HOUR' | null;
  specialties: { activityType: MasterDataOption }[];
  regions: { district: MasterDataOption }[];
  languages: { language: MasterDataOption }[];
}

async function fetchOptions(path: string): Promise<MasterDataOption[]> {
  const res = await fetch(apiUrl(`${path}?pageSize=200`));
  if (!res.ok) return [];
  const body: { data: MasterDataOption[] } = await res.json();
  return body.data;
}

export const Route = createFileRoute('/account/guide-profile')({
  loader: async () => {
    const [activityTypes, districts, languages] = await Promise.all([
      fetchOptions('/activity-types'),
      fetchOptions('/districts'),
      fetchOptions('/languages'),
    ]);
    return { activityTypes, districts, languages };
  },
  component: GuideProfileAccountPage,
  head: () => ({ meta: [{ title: 'Your guide profile' }] }),
});

function GuideProfileAccountPage() {
  const { activityTypes, districts, languages } = Route.useLoaderData();
  const authStatus = useRequireAuth('/account/guide-profile');
  const [existing, setExisting] = useState<OwnGuideProfile | null | 'loading'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    authFetch('/guide-profiles/me').then(async (res) => {
      setExisting(res.ok ? await res.json() : null);
    });
  }, [authStatus]);

  if (authStatus === 'checking' || existing === 'loading') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Loading...</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const body = {
      licenseNumber: formData.get('licenseNumber') || undefined,
      bio: formData.get('bio') || undefined,
      rateMin: formData.get('rateMin') ? Number(formData.get('rateMin')) : undefined,
      rateMax: formData.get('rateMax') ? Number(formData.get('rateMax')) : undefined,
      rateUnit: formData.get('rateUnit') || undefined,
      specialtyActivityTypeIds: selectedChipValues(form, 'specialtyActivityTypeIds'),
      regionDistrictIds: selectedChipValues(form, 'regionDistrictIds'),
      languageIds: selectedChipValues(form, 'languageIds'),
    };

    try {
      if (existing && existing !== 'loading') {
        await authPatch(`/guide-profiles/${existing.id}`, body);
      } else {
        await authPost('/guide-profiles', body);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guide profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {existing ? 'Edit your guide profile' : 'Create your guide profile'}
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Guides covering restricted districts (Annapurna/Manaslu/Upper Mustang) require manual license review before
        verification.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="License number">
            <Input name="licenseNumber" defaultValue={existing?.licenseNumber ?? ''} />
          </Field>
          <Field label="Bio">
            <Textarea name="bio" rows={4} defaultValue={existing?.bio ?? ''} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Rate min (NPR)">
              <Input name="rateMin" type="number" min={0} defaultValue={existing?.rateMin ?? ''} />
            </Field>
            <Field label="Rate max (NPR)">
              <Input name="rateMax" type="number" min={0} defaultValue={existing?.rateMax ?? ''} />
            </Field>
            <Field label="Rate unit">
              <Select name="rateUnit" defaultValue={existing?.rateUnit ?? ''}>
                <option value="">Unspecified</option>
                <option value="PER_DAY">Per day</option>
                <option value="PER_TRIP">Per trip</option>
                <option value="PER_HOUR">Per hour</option>
              </Select>
            </Field>
          </div>
          <Field label="Specialties">
            <MultiSelectChips
              name="specialtyActivityTypeIds"
              options={activityTypes}
              defaultValue={existing?.specialties.map((s) => s.activityType.id) ?? []}
            />
          </Field>
          <Field label="Regions covered">
            <MultiSelectChips
              name="regionDistrictIds"
              options={districts}
              defaultValue={existing?.regions.map((r) => r.district.id) ?? []}
            />
          </Field>
          <Field label="Languages">
            <MultiSelectChips
              name="languageIds"
              options={languages}
              defaultValue={existing?.languages.map((l) => l.language.id) ?? []}
            />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-primary-700 dark:text-primary-400">Saved.</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Saving...' : existing ? 'Save changes' : 'Create profile'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
