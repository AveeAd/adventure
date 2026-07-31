import { Link, createFileRoute } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import { formatNumber, formatRateUnit } from '../../lib/format';
import { Badge, StatusBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/FormField';

interface GuideSummary {
  id: string;
  bio: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: string | null;
  currency: string;
  verificationStatus: string;
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string } }[];
  languages: { language: { name: string } }[];
}

interface MasterDataOption {
  id: string;
  name: string;
}

interface GuideFilters {
  activityTypeId?: string;
  districtId?: string;
  languageId?: string;
}

async function fetchOptions(path: string): Promise<MasterDataOption[]> {
  const res = await fetch(apiUrl(`${path}?pageSize=200`));
  if (!res.ok) return [];
  const body: { data: MasterDataOption[] } = await res.json();
  return body.data;
}

export const Route = createFileRoute('/guides/')({
  validateSearch: (search: Record<string, unknown>): GuideFilters => ({
    activityTypeId: typeof search.activityTypeId === 'string' ? search.activityTypeId : undefined,
    districtId: typeof search.districtId === 'string' ? search.districtId : undefined,
    languageId: typeof search.languageId === 'string' ? search.languageId : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const params = new URLSearchParams({ pageSize: '50' });
    if (deps.activityTypeId) params.set('activityTypeId', deps.activityTypeId);
    if (deps.districtId) params.set('districtId', deps.districtId);
    if (deps.languageId) params.set('languageId', deps.languageId);

    const [guidesRes, activityTypes, districts, languages] = await Promise.all([
      fetch(apiUrl(`/guide-profiles?${params}`)),
      fetchOptions('/activity-types'),
      fetchOptions('/districts'),
      fetchOptions('/languages'),
    ]);
    const guidesBody: { data: GuideSummary[] } = guidesRes.ok ? await guidesRes.json() : { data: [] };
    return { guides: guidesBody.data, activityTypes, districts, languages };
  },
  component: GuideDirectoryPage,
  head: () => ({ meta: [{ title: 'Guide directory' }] }),
});

function GuideDirectoryPage() {
  const { guides, activityTypes, districts, languages } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t } = useTranslation('guides');

  function updateFilter(key: keyof GuideFilters, value: string) {
    navigate({ search: { ...search, [key]: value || undefined } });
  }

  return (
    <Container>
      <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400">
        <Compass className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wide">{t('directoryTitle')}</span>
      </div>
      <h1 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {t('directoryHeading')}
      </h1>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={search.activityTypeId ?? ''} onChange={(e) => updateFilter('activityTypeId', e.target.value)}>
          <option value="">{t('allSpecialties')}</option>
          {activityTypes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
        <Select value={search.districtId ?? ''} onChange={(e) => updateFilter('districtId', e.target.value)}>
          <option value="">{t('allRegions')}</option>
          {districts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
        <Select value={search.languageId ?? ''} onChange={(e) => updateFilter('languageId', e.target.value)}>
          <option value="">{t('allLanguages')}</option>
          {languages.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>

      {guides.length === 0 ? (
        <div className="mt-6">
          <EmptyState>{t('noGuidesMatchFilters')}</EmptyState>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {guides.map((guide) => (
            <Link key={guide.id} to="/guides/$id" params={{ id: guide.id }}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-stone-900 dark:text-stone-50">
                    {guide.specialties.map((s) => s.activityType.name).join(', ') || t('guideFallbackName')}
                  </h2>
                  <StatusBadge status={guide.verificationStatus} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {guide.regions.map((r) => (
                    <Badge key={r.district.name} tone="neutral">
                      {r.district.name}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                  {guide.languages.map((l) => l.language.name).join(', ')}
                </p>
                {(guide.rateMin || guide.rateMax) && (
                  <p className="mt-1 text-sm font-medium text-stone-700 dark:text-stone-300">
                    {t('rateRange', {
                      currency: guide.currency,
                      min: formatNumber(guide.rateMin ?? 0),
                      max: formatNumber(guide.rateMax ?? 0),
                      rateUnit: formatRateUnit(t, guide.rateUnit),
                    })}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
