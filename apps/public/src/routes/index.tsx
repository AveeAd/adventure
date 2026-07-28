import { Link, createFileRoute } from '@tanstack/react-router';
import { apiUrl } from '../lib/auth/api';

interface AdventurePageSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  maxAltitudeMeters: number | null;
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const res = await fetch(apiUrl('/adventure-pages?pageSize=50'));
    if (!res.ok) {
      throw new Error('Failed to load adventure pages');
    }
    const body: { data: AdventurePageSummary[] } = await res.json();
    return { pages: body.data };
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const { pages } = Route.useLoaderData();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      <h1>Discover</h1>
      {pages.length === 0 ? (
        <p>No adventure pages yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {pages.map((page) => (
            <li key={page.id} style={{ marginBottom: '1.5rem' }}>
              <Link to="/adventures/$slug" params={{ slug: page.slug }}>
                <h2 style={{ margin: 0 }}>{page.title}</h2>
              </Link>
              {page.summary && <p style={{ margin: '0.25rem 0' }}>{page.summary}</p>}
              {(page.durationMinDays || page.maxAltitudeMeters) && (
                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                  {page.durationMinDays && page.durationMaxDays
                    ? `${page.durationMinDays}-${page.durationMaxDays} days`
                    : null}
                  {page.maxAltitudeMeters ? ` · up to ${page.maxAltitudeMeters}m` : null}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
