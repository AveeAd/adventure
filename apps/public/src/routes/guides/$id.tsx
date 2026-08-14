import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Globe, MapPin, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
import { formatNumber, formatRateUnit } from '../../lib/format';
import { buildMeta } from '../../lib/seo';
import { Badge, StatusBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';

interface GuideProfileDetail {
  id: string;
  userId: string;
  bio: string | null;
  licenseNumber: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: string | null;
  currency: string;
  verificationStatus: string;
  isListed: boolean;
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string } }[];
  languages: { language: { name: string } }[];
}

export const Route = createFileRoute('/guides/$id')({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/guide-profiles/${params.id}`));
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to load guide profile');
    }
    const guide: GuideProfileDetail = await res.json();
    return { guide };
  },
  component: GuideProfilePage,
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return buildMeta({ title: i18n.t('guides:pageTitle'), description: i18n.t('common:tagline'), path: `/guides/${params.id}` });
    }
    const { guide } = loaderData;
    const name = guide.specialties.map((s) => s.activityType.name).join(', ') || i18n.t('guides:guideFallbackName');
    const description = guide.bio ?? i18n.t('guides:directorySubheading');
    return buildMeta({
      title: name,
      description,
      path: `/guides/${params.id}`,
      noindex: !guide.isListed,
      // Person schema for listed guides only - credential trust, not
      // content trust (see CLAUDE.md's guide-verification note).
      jsonLd: guide.isListed
        ? { '@context': 'https://schema.org', '@type': 'Person', name, description, jobTitle: i18n.t('guides:guideFallbackName') }
        : undefined,
    });
  },
});

function GuideProfilePage() {
  const { guide } = Route.useLoaderData();
  const { t } = useTranslation('guides');

  return (
    <Container>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {guide.specialties.map((s) => s.activityType.name).join(', ') || t('guideFallbackName')}
        </h1>
        <StatusBadge status={guide.verificationStatus} />
      </div>

      {guide.bio && <p className="mt-3 text-stone-700 dark:text-stone-300">{guide.bio}</p>}

      <Card className="mt-6 flex flex-col gap-4 p-5">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">{t('regions')}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {guide.regions.length > 0 ? (
                guide.regions.map((r) => (
                  <Badge key={r.district.name} tone="neutral">
                    {r.district.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-stone-500 dark:text-stone-400">{t('notSpecified')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">{t('languages')}</div>
            <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
              {guide.languages.map((l) => l.language.name).join(', ') || t('notSpecified')}
            </div>
          </div>
        </div>
        {(guide.rateMin || guide.rateMax) && (
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400">{t('rate')}</div>
              <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
                {t('rateRange', {
                  currency: guide.currency,
                  min: formatNumber(guide.rateMin ?? 0),
                  max: formatNumber(guide.rateMax ?? 0),
                  rateUnit: formatRateUnit(t, guide.rateUnit),
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      <p className="mt-5">
        <Link to="/users/$id" params={{ id: guide.userId }} className="text-primary-700 hover:underline dark:text-primary-400">
          {t('viewContributorProfile')}
        </Link>
      </p>
    </Container>
  );
}
