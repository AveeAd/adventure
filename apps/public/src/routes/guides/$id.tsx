import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Globe, MapPin, Wallet } from 'lucide-react';
import { apiUrl } from '../../lib/auth/api';
import { formatRateUnit } from '../../lib/format';
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
  verificationStatus: string;
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
  head: () => ({ meta: [{ title: 'Guide profile' }] }),
});

function GuideProfilePage() {
  const { guide } = Route.useLoaderData();

  return (
    <Container>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {guide.specialties.map((s) => s.activityType.name).join(', ') || 'Guide'}
        </h1>
        <StatusBadge status={guide.verificationStatus} />
      </div>

      {guide.bio && <p className="mt-3 text-stone-700 dark:text-stone-300">{guide.bio}</p>}

      <Card className="mt-6 flex flex-col gap-4 p-5">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Regions</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {guide.regions.length > 0 ? (
                guide.regions.map((r) => (
                  <Badge key={r.district.name} tone="neutral">
                    {r.district.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-stone-500 dark:text-stone-400">Not specified</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Languages</div>
            <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
              {guide.languages.map((l) => l.language.name).join(', ') || 'Not specified'}
            </div>
          </div>
        </div>
        {(guide.rateMin || guide.rateMax) && (
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-4 w-4 text-primary-600 dark:text-primary-400" />
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400">Rate</div>
              <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
                NPR {guide.rateMin}-{guide.rateMax} {formatRateUnit(guide.rateUnit)}
              </div>
            </div>
          </div>
        )}
      </Card>

      <p className="mt-5">
        <Link to="/users/$id" params={{ id: guide.userId }} className="text-primary-700 hover:underline dark:text-primary-400">
          View contributor profile
        </Link>
      </p>
    </Container>
  );
}
