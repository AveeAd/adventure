import { createFileRoute } from '@tanstack/react-router';
import { apiUrl } from '../lib/auth/api';
import { SITE_URL } from '../lib/seo';

// Large enough to cover the whole table in one request for a first pass -
// no cache layer either (see SEO_PLAN.md's Phase 5 design choice); revisit
// both once entity counts justify it.
const SITEMAP_PAGE_SIZE = 5000;

interface UrlEntry {
  path: string;
  lastmod?: string;
}

async function fetchAll<T>(path: string): Promise<T[]> {
  const res = await fetch(apiUrl(`${path}${path.includes('?') ? '&' : '?'}pageSize=${SITEMAP_PAGE_SIZE}`));
  if (!res.ok) return [];
  const body: { data: T[] } = await res.json();
  return body.data;
}

async function buildUrlEntries(): Promise<UrlEntry[]> {
  const [pages, guides, clubs] = await Promise.all([
    fetchAll<{ slug: string; updatedAt: string }>('/adventure-pages'),
    // GET /guide-profiles already scopes to isListed:true - see MILESTONE_3.md §2.2.
    fetchAll<{ id: string; updatedAt: string }>('/guide-profiles'),
    // GET /clubs already scopes to visibility:PUBLIC and isActive:true.
    fetchAll<{ id: string; updatedAt: string }>('/clubs'),
  ]);

  return [
    { path: '/' },
    { path: '/guides' },
    { path: '/clubs' },
    { path: '/trip-groups' },
    ...pages.map((page) => ({ path: `/adventures/${page.slug}`, lastmod: page.updatedAt })),
    ...guides.map((guide) => ({ path: `/guides/${guide.id}`, lastmod: guide.updatedAt })),
    ...clubs.map((club) => ({ path: `/clubs/${club.id}`, lastmod: club.updatedAt })),
  ];
}

function toXml(entries: UrlEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : '';
      return `<url><loc>${SITE_URL}${entry.path}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries = await buildUrlEntries();
        return new Response(toXml(entries), {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
