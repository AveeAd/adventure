import { createFileRoute, notFound } from '@tanstack/react-router';
import { apiUrl } from '../../../lib/auth/api';

interface AdventurePageDetail {
  id: string;
  title: string;
  summary: string | null;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  maxAltitudeMeters: number | null;
  verificationStatus: string;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  currentRevision: { content: string; createdAt: string } | null;
  contributorIds: string[];
  likeCount: number;
}

interface TripReportSummary {
  id: string;
  title: string | null;
  dateCompleted: string;
  durationDays: number | null;
}

export const Route = createFileRoute('/adventures/$slug/')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: AdventurePageDetail = await pageRes.json();

    const tripReportsRes = await fetch(apiUrl(`/adventure-pages/${page.id}/trip-reports?pageSize=10`));
    const tripReportsBody: { data: TripReportSummary[] } = tripReportsRes.ok
      ? await tripReportsRes.json()
      : { data: [] };

    return { page, tripReports: tripReportsBody.data };
  },
  component: AdventurePageView,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: loaderData.page.title }, { name: 'description', content: loaderData.page.summary ?? '' }]
      : [],
  }),
});

function AdventurePageView() {
  const { page, tripReports } = Route.useLoaderData();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      <h1>{page.title}</h1>
      {page.summary && <p>{page.summary}</p>}

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem', color: '#444' }}>
        {page.activityType && (
          <>
            <dt>Activity</dt>
            <dd>{page.activityType.name}</dd>
          </>
        )}
        {page.difficultyLevel && (
          <>
            <dt>Difficulty</dt>
            <dd>{page.difficultyLevel.name}</dd>
          </>
        )}
        {(page.durationMinDays || page.durationMaxDays) && (
          <>
            <dt>Duration</dt>
            <dd>
              {page.durationMinDays}-{page.durationMaxDays} days
            </dd>
          </>
        )}
        {page.maxAltitudeMeters && (
          <>
            <dt>Max altitude</dt>
            <dd>{page.maxAltitudeMeters}m</dd>
          </>
        )}
        {page.districts.length > 0 && (
          <>
            <dt>Districts</dt>
            <dd>{page.districts.map((d) => d.district.name).join(', ')}</dd>
          </>
        )}
        {page.seasons.length > 0 && (
          <>
            <dt>Best seasons</dt>
            <dd>{page.seasons.map((s) => s.season.name).join(', ')}</dd>
          </>
        )}
        <dt>Verification</dt>
        <dd>{page.verificationStatus}</dd>
        <dt>Likes</dt>
        <dd>{page.likeCount}</dd>
        <dt>Contributors</dt>
        <dd>{page.contributorIds.length}</dd>
      </dl>

      {page.currentRevision && (
        <article style={{ whiteSpace: 'pre-wrap', marginTop: '1.5rem' }}>{page.currentRevision.content}</article>
      )}

      <section style={{ marginTop: '2rem' }}>
        <h2>Trip reports</h2>
        {tripReports.length === 0 ? (
          <p>No trip reports logged yet.</p>
        ) : (
          <ul>
            {tripReports.map((report) => (
              <li key={report.id}>
                {report.title ?? 'Trip report'} — {new Date(report.dateCompleted).toLocaleDateString()}
                {report.durationDays ? ` (${report.durationDays} days)` : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
