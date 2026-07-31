import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
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
  currency: string;
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
  head: () => ({ meta: [{ title: i18n.t('account:guideProfile.pageTitle') }] }),
});

function GuideProfileAccountPage() {
  const { activityTypes, districts, languages } = Route.useLoaderData();
  const authStatus = useRequireAuth('/account/guide-profile');
  const { t } = useTranslation(['account', 'common']);
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
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
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
      currency: formData.get('currency') || undefined,
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
      setError(err instanceof Error ? err.message : t('guideProfile.errors.failedToSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {existing ? t('guideProfile.editHeading') : t('guideProfile.createHeading')}
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('guideProfile.restrictedNotice')}</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t('guideProfile.fields.licenseNumber')}>
            <Input name="licenseNumber" defaultValue={existing?.licenseNumber ?? ''} />
          </Field>
          <Field label={t('guideProfile.fields.bio')}>
            <Textarea name="bio" rows={4} defaultValue={existing?.bio ?? ''} />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label={t('guideProfile.fields.rateMin')}>
              <Input name="rateMin" type="number" min={0} defaultValue={existing?.rateMin ?? ''} />
            </Field>
            <Field label={t('guideProfile.fields.rateMax')}>
              <Input name="rateMax" type="number" min={0} defaultValue={existing?.rateMax ?? ''} />
            </Field>
            <Field label={t('guideProfile.fields.currency')}>
              <Select name="currency" defaultValue={existing?.currency ?? 'NPR'}>
                <option value="NPR">NPR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </Select>
            </Field>
            <Field label={t('guideProfile.fields.rateUnit')}>
              <Select name="rateUnit" defaultValue={existing?.rateUnit ?? ''}>
                <option value="">{t('guideProfile.fields.unspecified')}</option>
                <option value="PER_DAY">{t('guideProfile.fields.perDay')}</option>
                <option value="PER_TRIP">{t('guideProfile.fields.perTrip')}</option>
                <option value="PER_HOUR">{t('guideProfile.fields.perHour')}</option>
              </Select>
            </Field>
          </div>
          <Field label={t('guideProfile.fields.specialties')}>
            <MultiSelectChips
              name="specialtyActivityTypeIds"
              options={activityTypes}
              defaultValue={existing?.specialties.map((s) => s.activityType.id) ?? []}
            />
          </Field>
          <Field label={t('guideProfile.fields.regionsCovered')}>
            <MultiSelectChips
              name="regionDistrictIds"
              options={districts}
              defaultValue={existing?.regions.map((r) => r.district.id) ?? []}
            />
          </Field>
          <Field label={t('guideProfile.fields.languages')}>
            <MultiSelectChips
              name="languageIds"
              options={languages}
              defaultValue={existing?.languages.map((l) => l.language.id) ?? []}
            />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-primary-700 dark:text-primary-400">{t('guideProfile.saved')}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('guideProfile.saving') : existing ? t('guideProfile.saveChanges') : t('guideProfile.createProfile')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
