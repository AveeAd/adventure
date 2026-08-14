import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
import { authPost, authUpload } from '../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { buildMeta } from '../../lib/seo';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { Field, Input, Select, Textarea } from '../../components/FormField';
import { MultiSelectChips, selectedChipValues } from '../../components/MultiSelectChips';
import { LazyDrawMap } from '../../components/LazyDrawMap';
import type { LngLat } from '../../components/DrawMap';

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
  spotTypes: MasterDataOption[];
}

interface PendingSpot {
  id: string;
  spotTypeId: string;
  spotTypeName: string;
  name: string;
  description: string;
  elevationMeters: string;
  point: LngLat;
}

async function fetchOptions(path: string): Promise<MasterDataOption[]> {
  const res = await fetch(apiUrl(`${path}?pageSize=200`));
  if (!res.ok) return [];
  const body: { data: MasterDataOption[] } = await res.json();
  return body.data;
}

export const Route = createFileRoute('/adventures/new')({
  loader: async (): Promise<FormData> => {
    const [activityTypes, difficultyLevels, seasons, districts, tags, spotTypes] = await Promise.all([
      fetchOptions('/activity-types'),
      fetchOptions('/difficulty-levels'),
      fetchOptions('/seasons'),
      fetchOptions('/districts'),
      fetchOptions('/tags'),
      fetchOptions('/spot-types'),
    ]);
    return { activityTypes, difficultyLevels, seasons, districts, tags, spotTypes };
  },
  component: NewAdventurePage,
  head: () =>
    buildMeta({
      title: i18n.t('adventurePage:createTitle'),
      description: i18n.t('adventurePage:createSubheading'),
      path: '/adventures/new',
      noindex: true,
    }),
});

function NewAdventurePage() {
  const { activityTypes, difficultyLevels, seasons, districts, tags, spotTypes } = Route.useLoaderData();
  const authStatus = useRequireAuth('/adventures/new');
  const navigate = useNavigate();
  const { t } = useTranslation(['adventurePage', 'common']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Trail (optional, at most one - matches the standalone /trails/new form)
  const [trailMode, setTrailMode] = useState<'draw' | 'gpx'>('draw');
  const [trailPoints, setTrailPoints] = useState<LngLat[]>([]);
  const [trailGpxFile, setTrailGpxFile] = useState<File | null>(null);

  // Spots (optional, repeatable) - a small draft form builds a list that's
  // submitted together with the page, rather than one point per submission.
  const [pendingSpots, setPendingSpots] = useState<PendingSpot[]>([]);
  const [spotDraftPoint, setSpotDraftPoint] = useState<LngLat[]>([]);
  const [spotDraftName, setSpotDraftName] = useState('');
  const [spotDraftTypeId, setSpotDraftTypeId] = useState('');
  const [spotDraftDescription, setSpotDraftDescription] = useState('');
  const [spotDraftElevation, setSpotDraftElevation] = useState('');
  const [spotDraftError, setSpotDraftError] = useState<string | null>(null);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.checkingSignIn')}</p>
      </Container>
    );
  }

  function addSpotToList() {
    setSpotDraftError(null);
    if (spotDraftPoint.length === 0) {
      setSpotDraftError(t('errors.needSpotPoint'));
      return;
    }
    if (!spotDraftName.trim() || !spotDraftTypeId) {
      setSpotDraftError(t('errors.failedToAddSpot'));
      return;
    }
    const spotTypeName = spotTypes.find((s) => s.id === spotDraftTypeId)?.name ?? '';
    setPendingSpots((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        spotTypeId: spotDraftTypeId,
        spotTypeName,
        name: spotDraftName.trim(),
        description: spotDraftDescription.trim(),
        elevationMeters: spotDraftElevation,
        point: spotDraftPoint[0],
      },
    ]);
    setSpotDraftPoint([]);
    setSpotDraftName('');
    setSpotDraftTypeId('');
    setSpotDraftDescription('');
    setSpotDraftElevation('');
  }

  function removeSpot(id: string) {
    setPendingSpots((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (trailMode === 'draw' && trailPoints.length === 1) {
      setError(t('errors.needTwoPoints'));
      return;
    }

    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const trailPayload =
      trailMode === 'draw' && trailPoints.length >= 2
        ? {
            name: (formData.get('trailName') as string) || undefined,
            geometry: { type: 'LineString' as const, coordinates: trailPoints },
          }
        : undefined;

    const spotsPayload = pendingSpots.length
      ? pendingSpots.map((s) => ({
          spotTypeId: s.spotTypeId,
          name: s.name,
          description: s.description || undefined,
          elevationMeters: s.elevationMeters ? Number(s.elevationMeters) : undefined,
          geometry: { type: 'Point' as const, coordinates: s.point },
        }))
      : undefined;

    try {
      const page = await authPost<{ id: string; slug: string }>('/adventure-pages', {
        title: formData.get('title'),
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
        trail: trailPayload,
        spots: spotsPayload,
      });

      // GPX import is a separate multipart request - it can't join the
      // atomic page/trail/spots transaction above (see CreateAdventurePageDto).
      // The page (and any drawn trail/spots) already exist at this point
      // regardless of whether this succeeds, so a failure here surfaces as a
      // notice rather than blocking navigation.
      if (trailMode === 'gpx' && trailGpxFile) {
        const uploadData = new FormData();
        uploadData.set('file', trailGpxFile);
        const trailName = formData.get('trailName');
        if (trailName) uploadData.set('name', trailName as string);
        try {
          await authUpload(`/adventure-pages/${page.id}/trails/import-gpx`, uploadData);
        } catch {
          navigate({ to: '/adventures/$slug', params: { slug: page.slug } });
          return;
        }
      }

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

          <div className="border-t border-stone-200 pt-5 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('trailSectionHeading')}</h2>

            <div className="mt-3 inline-flex rounded-lg border border-stone-200 p-1 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setTrailMode('draw')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${trailMode === 'draw' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
              >
                {t('actions.drawOnMap')}
              </button>
              <button
                type="button"
                onClick={() => setTrailMode('gpx')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${trailMode === 'gpx' ? 'bg-primary-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
              >
                {t('actions.uploadGpx')}
              </button>
            </div>

            {trailMode === 'draw' ? (
              <>
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('draw.instructions')}</p>
                <div className="mt-4">
                  <LazyDrawMap mode="line" points={trailPoints} onPointsChange={setTrailPoints} height={320} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
                  <span>{t('draw.pointsPlaced', { count: trailPoints.length })}</span>
                  <button
                    type="button"
                    onClick={() => setTrailPoints((p) => p.slice(0, -1))}
                    disabled={trailPoints.length === 0}
                    className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
                  >
                    {t('actions.undoLastPoint')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrailPoints([])}
                    disabled={trailPoints.length === 0}
                    className="text-primary-700 hover:underline disabled:text-stone-400 disabled:no-underline dark:text-primary-400"
                  >
                    {t('actions.clear')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('gpx.instructions')}</p>
                <div className="mt-4">
                  <input
                    type="file"
                    accept=".gpx,application/gpx+xml"
                    onChange={(e) => setTrailGpxFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-stone-600 dark:text-stone-300"
                  />
                </div>
              </>
            )}

            <div className="mt-4 max-w-xs">
              <Field label={t('fields.name')} hint={t('fields.optional')}>
                <Input name="trailName" />
              </Field>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-5 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('spotsSectionHeading')}</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('draw.spotInstructions')}</p>

            <div className="mt-4">
              <LazyDrawMap mode="point" points={spotDraftPoint} onPointsChange={setSpotDraftPoint} height={320} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('fields.name')}>
                <Input value={spotDraftName} onChange={(e) => setSpotDraftName(e.target.value)} />
              </Field>
              <Field label={t('fields.type')}>
                <Select value={spotDraftTypeId} onChange={(e) => setSpotDraftTypeId(e.target.value)}>
                  <option value="">{t('fields.select')}</option>
                  {spotTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('fields.description')}>
                <Textarea rows={2} value={spotDraftDescription} onChange={(e) => setSpotDraftDescription(e.target.value)} />
              </Field>
              <Field label={t('fields.elevation')}>
                <Input
                  type="number"
                  min={0}
                  value={spotDraftElevation}
                  onChange={(e) => setSpotDraftElevation(e.target.value)}
                />
              </Field>
            </div>

            {spotDraftError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{spotDraftError}</p>}

            <Button type="button" variant="secondary" onClick={addSpotToList} className="mt-3">
              {t('addSpotToList')}
            </Button>

            {pendingSpots.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {t('spotsPendingCount', { count: pendingSpots.length })}
                </p>
                {pendingSpots.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-800"
                  >
                    <span className="text-stone-700 dark:text-stone-200">
                      {spot.name} <span className="text-stone-400 dark:text-stone-500">· {spot.spotTypeName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpot(spot.id)}
                      className="text-red-600 hover:underline dark:text-red-400"
                    >
                      {t('removeSpot')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t('actions.creating') : t('actions.createPage')}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
