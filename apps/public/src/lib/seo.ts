// Vite exposes `.env` / shell env vars prefixed `VITE_` automatically; the
// dev fallback mirrors apps/public/src/lib/auth/api.ts's CLIENT_API_URL
// fallback for VITE_API_URL, matching docker-compose.yml's public port.
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3001';

// Mirrors @tanstack/router-core's own LdJsonValue type, but with `undefined`
// folded into the union (rather than only on object properties) so a plain
// `field: maybeString ?? undefined` value-type-checks without needing exact
// optional property types.
type LdJsonValue = string | number | boolean | null | undefined | LdJsonValue[] | { [key: string]: LdJsonValue };
type LdJsonObject = Record<string, LdJsonValue>;

export interface BuildMetaOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
  siteName?: string;
  noindex?: boolean;
  // Rendered via TanStack Router's native `'script:ld+json'` meta entry
  // (confirmed present in the installed @tanstack/router-core - it escapes
  // and serializes straight to a <script type="application/ld+json">
  // tag), rather than a separate body-rendered component.
  jsonLd?: LdJsonObject | LdJsonObject[];
}

export function buildMeta({
  title,
  description,
  path,
  image,
  type = 'website',
  siteName,
  noindex = false,
  jsonLd,
}: BuildMetaOptions) {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? `${SITE_URL}/og-default.png`;

  const meta: Array<Record<string, unknown>> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: url },
    { property: 'og:image', content: ogImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: ogImage },
  ];

  if (siteName) meta.push({ property: 'og:site_name', content: siteName });
  if (noindex) meta.push({ name: 'robots', content: 'noindex, follow' });
  if (jsonLd) {
    for (const entry of Array.isArray(jsonLd) ? jsonLd : [jsonLd]) {
      meta.push({ 'script:ld+json': entry });
    }
  }

  const links = [{ rel: 'canonical', href: url }];

  return { meta, links };
}
